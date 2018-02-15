package auth

import (
	"fmt"

	"github.com/dsoprea/goappenginesessioncascade"
	"github.com/gorilla/sessions"
	"github.com/labstack/echo"
	"github.com/labstack/echo-contrib/session"

	"github.com/jchorl/passwords/secrets"
	"github.com/jchorl/passwords/users"
	"github.com/jchorl/passwords/util"
)

/*
There are two scopes, READ and WRITE
Obtaining WRITE scope requires:
- email/password with optional enforced u2f

Reads are way more flexible - we dont want to expose what users use which services (ie just email to auth)
but also want to be as open as possible if someone loses things and needs access. The idea is
that email and anything that would be sufficient to decrypt information is enough to see everything.
so email + yubikey (u2f), or email/password
Obtaining READ scope requires:
- email/u2f
- email/password
*/

const (
	// ScopeRead marks a user as having permission to read their data
	ScopeRead = "READ"
	// ScopeWrite marks a user as having permission to write to their data
	ScopeWrite = "WRITE"

	sessionMaxAgeSeconds = 10 * 60
	sessionName          = "session"
)

// AuthReadMiddlewares are the middlewares used to auth a read request
var AuthReadMiddlewares = []echo.MiddlewareFunc{
	session.MiddlewareWithConfig(sessionsMiddlewareConfig),
	sessionProcessingMiddleware,
	basicAuthMiddleware,
	readAuthCheckMiddleware,
}

// AuthWriteMiddlewares are the middlewares used to auth a write request
var AuthWriteMiddlewares = []echo.MiddlewareFunc{
	session.MiddlewareWithConfig(sessionsMiddlewareConfig),
	sessionProcessingMiddleware,
	basicAuthMiddleware,
	writeAuthCheckMiddleware,
}

// builtin sessions middleware
var sessionsMiddlewareConfig = session.Config{
	Store: cascadestore.NewCascadeStore(cascadestore.MemcacheBackend, []byte(secrets.Session)),
}

// custom session middleware
func sessionProcessingMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// the request should have a session frem the builtin sessions middleware
		sess, err := session.Get(sessionName, c)
		if err != nil {
			return fmt.Errorf("Error getting session: %+v")
		}

		// if the session is new, set and persist the options
		if sess.IsNew {
			sess.Options = &sessions.Options{
				Path:     "/",
				MaxAge:   sessionMaxAgeSeconds,
				HttpOnly: true,
				Secure:   true,
			}
			sess.Save(c.Request(), c.Response())
		}
		c.Set(sessionName, sess)

		return next(c)
	}
}

// basic auth middleware
func basicAuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if util.IsContextAuthd(c) {
			return next(c)
		}

		userKey, err := users.AuthUserByUsernamePassword(c.Request())
		if err != nil {
			return err
		}

		// auth was successful, so set the new details
		if userKey != nil {
			sess := c.Get(sessionName).(*sessions.Session)
			sess.Values["userKey"] = userKey.Encode()
			sess.Values["scope"] = ScopeWrite
			sess.Save(c.Request(), c.Response())
		}

		return next(c)
	}
}

// read auth checking middleware
func readAuthCheckMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sess := c.Get(sessionName).(*sessions.Session)

		// check for read scope
		scope, scopeOk := sess.Values["scope"].(string)
		_, userKeyOk := sess.Values["userKey"].(string)
		if !scopeOk || !userKeyOk || (scope != ScopeRead && scope != ScopeWrite) {
			c.Response().Header().Set(echo.HeaderWWWAuthenticate, "basic")
			return echo.ErrUnauthorized
		}

		return next(c)
	}
}

// write auth checking middleware
func writeAuthCheckMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sess := c.Get(sessionName).(*sessions.Session)

		// check for write scope
		scope, scopeOk := sess.Values["scope"].(string)
		_, userKeyOk := sess.Values["userKey"].(string)
		if !scopeOk || !userKeyOk || scope != ScopeWrite {
			c.Response().Header().Set(echo.HeaderWWWAuthenticate, "basic")
			return echo.ErrUnauthorized
		}

		return next(c)
	}
}
