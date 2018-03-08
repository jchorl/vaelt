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

var (
	// ErrorBadRequest represents invalid auth headers
	ErrorBadRequest = errors.New("Unable to parse authentication info from request")
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
		return echo.NewHTTPError(http.StatusBadRequest, "Unable to get auth info from request")
	}

	// check if the user exists already
	query := datastore.NewQuery(userEntityType).
		Filter("Email =", email).
		KeysOnly()
	keys, err := query.GetAll(ctx, nil)
	if err != nil {
		log.Errorf(ctx, "Failed to check if user exists: %+v", err)
		return err
	}
	if len(keys) > 0 {
		msg := fmt.Sprintf("Email %s already has an account", email)
		return echo.NewHTTPError(http.StatusBadRequest, msg)
	}

	// make a full key for a user
	userKey := userKeyFromEmail(ctx, email)
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
	user := &User{
		Email:    email,
		Password: passwordKey,
	}
	userKey, err = Save(ctx, user)
	if err != nil {
		return err
	}

	err = requestVerification(c, userKey, email)
	if err != nil {
		log.Errorf(ctx, "Error sending verification email to user: %+v", err)

		return echo.NewHTTPError(http.StatusInternalServerError, "Unfortunately we were unable to send you a verification email. You can log in, but will have limited access until you verify your account. You can log in to request another verification email.")
	}

	// set the userkey in the session
	// set read scope, until the user verifies their email
	sessions.UpdateSession(c, userKey, scopes.Read)
	return c.NoContent(http.StatusCreated)
}

// LoginHandler just returns 200, because middlewares do the work
func LoginHandler(c echo.Context) error {
	return GetUserHandler(c)
}

// GetUserHandler returns the user info
func GetUserHandler(c echo.Context) error {
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	user, err := GetUserByKey(c, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, user)
}

// AuthUserByUsernamePassword auths a user and returns their user key
func AuthUserByUsernamePassword(req *http.Request) (*datastore.Key, error) {
	ctx := appengine.NewContext(req)
	email, password, ok := req.BasicAuth()
	if !ok {
		return nil, ErrorBadRequest
	}

	key, u, err := GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	passwordEntry, err := vault.Get(ctx, u.Password, key)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword(passwordEntry.EncryptedMessage, []byte(password))
	if err != nil {
		return nil, nil
	}

	return key, nil
}

// GetUserByEmail fetches a user for a given email
func GetUserByEmail(ctx context.Context, email string) (*datastore.Key, *User, error) {
	var results []User
	query := datastore.NewQuery(userEntityType).
		Filter("Email =", email)
	keys, err := query.GetAll(ctx, &results)
	if err != nil {
		log.Errorf(ctx, "Failed to check if user exists: %+v", err)
		return nil, nil, err
	}
	if len(results) == 0 {
		return nil, nil, errors.New("No user found with that email address")
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

// Save saves a user
func Save(ctx context.Context, user *User) (*datastore.Key, error) {
	userKey := userKeyFromEmail(ctx, user.Email)
	userKey, err := datastore.Put(ctx, userKey, user)
	if err != nil {
		log.Errorf(ctx, "Unable to store the user: %+v", err)
		return nil, err
	}

	return userKey, nil
}

func userKeyFromEmail(ctx context.Context, email string) *datastore.Key {
	return datastore.NewKey(ctx, userEntityType, email, 0, nil)
}
