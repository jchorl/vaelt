package main

import (
	"net/http"

	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"

	"github.com/jchorl/passwords/users"
	"github.com/jchorl/passwords/vault"
)

var e = createMux()

func init() {
	usersGroup := e.Group("/api/users")
	usersGroup.Use(middleware.CORS())

	users.RegisterHandlers(usersGroup)

	vaultGroup := e.Group("/api/vault")
	vaultGroup.Use(middleware.CORS())

	// everything to do with the vault is authed
	vaultGroup.Use(middleware.BasicAuth(authMiddleware))

	vault.RegisterHandlers(vaultGroup)
}

func createMux() *echo.Echo {
	e := echo.New()
	http.Handle("/", e)
	return e
}

func authMiddleware(username, password string, c echo.Context) (bool, error) {
	userKey, err := users.AuthUser(username, password, c.Request())
	if err != nil {
		return false, err
	}

	if userKey == nil {
		return false, nil
	}

	c.Set("userKey", userKey)

	return true, nil
}
