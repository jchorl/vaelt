package util

import (
	"errors"

	"github.com/gorilla/sessions"
	"github.com/labstack/echo"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
)

// GetUserKeyFromContext retrieves the user key from an authd context
func GetUserKeyFromContext(c echo.Context) (*datastore.Key, error) {
	ctx := appengine.NewContext(c.Request())
	encoded, ok := c.Get("userKey").(string)
	if !ok {
		log.Errorf(ctx, "Unable to get user key from context")
		return nil, errors.New("Unable to get user key from context")
	}

	decoded, err := datastore.DecodeKey(encoded)
	if err != nil {
		log.Errorf(ctx, "Unable to decode user key: %+v", err)
		return nil, err
	}

	return decoded, nil
}

// IsContextAuthd checks if a context has an authd user
func IsContextAuthd(c echo.Context) bool {
	sess, ok := c.Get("session").(*sessions.Session)
	if !ok {
		return false
	}

	// if a scope is already present, then return true
	_, ok = sess.Values["scope"].(string)
	return ok
}
