package users

import (
	"fmt"
	"net/http"

	"github.com/SparkPost/gosparkpost"
	"github.com/labstack/echo"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
	"google.golang.org/appengine/urlfetch"

	"auth/sessions"
	"config"
)

func requestVerification(c echo.Context, userKey *datastore.Key, email string) error {
	ctx := appengine.NewContext(c.Request())

	cfg := &gosparkpost.Config{
		BaseUrl:    "https://api.sparkpost.com",
		ApiKey:     config.SparkPostAPIKey,
		ApiVersion: 1,
	}
	var client gosparkpost.Client
	err := client.Init(cfg)
	if err != nil {
		log.Errorf(ctx, "SparkPost client init failed: %+v", err)
		return err
	}

	verificationLink := fmt.Sprintf("%s/api/users/verify/%s", config.ApplicationID, userKey.Encode())

	// Create a Transmission using an inline Recipient List
	// and inline email Content.
	tx := &gosparkpost.Transmission{
		Recipients: []string{email},
		Content: gosparkpost.Content{
			HTML:    fmt.Sprintf("<div>Please visit <a href=\"%s\">%s</a> to verify your account</div>", verificationLink, verificationLink),
			From:    config.VerifyEmailFrom,
			Subject: "Vaelt Email Verification",
		},
	}
	client.Client = urlfetch.Client(ctx)
	_, _, err = client.Send(tx)
	if err != nil {
		log.Errorf(ctx, "Unable to send verification email: %+v", err)
		return err
	}
	return nil
}

// VerifyUserHandler verifies a user
func VerifyUserHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKeyEncoded := c.Param("userKey")
	userKey, err := datastore.DecodeKey(userKeyEncoded)
	if err != nil {
		return c.NoContent(http.StatusBadRequest)
	}

	user, err := GetUserByKey(c, userKey)
	if err != nil {
		return err
	}

	user.Verified = true
	_, err = Save(ctx, user)
	if err != nil {
		return err
	}

	// log the user out so they can log back in with their write scope
	_ = sessions.ExpireSession(c)
	return c.Redirect(http.StatusTemporaryRedirect, config.ApplicationID)
}
