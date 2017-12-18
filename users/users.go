package users

import (
	"errors"
	"fmt"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"github.com/jchorl/passwords/vault"
	"github.com/labstack/echo"
)

const (
	userEntityType = "user"
)

// User represents a registered user
type User struct {
	Email    string
	Password *datastore.Key
}

// RegisterHandlers registers handlers on an echo Group
func RegisterHandlers(g *echo.Group) {
	g.POST("/register", registerHandler)
}

func registerHandler(c echo.Context) error {
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
	_, err = datastore.Put(ctx, userKey, user)
	if err != nil {
		log.Errorf(ctx, "Unable to store the user")
		return err
	}

	return c.NoContent(http.StatusCreated)
}

// AuthUser auths a user and returns their user key
func AuthUser(email, password string, req *http.Request) (*datastore.Key, error) {
	ctx := appengine.NewContext(req)

	var results []User
	query := datastore.NewQuery(userEntityType).
		Filter("Email =", email)
	keys, err := query.GetAll(ctx, &results)
	if err != nil {
		log.Errorf(ctx, "Failed to check if user exists")
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}

	u := results[0]
	passwordEntry, err := vault.Get(ctx, u.Password)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword(passwordEntry.EncryptedMessage, []byte(password))
	if err != nil {
		return nil, nil
	}

	return keys[0], nil
}
