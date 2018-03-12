package u2f

import (
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo"
	"github.com/tstranex/u2f"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"auth/scopes"
	"auth/sessions"
	"config"
	"users"
)

// Registration extends u2f.Registration to include the time created
// and ignore a bunch of fields in json. u2f.Registration also cant
// be put into datastore so this struct has fields that can.
type Registration struct {
	U2fRegistration *u2f.Registration `datastore:"-" json:"-"`

	ID              *datastore.Key `datastore:"-" json:"id"`
	Raw             []byte         `json:"-"`
	KeyHandle       []byte         `json:"-"`
	PubKey          []byte         `json:"-"`
	AttestationCert []byte         `json:"-"`
	CreatedAt       time.Time      `json:"createdAt"`
}

const (
	challengeEntityType    = "u2fChallenge"
	registrationEntityType = "u2fRegistration"
	counterEntityType      = "u2fCounter"
)

func RegisterRequest(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	challenge, err := u2f.NewChallenge(config.ApplicationID, []string{config.ApplicationID})
	if err != nil {
		log.Errorf(ctx, "Unable to create u2f challenge: %v", err)
		return err
	}

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Unable to get userKey when creating u2f challenge")
	}

	err = saveChallenge(ctx, challenge, userKey)
	if err != nil {
		return err
	}

	// registrations is a list of the users existing registrations
	registrations, err := fetchRegistrations(ctx, userKey)
	if err != nil {
		return err
	}

	req := u2f.NewWebRegisterRequest(challenge, u2fRegistrationsFromRegistrations(registrations))
	return c.JSON(http.StatusOK, req)
}

func RegisterResponse(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	var regResp u2f.RegisterResponse
	err := c.Bind(&regResp)
	if err != nil {
		log.Errorf(ctx, "Unable to parse register response: %+v", err)
		return c.NoContent(http.StatusBadRequest)
	}

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Unable to get userKey when responding to u2f challenge")
	}

	challenge, err := fetchChallenge(ctx, userKey)
	if err != nil {
		return err
	}

	u2fReg, err := u2f.Register(regResp, *challenge, nil)
	if err != nil {
		log.Errorf(ctx, "Error registering u2f: %v", err)
		return err
	}

	reg, err := u2fToRegistration(u2fReg)
	if err != nil {
		log.Errorf(ctx, "Error converting u2fReg to reg: %v", err)
		return err
	}

	reg.CreatedAt = time.Now()
	err = saveRegistration(ctx, reg, userKey)
	if err != nil {
		return err
	}

	err = saveCounter(ctx, reg.KeyHandle, 0, userKey)
	if err != nil {
		return err
	}

	// force u2f for the user
	user, err := users.GetUserByKey(c, userKey)
	if err != nil {
		return err
	}
	user.U2fEnforced = true
	_, err = users.Save(ctx, user)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, reg)
}

func SignRequest(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Unable to get userKey when responding to u2f challenge")
	}

	registrations, err := fetchRegistrations(ctx, userKey)
	if err != nil {
		return errors.New("Unable to fetch registrations for sign request")
	}

	if len(registrations) == 0 {
		log.Errorf(ctx, "Cant sign with no registrations")
		return errors.New("Cant sign with no registrations")
	}

	challenge, err := u2f.NewChallenge(config.ApplicationID, []string{config.ApplicationID})
	if err != nil {
		log.Errorf(ctx, "Unable to create u2f challenge: %v", err)
		return err
	}

	err = saveChallenge(ctx, challenge, userKey)
	if err != nil {
		return err
	}

	req := challenge.SignRequest(u2fRegistrationsFromRegistrations(registrations))
	return c.JSON(http.StatusOK, req)
}

