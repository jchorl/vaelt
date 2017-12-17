package users

import (
	"fmt"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"github.com/jchorl/passwords/vault"
)

const (
	userEntityType = "user"
)

// User represents a registered user
type User struct {
	Email    string
	Password *datastore.Key
}

func init() {
	http.HandleFunc("/api/users/register", register)
}

func register(w http.ResponseWriter, r *http.Request) {
	ctx := appengine.NewContext(r)

	email, password, ok := r.BasicAuth()
	if !ok {
		log.Errorf(ctx, "Unable to get auth info from request")
		http.Error(w, "Unable to get auth info from request", http.StatusBadRequest)
		return
	}

	// check if the user exists already
	query := datastore.NewQuery(userEntityType).
		Filter("Email =", email).
		KeysOnly()
	keys, err := query.GetAll(ctx, nil)
	if err != nil {
		log.Errorf(ctx, "Failed to check if user exists")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if len(keys) > 0 {
		http.Error(w, fmt.Sprintf("Email %s already has an account", email), http.StatusBadRequest)
		return
	}

	// make a full key for a user
	userKey := datastore.NewKey(ctx, userEntityType, email, 0, nil)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Errorf(ctx, "Unable to hash password")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// save the password in vault
	entry := &vault.Entry{
		Title:            vault.LoginPasswordEntryTitle,
		EncryptedMessage: hashedPassword,
	}
	passwordKey, err := vault.Put(ctx, entry, userKey)
	if err != nil {
		log.Errorf(ctx, "Unable to store user's password")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// set the password and save the user
	user := User{
		Email:    email,
		Password: passwordKey,
	}
	_, err = datastore.Put(ctx, userKey, user)
	if err != nil {
		log.Errorf(ctx, "Unable to store the user")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
