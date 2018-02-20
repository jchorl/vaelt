package main

import (
	"net/http"

	"github.com/labstack/echo"

	"auth"
	"auth/sessions"
	"auth/u2f"
	"users"
	"vault"
)

var e = createMux()

func init() {
	e.GET("/api/logout", sessions.Logout, sessions.SessionsMiddleware)

	usersGroup := e.Group("/api/users")
	usersGroup.POST("", users.RegisterHandler, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware)
	usersGroup.GET("/verify/:userKey", users.VerifyUser, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware)

	vaultGroup := e.Group("/api/vault")
	vaultGroup.POST("", vault.PostHandler, auth.AuthWriteMiddlewares...)
	vaultGroup.GET("/:id", vault.GetHandler, auth.AuthReadMiddlewares...)
	vaultGroup.GET("", vault.GetAllHandler, auth.AuthReadMiddlewares...)

	u2fGroup := e.Group("/api/u2f")
	u2fGroup.GET("/register", u2f.RegisterRequest, auth.AuthWriteMiddlewares...)
	u2fGroup.POST("/register", u2f.RegisterResponse, auth.AuthWriteMiddlewares...)
	u2fGroup.GET("/sign", u2f.SignRequest, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware, auth.AddUserKeyMiddleware)
	u2fGroup.POST("/sign", u2f.SignResponse, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware, auth.AddUserKeyMiddleware, auth.VerifyU2fInProgress)
}

func createMux() *echo.Echo {
	e := echo.New()
	http.Handle("/", e)
	return e
}
