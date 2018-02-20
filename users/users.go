package users

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/labstack/echo"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"auth/scopes"
	"auth/sessions"
	"vault"
)

const (
	userEntityType = "user"
)

// User represents a registered user
type User struct {
	Email       string         `json:"email"`
	Password    *datastore.Key `json:"-"`
	U2fEnforced bool           `json:"u2fEnforced"`
	Verified    bool           `json:"verified"`
}

// RegisterHandler registers a new user
func RegisterHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	email, password, ok := c.Request().BasicAuth()
	if !ok {
		err := errors.New("Unable to get auth info from request")
		return echo.NewHTTPError(http.StatusBadRequest, err)
	}

	// check if the user exists already
	query := datastore.NewQuery(userEntityType).
		Filter("Email =", email).
		KeysOnly()
	keys, err := query.GetAll(ctx, nil)
	if err != nil {
		log.Errorf(ctx, "Failed to check if user exists")
		return err
	}
	if len(keys) > 0 {
		err := fmt.Errorf("Email %s already has an account", email)
		return echo.NewHTTPError(http.StatusBadRequest, err)
	}

	// make a full key for a user
	userKey := datastore.NewKey(ctx, userEntityType, email, 0, nil)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Errorf(ctx, "Unable to hash password")
		return err
	}

	// save the password in vault
	entry := &vault.Entry{
		Title:            vault.LoginPasswordEntryTitle,
		EncryptedMessage: hashedPassword,
	}
	passwordKey, err := vault.Put(ctx, entry, userKey)
	if err != nil {
		return err
	}

	// set the password and save the user
	user := User{
		Email:    email,
		Password: passwordKey,
	}
	userKey, err = datastore.Put(ctx, userKey, &user)
	if err != nil {
		log.Errorf(ctx, "Unable to store the user")
		return err
	}

	err = requestVerification(c, userKey, email)
	if err != nil {
		return err
	}

	// set the userkey in the session
	// set read scope, until the user verifies their email
	sessions.UpdateSession(c, userKey, scopes.Read)
	return c.NoContent(http.StatusCreated)
}

// AuthUserByUsernamePassword auths a user and returns their user key
func AuthUserByUsernamePassword(req *http.Request) (*datastore.Key, error) {
	ctx := appengine.NewContext(req)
	email, password, ok := req.BasicAuth()
	if !ok {
		return nil, nil
	}

	key, u, err := FetchUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	passwordEntry, err := vault.Get(ctx, u.Password)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword(passwordEntry.EncryptedMessage, []byte(password))
	if err != nil {
		return nil, nil
	}

	return key, nil
}

// FetchUserByEmail fetches a user for a given email
func FetchUserByEmail(ctx context.Context, email string) (*datastore.Key, *User, error) {
	var results []User
	query := datastore.NewQuery(userEntityType).
		Filter("Email =", email)
	keys, err := query.GetAll(ctx, &results)
	if err != nil {
		log.Errorf(ctx, "Failed to check if user exists")
		return nil, nil, err
	}
	if len(results) == 0 {
		return nil, nil, errors.New("No user found for given email")
	}

	return keys[0], &results[0], nil
}

// GetUserByKey gets a user by their key
func GetUserByKey(c echo.Context, key *datastore.Key) (*User, error) {
	ctx := appengine.NewContext(c.Request())

	u := &User{}
	err := datastore.Get(ctx, key, u)
	if err != nil {
		log.Errorf(ctx, "Unable to fetch user by key: %+v", err)
	}
	return u, err
}
