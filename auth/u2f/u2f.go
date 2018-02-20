package u2f

import (
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"net/http"

	"github.com/labstack/echo"
	"github.com/tstranex/u2f"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"auth/scopes"
	"auth/sessions"
	"config"
)

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

	req := u2f.NewWebRegisterRequest(challenge, registrations)
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

	reg, err := u2f.Register(regResp, *challenge, nil)
	if err != nil {
		log.Errorf(ctx, "Error registering u2f: %v", err)
		return err
	}

	err = saveRegistration(ctx, reg, userKey)
	if err != nil {
		return err
	}

	err = saveCounter(ctx, reg.KeyHandle, 0, userKey)
	if err != nil {
		return err
	}

	return c.NoContent(http.StatusOK)
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

	req := challenge.SignRequest(registrations)
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

		newCounter, authErr := reg.Authenticate(signResp, *challenge, counter)
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
			return c.NoContent(http.StatusNoContent)
		}
	}

	err = errors.New("Unable to verify against registrations")
	c.Error(err)
	return err
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

func saveRegistration(ctx context.Context, registration *u2f.Registration, userKey *datastore.Key) error {
	regDB, err := registrationToDB(registration)
	if err != nil {
		log.Errorf(ctx, "Error converting u2f registration to db: %+v", err)
		return err
	}

	k := datastore.NewIncompleteKey(ctx, registrationEntityType, userKey)
	_, err = datastore.Put(ctx, k, regDB)
	if err != nil {
		log.Errorf(ctx, "Error putting to registrations: %+v", err)
		return err
	}

	return nil
}

func fetchRegistrations(ctx context.Context, userKey *datastore.Key) ([]u2f.Registration, error) {
	registrations := []u2f.Registration{}
	registrationDBs := []registrationDB{}

	q := datastore.NewQuery(registrationEntityType).Ancestor(userKey)
	_, err := q.GetAll(ctx, &registrationDBs)
	if err != nil {
		log.Errorf(ctx, "Failed to fetch challenge from db: %+v", err)
		return nil, err
	}

	for _, reg := range registrationDBs {
		parsed, err := registrationFromDB(&reg)
		if err != nil {
			log.Errorf(ctx, "Failed to parse registration from db: %+v", err)
			return nil, err
		}

		registrations = append(registrations, *parsed)
	}

	return registrations, nil
}

// HasRegistrations checks to see if a user has registrations available
func HasRegistrations(c echo.Context) bool {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return false
	}

	q := datastore.NewQuery(registrationEntityType).Ancestor(userKey).KeysOnly()
	keys, err := q.GetAll(ctx, nil)
	return err == nil && len(keys) > 0
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

// elliptic curve public keys don't marshal properly for datastore
// so we can use a DAO instead. This mirrors u2f.Registration
type registrationDB struct {
	Raw       []byte
	KeyHandle []byte
	PubKey    []byte
	// AttestationCert can be nil for Authenticate requests.
	AttestationCert []byte
}

func registrationToDB(orig *u2f.Registration) (*registrationDB, error) {
	pubKeyB, err := x509.MarshalPKIXPublicKey(&orig.PubKey)
	if err != nil {
		return nil, err
	}

	var attestationCertB []byte
	if orig.AttestationCert != nil {
		attestationCertB = orig.AttestationCert.Raw
	}

	db := registrationDB{
		Raw:             orig.Raw,
		KeyHandle:       orig.KeyHandle,
		PubKey:          pubKeyB,
		AttestationCert: attestationCertB,
	}
	return &db, nil
}

func registrationFromDB(db *registrationDB) (*u2f.Registration, error) {
	pubKey, err := x509.ParsePKIXPublicKey(db.PubKey)
	if err != nil {
		return nil, err
	}

	var cert *x509.Certificate
	if db.AttestationCert != nil {
		cert, err = x509.ParseCertificate(db.AttestationCert)
		if err != nil {
			return nil, err
		}
	}

	typedCert := pubKey.(*ecdsa.PublicKey)

	reg := u2f.Registration{
		Raw:             db.Raw,
		KeyHandle:       db.KeyHandle,
		PubKey:          *typedCert,
		AttestationCert: cert,
	}
	return &reg, nil
}
