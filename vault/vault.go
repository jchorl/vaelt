package vault

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"

	"auth/sessions"
)

const (
	// LoginPasswordEntryTitle is the title used for entries that contain a user's password to log in
	LoginPasswordEntryTitle = "Vaelt Login Password"
	entryEntityType         = "entry"
)

// An Entry is just information stored in the vault
type Entry struct {
	Title            string    `json:"title"`
	EncryptedMessage []byte    `json:"encryptedMessage"`
	Version          int       `json:"version"`
	Domain           string    `json:"domain,omitempty"`
	Created          time.Time `json:"created"`
}

// PostHandler posts to vault
func PostHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	entry := new(Entry)
	if err := c.Bind(entry); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err)
	}

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	_, err := Put(ctx, entry, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusCreated, entry)
}

// GetHandler retrieves entities from the vault, either based on an id or title query param
func GetHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	vaultKeyEncoded := c.Param("id")
	var entries []Entry
	if vaultKeyEncoded != "" {
		vaultKey, err := datastore.DecodeKey(vaultKeyEncoded)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err)
		}

		entry, err := Get(ctx, vaultKey, userKey)
		if err != nil {
			return err
		}

		if entry != nil {
			entries = []Entry{*entry}
		}
	} else {
		title := c.Param("title")
		if title == "" {
			return c.NoContent(http.StatusBadRequest)
		}
		var err error
		entries, err = getByTitle(ctx, title, userKey)
		if err != nil {
			return err
		}
	}

	if len(entries) == 0 {
		return echo.NewHTTPError(http.StatusNotFound)
	}

	return c.JSON(http.StatusOK, entries)
}

// GetAllHandler retrieves all of a user's entities from the vault
func GetAllHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())
	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	entries, err := GetAll(ctx, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, entries)
}

// Put puts an entry into the vault
func Put(ctx context.Context, entry *Entry, user *datastore.Key) (*datastore.Key, error) {
	// first get existing entries to bump the version
	existing, err := getByTitle(ctx, entry.Title, user)
	if err != nil {
		return nil, err
	}

	nextVersion := len(existing) + 1
	entry.Version = nextVersion

	k := datastore.NewIncompleteKey(ctx, entryEntityType, user)
	entry.Created = time.Now()
	k, err = datastore.Put(ctx, k, entry)
	if err != nil {
		log.Errorf(ctx, "Error putting to vault: %+v", err)
		return nil, err
	}

	return k, nil
}

// Get gets an entry from the vault
func Get(ctx context.Context, key *datastore.Key, userKey *datastore.Key) (*Entry, error) {
	if !key.Parent().Equal(userKey) {
		return nil, nil
	}
	entry := new(Entry)
	if err := datastore.Get(ctx, key, entry); err != nil {
		log.Errorf(ctx, "Error getting from vault: %+v", err)
		return nil, err
	}
	return entry, nil
}

// GetAll gets all entries for a user
func GetAll(ctx context.Context, userKey *datastore.Key) ([]Entry, error) {
	var entries []Entry
	query := datastore.NewQuery(entryEntityType).
		Ancestor(userKey)
	_, err := query.GetAll(ctx, &entries)
	if err != nil {
		log.Errorf(ctx, "Failed to query for all entries: %+v", err)
		return nil, err
	}

	return entries, nil
}

func getByTitle(ctx context.Context, title string, userKey *datastore.Key) ([]Entry, error) {
	var entries []Entry
	query := datastore.NewQuery(entryEntityType).
		Filter("Title =", title).
		Ancestor(userKey)
	_, err := query.GetAll(ctx, &entries)
	if err != nil {
		log.Errorf(ctx, "Failed to get entries: %+v", err)
		return nil, err
	}

	return entries, nil
}
