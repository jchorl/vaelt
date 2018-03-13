package main

import (
	"net/http"

	"github.com/labstack/echo"

	"auth"
	"auth/sessions"
	"auth/u2f"
	"keystore"
	"users"
	"vault"
)

var e = createMux()

func init() {
	e.GET("/api/logout", sessions.LogoutHandler, sessions.SessionsMiddleware)

	usersGroup := e.Group("/api/users")
	usersGroup.POST("", users.RegisterHandler, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware)
	usersGroup.GET("", users.GetUserHandler, auth.AuthReadMiddlewares...)
	usersGroup.POST("/login", users.LoginHandler, auth.AuthWriteFallBackToReadMiddlewares...)
	usersGroup.GET("/verify/:userKey", users.VerifyUserHandler, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware)

	vaultGroup := e.Group("/api/vault")
	vaultGroup.POST("", vault.PostHandler, auth.AuthWriteMiddlewares...)
	vaultGroup.GET("", vault.GetAllHandler, auth.AuthReadMiddlewares...)

	u2fGroup := e.Group("/api/u2f")
	u2fGroup.GET("/register", u2f.RegisterRequest, auth.AuthWriteMiddlewares...)
	u2fGroup.POST("/register", u2f.RegisterResponse, auth.AuthWriteMiddlewares...)
	u2fGroup.GET("/sign", u2f.SignRequest, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware, auth.AddUserKeyMiddleware)
	u2fGroup.POST("/sign", u2f.SignResponse, sessions.SessionsMiddleware, sessions.SessionProcessingMiddleware, auth.AddUserKeyMiddleware, auth.VerifyU2fInProgress)
	u2fGroup.GET("/registrations", u2f.GetRegistrations, auth.AuthReadMiddlewares...)
	u2fGroup.DELETE("/registrations/:id", u2f.DeleteRegistration, auth.AuthWriteMiddlewares...)

	keyGroup := e.Group("/api/keys")
	keyGroup.GET("", keystore.GetAllHandler, auth.AuthReadMiddlewares...)
	keyGroup.GET("/proxy", keystore.ProxyHandler)
	keyGroup.POST("", keystore.PostHandler, auth.AuthWriteMiddlewares...)
	keyGroup.DELETE("/:id", keystore.RevokeHandler, auth.AuthWriteMiddlewares...)
}

func createMux() *echo.Echo {
	e := echo.New()
	http.Handle("/", e)
	return e
}
