package auth

import (
	"net/http"

	"github.com/labstack/echo"
	"google.golang.org/appengine"

	"auth/scopes"
	"auth/sessions"
	"auth/u2f"
	"users"
)

/*
There are two main scopes, READ and WRITE
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

// AuthReadMiddlewares are the middlewares used to auth a read request
var AuthReadMiddlewares = []echo.MiddlewareFunc{
	sessions.SessionsMiddleware,
	sessions.SessionProcessingMiddleware,
	basicAuthMiddlewareRead,
	readAuthCheckMiddleware,
}

// AuthWriteMiddlewares are the middlewares used to auth a write request
var AuthWriteMiddlewares = []echo.MiddlewareFunc{
	sessions.SessionsMiddleware,
	sessions.SessionProcessingMiddleware,
	basicAuthMiddlewareWrite,
	writeAuthCheckMiddleware,
}

var AuthWriteFallBackToReadMiddlewares = []echo.MiddlewareFunc{
	sessions.SessionsMiddleware,
	sessions.SessionProcessingMiddleware,
	basicAuthMiddlewareWrite,
	basicAuthMiddlewareRead,
	readAuthCheckMiddleware,
}

// AddUserKeyMiddleware adds a user key to a request for u2f auth
func AddUserKeyMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		ctx := appengine.NewContext(c.Request())
		_, ok := sessions.GetUserKeyFromContext(c)
		if ok {
			return next(c)
		}

		// parsing just email from basic auth works: https://play.golang.org/p/qKVGT6cakjT
		email, _, ok := c.Request().BasicAuth()
		if !ok {
			return c.NoContent(http.StatusBadRequest)
		}

		key, _, err := users.GetUserByEmail(ctx, email)
		if err != nil {
			return err
		}

		sessions.UpdateSession(c, key, scopes.U2fForRead)
		return next(c)
	}
}

// basic auth middleware for write
func basicAuthMiddlewareWrite(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// if already has write scope, move on
		if hasScope(c, scopes.Write) {
			return next(c)
		}

		userKey, err := users.AuthUserByUsernamePassword(c.Request())
		if err != nil {
			if err == users.ErrorBadRequest {
				return echo.NewHTTPError(http.StatusBadRequest, err.Error())
			}
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid email/password")
		}

		// auth was successful, check if u2f is required and set the new details
		if userKey != nil {
			// get the user
			user, err := users.GetUserByKey(c, userKey)
			if err != nil {
				return err
			}

			// check if the user requires u2f
			if user.U2fEnforced {
				// mark the session as u2f in progress
				sessions.UpdateSession(c, userKey, scopes.U2fForWrite)
				// return 401 with a useful error
				return echo.NewHTTPError(http.StatusUnauthorized, "U2F required")
			}
			sessions.UpdateSession(c, userKey, scopes.Write)
		}

		return next(c)
	}
}

// basic auth middleware for read
func basicAuthMiddlewareRead(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// if already has read or write, move on
		if hasScope(c, scopes.Read, scopes.Write) {
			return next(c)
		}

		userKey, err := users.AuthUserByUsernamePassword(c.Request())
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "Unable to authenticate")
		}

		// auth was successful, so set the new details
		if userKey != nil {
			sessions.UpdateSession(c, userKey, scopes.Read)
		}

		return next(c)
	}
}

// read auth checking middleware
func readAuthCheckMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// check for read scope
		_, userKeyOk := sessions.GetUserKeyFromContext(c)
		if !userKeyOk || !hasScope(c, scopes.Read, scopes.Write) {
			if u2f.HasRegistrations(c) {
				c.Response().Header().Add(echo.HeaderWWWAuthenticate, "U2F")
			}
			return echo.NewHTTPError(http.StatusUnauthorized, "Unable to authenticate")
		}

		return next(c)
	}
}

// write auth checking middleware
func writeAuthCheckMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// check for write scope
		userKey, userKeyOk := sessions.GetUserKeyFromContext(c)
		if !userKeyOk {
			return echo.NewHTTPError(http.StatusUnauthorized, "Unable to authenticate")
		}

		user, err := users.GetUserByKey(c, userKey)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "Unable to authenticate")
		}

		if !user.Verified {
			return echo.NewHTTPError(http.StatusUnauthorized, "Account is not verified")
		}

		if !hasScope(c, scopes.Write) {
			c.Response().Header().Set(echo.HeaderWWWAuthenticate, "basic")
			return echo.NewHTTPError(http.StatusUnauthorized, "Unable to authenticate")
		}

		return next(c)
	}
}

func VerifyU2fInProgress(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !hasScope(c, scopes.U2fForRead, scopes.U2fForWrite) {
			return c.NoContent(http.StatusBadRequest)
		}
		return next(c)
	}
}

// hasScope checks if a request has ANY of the specified scopes
func hasScope(c echo.Context, scopess ...scopes.Scope) bool {
	scope, ok := sessions.GetScopeFromContext(c)
	if !ok {
		return false
	}

	for _, s := range scopess {
		if s == scope {
			return true
		}
	}

	return false
}