func SignResponse(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	var signResp u2f.SignResponse
	err := c.Bind(&signResp)
	if err != nil {
		log.Errorf(ctx, "Unable to parse sign response: %+v", err)
		return c.NoContent(http.StatusBadRequest)
	}

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Unable to get userKey when signing response")
	}

	challenge, err := fetchChallenge(ctx, userKey)
	if err != nil {
		return err
	}

	registrations, err := fetchRegistrations(ctx, userKey)
	if err != nil {
		return errors.New("Unable to fetch registrations for sign response")
	}

	for _, reg := range registrations {
		counter, err := fetchCounter(ctx, reg.KeyHandle, userKey)
		if err != nil {
			log.Errorf(ctx, "Couldnt fetch counter: %+v", err)
			continue
		}

		newCounter, authErr := reg.U2fRegistration.Authenticate(signResp, *challenge, counter)
		if authErr == nil {
			err = saveCounter(ctx, reg.KeyHandle, newCounter, userKey)
			if err != nil {
				return err
			}
			scope, _ := sessions.GetScopeFromContext(c)
			if scope == scopes.U2fForRead {
				sessions.UpdateSession(c, userKey, scopes.Read)
			} else if scope == scopes.U2fForWrite {
				sessions.UpdateSession(c, userKey, scopes.Write)
			}

			// return the user, because this is called at login
			return users.GetUserHandler(c)
		}
	}

	err = errors.New("Unable to verify against registrations")
	c.Error(err)
	return err
}

// GetRegistrations gets all of a users registrations
func GetRegistrations(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Unable to get userKey when getting registrations")
	}

	// registrations is a list of the users existing registrations
	registrations, err := fetchRegistrations(ctx, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, registrations)
}

// DeleteRegistration deletes a registration
func DeleteRegistration(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Unable to get userKey when getting registrations")
	}

	regKey, err := datastore.DecodeKey(c.Param("id"))
	if err != nil {
		log.Errorf(ctx, "Unable to decode registration key to delete: %+v", err)
		return err
	}

	if !regKey.Parent().Equal(userKey) {
		return echo.ErrNotFound
	}

	// if this is their only registration, first disable u2f
	// so the user doesnt get permanently locked out
	numRegistrations, err := NumRegistrations(c)
	if err != nil {
		return err
	}
	if numRegistrations == 1 {
		user, err := users.GetUserByKey(c, userKey)
		if err != nil {
			return err
		}
		user.U2fEnforced = false
		_, err = users.Save(ctx, user)
		if err != nil {
			return err
		}
	}

	err = datastore.Delete(ctx, regKey)
	if err != nil {
		log.Errorf(ctx, "Unable to delete registered key: %+v", err)
		return err
	}

	return c.String(http.StatusOK, c.Param("id"))
}

// NumRegistrations returns the number of registrations that a user has
func NumRegistrations(c echo.Context) (int, error) {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return 0, errors.New("Could not get user key from context")
	}

	q := datastore.NewQuery(registrationEntityType).Ancestor(userKey).KeysOnly()
	keys, err := q.GetAll(ctx, nil)
	if err != nil {
		log.Errorf(ctx, "Unable to get number of registrations for user: %+v", err)
		return 0, err
	}
	return len(keys), nil
}

func saveChallenge(ctx context.Context, challenge *u2f.Challenge, userKey *datastore.Key) error {
	// we use the encoded userKey as the identifier, so that subsequent challenges will overwrite this one
	k := datastore.NewKey(ctx, challengeEntityType, userKey.Encode(), 0, userKey)
	_, err := datastore.Put(ctx, k, challenge)
	if err != nil {
		log.Errorf(ctx, "Error putting to challenges: %+v", err)
		return err
	}

	return nil
}

func fetchChallenge(ctx context.Context, userKey *datastore.Key) (*u2f.Challenge, error) {
	// we use the encoded userKey as the identifier, so that subsequent challenges will overwrite this one
	k := datastore.NewKey(ctx, challengeEntityType, userKey.Encode(), 0, userKey)
	var challenge u2f.Challenge
	err := datastore.Get(ctx, k, &challenge)
	if err != nil {
		log.Errorf(ctx, "Error getting challenge: %+v", err)
		return nil, err
	}

	return &challenge, nil
}

