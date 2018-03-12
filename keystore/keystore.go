package keystore

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"auth/sessions"
)

const (
	public        = "public"
	private       = "private"
	keyEntityType = "key"
)

// Key represents a public or private key.
// Exactly one of URL or ArmoredKey should be non-empty.
// Private keys should all be protected by a passphrase.
type Key struct {
	ID         *datastore.Key `datastore:"-" json:"id"`
	Name       string         `json:"name"`
	URL        string         `json:"url"`
	ArmoredKey string         `datastore:",noindex" json:"armoredKey"`
	Type       string         `json:"type"`
	CreatedAt  time.Time      `json:"createdAt"`
}

// GetAllHandler gets all of a users keys
func GetAllHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	keys, err := GetAll(ctx, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, keys)
}

// PostHandler posts a new key
func PostHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	key := new(Key)
	err := c.Bind(key)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Could not parse the request body")
	}

	// make sure the entry is not a duplicate
	allKeys, err := GetAll(ctx, userKey)
	if err != nil {
		return err
	}
	for _, k := range allKeys {
		if k.URL == key.URL || k.ArmoredKey == key.ArmoredKey {
			return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Key is identical to existing key (%s)", k.Name))
		}
	}

	err = Put(ctx, key, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusCreated, key)
}

// RevokeHandler revokes a key, deleting all vault entries encrypted with that key
func RevokeHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	key, err := datastore.DecodeKey(c.Param("id"))
	if err != nil {
		log.Errorf(ctx, "Unable to decode key to delete: %+v", err)
		return err
	}

	// make sure the user owns the key
	if !key.Parent().Equal(userKey) {
		return echo.ErrNotFound
	}

	// TODO figure out circular dependencies between vault and keystore
	// delete all vault entries encrypted by this key

	err = datastore.Delete(ctx, key)
	if err != nil {
		log.Errorf(ctx, "Unable to delete key: %+v", err)
		return err
	}

	return c.String(http.StatusOK, c.Param("id"))
}

// Put saves a key
func Put(ctx context.Context, key *Key, userKey *datastore.Key) error {
	if key.URL == "" && key.ArmoredKey == "" {
		return errors.New("One of URL and ArmoredKey must be provided")
	}

	if key.Type != public && key.Type != private {
		return errors.New("Key type must be private or public")
	}

	key.CreatedAt = time.Now()

	k := datastore.NewIncompleteKey(ctx, keyEntityType, userKey)
	k, err := datastore.Put(ctx, k, key)
	if err != nil {
		log.Errorf(ctx, "Error putting to keystore: %+v", err)
		return err
	}

	key.ID = k

	return nil
}

// GetAll gets all keys for a user
func GetAll(ctx context.Context, userKey *datastore.Key) ([]Key, error) {
	var keys []Key
	query := datastore.NewQuery(keyEntityType).
		Ancestor(userKey)
	ks, err := query.GetAll(ctx, &keys)
	if err != nil {
		log.Errorf(ctx, "Failed to query for all keys: %+v", err)
		return nil, err
	}

	// use idx to modify the keys instead of copies
	for idx, _ := range keys {
		keys[idx].ID = ks[idx]
	}

	return keys, nil
}
