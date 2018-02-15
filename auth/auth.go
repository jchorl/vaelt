package auth

import (
	"github.com/labstack/echo"

	"auth/scopes"
	"auth/sessions"
	"users"
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

// AuthReadMiddlewares are the middlewares used to auth a read request
var AuthReadMiddlewares = []echo.MiddlewareFunc{
	sessions.SessionsMiddleware,
	sessions.SessionProcessingMiddleware,
	basicAuthMiddleware,
	readAuthCheckMiddleware,
}

// AuthWriteMiddlewares are the middlewares used to auth a write request
var AuthWriteMiddlewares = []echo.MiddlewareFunc{
	sessions.SessionsMiddleware,
	sessions.SessionProcessingMiddleware,
	basicAuthMiddleware,
	writeAuthCheckMiddleware,
}

// basic auth middleware
func basicAuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if sessions.IsContextAuthd(c) {
			return next(c)
		}

		userKey, err := users.AuthUserByUsernamePassword(c.Request())
		if err != nil {
			return err
		}

		// auth was successful, so set the new details
		if userKey != nil {
			sessions.UpdateSession(c, userKey, scopes.Write)
		}

		return next(c)
	}
}

// read auth checking middleware
func readAuthCheckMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// check for read scope
		scope, scopeOk := sessions.GetScopeFromContext(c)
		_, userKeyOk := sessions.GetUserKeyFromContext(c)
		if !scopeOk || !userKeyOk || (scope != scopes.Read && scope != scopes.Write) {
			c.Response().Header().Set(echo.HeaderWWWAuthenticate, "basic")
			return echo.ErrUnauthorized
		}

		return next(c)
	}
}

// write auth checking middleware
func writeAuthCheckMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// check for write scope
		scope, scopeOk := sessions.GetScopeFromContext(c)
		_, userKeyOk := sessions.GetUserKeyFromContext(c)
		if !scopeOk || !userKeyOk || scope != scopes.Write {
			c.Response().Header().Set(echo.HeaderWWWAuthenticate, "basic")
			return echo.ErrUnauthorized
		}

		return next(c)
	}
}