func saveRegistration(ctx context.Context, registration *Registration, userKey *datastore.Key) error {
	k := datastore.NewIncompleteKey(ctx, registrationEntityType, userKey)
	key, err := datastore.Put(ctx, k, registration)
	if err != nil {
		log.Errorf(ctx, "Error putting to registrations: %+v", err)
		return err
	}
	registration.ID = key

	return nil
}

func fetchRegistrations(ctx context.Context, userKey *datastore.Key) ([]Registration, error) {
	registrations := []Registration{}

	q := datastore.NewQuery(registrationEntityType).Ancestor(userKey)
	keys, err := q.GetAll(ctx, &registrations)
	if err != nil {
		log.Errorf(ctx, "Failed to fetch challenge from db: %+v", err)
		return nil, err
	}

	// use idx because regs are modified in the loop
	for idx := range registrations {
		err = (&registrations[idx]).populateU2fInRegistration()
		if err != nil {
			log.Errorf(ctx, "Failed to parse registration from db: %+v", err)
			return nil, err
		}
		registrations[idx].ID = keys[idx]
	}

	return registrations, nil
}

type counter struct {
	c int32
}

func saveCounter(ctx context.Context, keyHandle []byte, count uint32, userKey *datastore.Key) error {
	// we use the base64 encoded KeyHandle as the identifier
	k := datastore.NewKey(ctx, counterEntityType, base64.StdEncoding.EncodeToString(keyHandle), 0, userKey)
	c := counter{int32(count)}
	_, err := datastore.Put(ctx, k, &c)
	if err != nil {
		log.Errorf(ctx, "Error putting counter: %+v", err)
		return err
	}

	return nil
}

func fetchCounter(ctx context.Context, keyHandle []byte, userKey *datastore.Key) (uint32, error) {
	// we use the base64 encoded KeyHandle as the identifier
	k := datastore.NewKey(ctx, counterEntityType, base64.StdEncoding.EncodeToString(keyHandle), 0, userKey)
	var c counter
	err := datastore.Get(ctx, k, &c)
	if err != nil {
		log.Errorf(ctx, "Error getting counter: %+v", err)
		return 0, err
	}

	var converted uint32 = uint32(c.c)
	return converted, nil
}

func u2fToRegistration(orig *u2f.Registration) (*Registration, error) {
	pubKeyB, err := x509.MarshalPKIXPublicKey(&orig.PubKey)
	if err != nil {
		return nil, err
	}

	var attestationCertB []byte
	if orig.AttestationCert != nil {
		attestationCertB = orig.AttestationCert.Raw
	}

	converted := Registration{
		U2fRegistration: orig,
		Raw:             orig.Raw,
		KeyHandle:       orig.KeyHandle,
		PubKey:          pubKeyB,
		AttestationCert: attestationCertB,
	}
	return &converted, nil
}

func (r *Registration) populateU2fInRegistration() error {
	pubKey, err := x509.ParsePKIXPublicKey(r.PubKey)
	if err != nil {
		return err
	}

	var cert *x509.Certificate
	if r.AttestationCert != nil {
		cert, err = x509.ParseCertificate(r.AttestationCert)
		if err != nil {
			return err
		}
	}

	typedCert := pubKey.(*ecdsa.PublicKey)

	u2fReg := &u2f.Registration{
		Raw:             r.Raw,
		KeyHandle:       r.KeyHandle,
		PubKey:          *typedCert,
		AttestationCert: cert,
	}
	r.U2fRegistration = u2fReg
	return nil
}

func u2fRegistrationsFromRegistrations(regs []Registration) []u2f.Registration {
	u2fRegistrations := []u2f.Registration{}
	for _, reg := range regs {
		u2fRegistrations = append(u2fRegistrations, *reg.U2fRegistration)
	}
	return u2fRegistrations
}
