package keystore

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo"
	"golang.org/x/crypto/openpgp/armor"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
	"google.golang.org/appengine/urlfetch"

	"auth/sessions"
	"vault"
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
	Type       string         `json:"type"`   // either public or private
	Device     string         `json:"device"` // either yubikey, password, or unknown
	CreatedAt  time.Time      `json:"createdAt"`
}

// GetAllHandler gets all of a users keys
// An optional query param vaultTitle can be passed to
// get all the keys that encrypt those vault entries
func GetAllHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	var keys []Key
	var err error

	keyKeys := []*datastore.Key{}
	params := c.QueryParams()
	for _, key := range params["key"] {
		decoded, err := datastore.DecodeKey(key)
		if err != nil {
			log.Errorf(ctx, "Unable to decode key's key: %+v", err)
			return echo.NewHTTPError(http.StatusBadRequest, "Unable to decode key's keys")
		}

		keyKeys = append(keyKeys, decoded)
	}

	if len(keyKeys) == 0 {
		keys, err = getAll(ctx, userKey)
		if err != nil {
			return err
		}
	} else {
		keys, err = getByKeys(ctx, keyKeys, userKey)
		if err != nil {
			return err
		}
	}

	return c.JSON(http.StatusOK, keys)
}

// GetHandler gets a key by id
func GetHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	keyKey, err := datastore.DecodeKey(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Unable to parse id key")
	}

	if !keyKey.Parent().Equal(userKey) {
		return c.NoContent(http.StatusNotFound)
	}

	key := new(Key)
	datastore.Get(ctx, keyKey, key)

	return c.JSON(http.StatusOK, key)
}

// GetPasswordPrivateKeyHandler gets the private key for a users password
func GetPasswordPrivateKeyHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	passwordKey, err := getPasswordPrivateKey(ctx, c.Param("name"), userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, passwordKey)
}

// PostHandler posts a new key
func PostHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	keys := []Key{}
	err := c.Bind(&keys)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Could not parse the request body")
	}

	// fetch all keys to make sure the entry is not a duplicate
	allKeys, err := getAll(ctx, userKey)
	if err != nil {
		return err
	}

	for _, key := range keys {
		// make sure the entry is not a duplicate
		// this is not performant but it shouldnt matter
		for _, k := range allKeys {
			if (k.URL != "" && k.URL == key.URL) || (k.ArmoredKey != "" && k.ArmoredKey == key.ArmoredKey) {
				return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Key is identical to existing key (%s)", k.Name))
			}
		}
	}

	err = Put(ctx, keys, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusCreated, keys)
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

	err = vault.DeleteByKey(ctx, key)
	if err != nil {
		return err
	}

	err = datastore.Delete(ctx, key)
	if err != nil {
		log.Errorf(ctx, "Unable to delete key: %+v", err)
		return err
	}

	return c.String(http.StatusOK, c.Param("id"))
}

// ProxyHandler proxies requests for certs.
// sks-keyservers can either serve over http, or use
// tls certs from an untrusted CA so chrome wont load it.
// Furthermore, urlfetch doesn't let you specify your own
// custom CA certs so we can't even verify sks-keyserver
// requests against their root CA :(
// See https://github.com/GoogleCloudPlatform/python-compat-runtime/pull/124
func ProxyHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	client := urlfetch.Client(ctx)
	resp, err := client.Get(c.QueryParam("url"))
	if err != nil {
		log.Errorf(ctx, "Unable to proxy key req: %+v", err)
		return err
	}
	defer resp.Body.Close()
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "text/plain"
	}
	return c.Stream(resp.StatusCode, contentType, resp.Body)
}

// Put saves keys
func Put(ctx context.Context, keys []Key, userKey *datastore.Key) error {
	keyKeys := []*datastore.Key{}
	for idx, key := range keys {
		// make sure only one of url, armoredKey is filled
		if (key.ArmoredKey != "" && key.URL != "") || (key.ArmoredKey == "" && key.URL == "") {
			return echo.NewHTTPError(http.StatusBadRequest, "Only one of armoredKey and url should be provided")
		}

		// make sure the armored key is valid
		if key.ArmoredKey != "" {
			_, err := armor.Decode(strings.NewReader(key.ArmoredKey))
			if err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, "The provided armored key is not valid")
			}
		}

		if key.Type != public && key.Type != private {
			return errors.New("Key type must be private or public")
		}

		keys[idx].CreatedAt = time.Now()
		keyKeys = append(keyKeys, datastore.NewIncompleteKey(ctx, keyEntityType, userKey))
	}

	var err error
	keyKeys, err = datastore.PutMulti(ctx, keyKeys, keys)
	if err != nil {
		log.Errorf(ctx, "Error putting to keystore: %+v", err)
		return err
	}

	for idx := range keys {
		keys[idx].ID = keyKeys[idx]
	}

	return nil
}

func getAll(ctx context.Context, userKey *datastore.Key) ([]Key, error) {
	keys := []Key{}
	query := datastore.NewQuery(keyEntityType).
		Ancestor(userKey)
	ks, err := query.GetAll(ctx, &keys)
	if err != nil {
		log.Errorf(ctx, "Failed to query for all keys: %+v", err)
		return nil, err
	}

	// use idx to modify the keys instead of copies
	for idx := range keys {
		keys[idx].ID = ks[idx]
	}

	return keys, nil
}

func getByKeys(ctx context.Context, keyKeys []*datastore.Key, userKey *datastore.Key) ([]Key, error) {
	for _, key := range keyKeys {
		if !key.Parent().Equal(userKey) {
			return nil, echo.ErrNotFound
		}
	}

	keys := make([]Key, len(keyKeys))
	err := datastore.GetMulti(ctx, keyKeys, keys)
	if err != nil {
		log.Errorf(ctx, "Failed to query for keys by keys: %+v", err)
		return nil, err
	}

	for idx := range keys {
		keys[idx].ID = keyKeys[idx]
	}

	return keys, nil
}

func getPasswordPrivateKey(ctx context.Context, keyName string, userKey *datastore.Key) (Key, error) {
	var keys []Key
	query := datastore.NewQuery(keyEntityType).
		Filter("Type =", "private").
		Filter("Name =", keyName).
		Filter("Device =", "password").
		Ancestor(userKey)
	ks, err := query.GetAll(ctx, &keys)
	if err != nil {
		log.Errorf(ctx, "Failed to query password key: %+v", err)
		return Key{}, err
	}

	if len(ks) != 1 {
		return Key{}, echo.ErrNotFound
	}

	// use idx to modify the keys instead of copies
	keys[0].ID = ks[0]

	return keys[0], nil
}
