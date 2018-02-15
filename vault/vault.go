package vault

import (
	"context"
	"net/http"

	"github.com/labstack/echo"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"github.com/jchorl/passwords/util"
)

const (
	// LoginPasswordEntryTitle is the title used for entries that contain a user's password to log in
	LoginPasswordEntryTitle = "Login Password"
	entryEntityType         = "entry"
)

// An Entry is just information stored in the vault
type Entry struct {
	ID               *datastore.Key `json:"id",datastore:"__key__"`
	Title            string         `json:"title"`
	EncryptedMessage []byte         `json:"encryptedMessage"`
	Domain           string         `json:"domain,omitempty"`
}

// PostHandler posts to vault
func PostHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	entry := new(Entry)
	if err := c.Bind(entry); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err)
	}

	userKey, err := util.GetUserKeyFromContext(c)
	if err != nil {
		return err
	}

	_, err = Put(ctx, entry, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusCreated, entry)
}

// GetHandler retrieves a single entity from vault
func GetHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	vaultKeyEncoded := c.Param("id")
	vaultKey, err := datastore.DecodeKey(vaultKeyEncoded)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err)
	}

	entry, err := Get(ctx, vaultKey)
	if err != nil {
		return err
	}

	if entry == nil {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	// make sure that user owns the vault entity
	userKey, err := util.GetUserKeyFromContext(c)
	if err != nil {
		return err
	}

	if !vaultKey.Parent().Equal(userKey) {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	return c.JSON(http.StatusOK, entry)
}

// GetAllHandler retrieves all of a user's entities from the vault
func GetAllHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, err := util.GetUserKeyFromContext(c)
	if err != nil {
		return err
	}

	entries, err := GetAll(ctx, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, entries)
}

// Put puts an entry into the vault
func Put(ctx context.Context, entry *Entry, user *datastore.Key) (*datastore.Key, error) {
	k := datastore.NewIncompleteKey(ctx, entryEntityType, user)
	k, err := datastore.Put(ctx, k, entry)
	if err != nil {
		log.Errorf(ctx, "Error putting to vault: %+v", err)
		return nil, err
	}

	entry.ID = k
	return k, nil
}

// Get gets an entry from the vault
func Get(ctx context.Context, key *datastore.Key) (*Entry, error) {
	entry := new(Entry)
	if err := datastore.Get(ctx, key, entry); err != nil {
		log.Errorf(ctx, "Error getting from vault: %+v", err)
		return nil, err
	}
	return entry, nil
}

// GetAll gets all entries for a user
func GetAll(ctx context.Context, userKey *datastore.Key) ([]*Entry, error) {
	var entries []*Entry
	query := datastore.NewQuery(entryEntityType).
		Ancestor(userKey)
	_, err := query.GetAll(ctx, &entries)
	if err != nil {
		log.Errorf(ctx, "Failed to query for all entries: %+v", err)
		return nil, err
	}

	return entries, nil
}
