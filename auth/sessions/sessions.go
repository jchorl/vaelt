package sessions

import (
	"fmt"
	"net/http"

	"github.com/dsoprea/goappenginesessioncascade"
	"github.com/gorilla/sessions"
	"github.com/labstack/echo"
	"github.com/labstack/echo-contrib/session"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"auth/scopes"
	"config"
)

const (
	sessionName          = "session"
	defaultMaxAgeSeconds = 10 * 60
	userKeySessionField  = "userKey"
	scopeSessionField    = "scope"
)

var (
	// SessionsMiddleware is the middleware to create sessions before every req
	SessionsMiddleware = session.MiddlewareWithConfig(sessionsMiddlewareConfig)
)

// builtin sessions middleware
var sessionsMiddlewareConfig = session.Config{
	Store: cascadestore.NewCascadeStore(cascadestore.MemcacheBackend, []byte(config.SessionSecret)),
}

// LogoutHandler is a handler to expire a user's session
func LogoutHandler(c echo.Context) error {
	err := ExpireSession(c)
	if err != nil {
		return err
	}

	return c.NoContent(http.StatusOK)
}

// ExpireSession expires a user's session and erases their userkey and scope
func ExpireSession(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	sess, err := session.Get(sessionName, c)
	if err != nil {
		log.Errorf(ctx, "Unable to get session for request: %+v", err)
		return err
	}
	if sess == nil {
		return c.NoContent(http.StatusNoContent)
	}

	sess.Options.MaxAge = -1
	sess.Values[userKeySessionField] = ""
	sess.Values[scopeSessionField] = ""
	return sess.Save(c.Request(), c.Response())
}

// SessionProcessingMiddleware adds sensible defaults to the provided sessions
func SessionProcessingMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// the request should have a session frem the builtin sessions middleware
		sess, err := session.Get(sessionName, c)
		if err != nil {
			return fmt.Errorf("Error getting session: %+v", err)
		}

		// if the session is new, set and persist the options
		if sess.IsNew {
			sess.Options = &sessions.Options{
				Path:     "/",
				MaxAge:   defaultMaxAgeSeconds,
				HttpOnly: true,
				Secure:   true,
			}
			sess.Save(c.Request(), c.Response())
		}
		c.Set(sessionName, sess)

		return next(c)
	}
}

// UpdateSession saves a session with the userKey and scope
func UpdateSession(c echo.Context, userKey *datastore.Key, scope scopes.Scope) error {
	ctx := appengine.NewContext(c.Request())
	sess := c.Get(sessionName).(*sessions.Session)
	sess.Values[userKeySessionField] = userKey.Encode()
	sess.Values[scopeSessionField] = scope
	err := sess.Save(c.Request(), c.Response())
	if err != nil {
		log.Errorf(ctx, "Unable to save the sess: %+v", err)
	}
	return err
}

// GetScopeFromContext retrieves the scope from an authd context
func GetScopeFromContext(c echo.Context) (scopes.Scope, bool) {
	sess := c.Get(sessionName).(*sessions.Session)
	scope, ok := sess.Values[scopeSessionField].(scopes.Scope)
	return scope, ok
}

// GetUserKeyFromContext retrieves the user key from an authd context
func GetUserKeyFromContext(c echo.Context) (*datastore.Key, bool) {
	ctx := appengine.NewContext(c.Request())
	sess := c.Get(sessionName).(*sessions.Session)
	encoded, ok := sess.Values[userKeySessionField].(string)
	if !ok {
		log.Errorf(ctx, "Unable to get user key from context")
		return nil, false
	}

	decoded, err := datastore.DecodeKey(encoded)
	if err != nil {
		log.Errorf(ctx, "Unable to decode user key: %+v", err)
		return nil, false
	}

	return decoded, true
}
