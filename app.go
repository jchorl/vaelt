package main

import (
	"net/http"

	"github.com/labstack/echo"

	"auth"
	"auth/sessions"
	"users"
	"vault"
)

var e = createMux()

func init() {
	usersGroup := e.Group("/api/users")
	usersGroup.POST("", users.RegisterHandler, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware)

	vaultGroup := e.Group("/api/vault")
	vaultGroup.POST("", vault.PostHandler, auth.AuthWriteMiddlewares...)
	vaultGroup.GET("/:id", vault.GetHandler, auth.AuthReadMiddlewares...)
	vaultGroup.GET("", vault.GetAllHandler, auth.AuthReadMiddlewares...)
}

func createMux() *echo.Echo {
	e := echo.New()
	http.Handle("/", e)
	return e
}
