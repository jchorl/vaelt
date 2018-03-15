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
	entryEntityType = "entry"
)

// An Entry is just information stored in the vault
type Entry struct {
	Title            string         `json:"title"`
	EncryptedMessage string         `json:"encryptedMessage"`
	Version          int            `json:"version"`
	Key              *datastore.Key `json:"key" datastore:"-"`
	Created          time.Time      `json:"created"`
}

// PostHandler posts to vault
func PostHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	entries := []Entry{}
	if err := c.Bind(&entries); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Unable to unmarshal the request body")
	}

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	_, err := put(ctx, entries, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusCreated, entries)
}

// GetAllHandler gets all items from vault
func GetAllHandler(c echo.Context) error {
	ctx := appengine.NewContext(c.Request())

	userKey, ok := sessions.GetUserKeyFromContext(c)
	if !ok {
		return errors.New("Could not get user key from context")
	}

	entries, err := getAll(ctx, userKey)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, entries)
}

func put(ctx context.Context, entries []Entry, userKey *datastore.Key) ([]*datastore.Key, error) {
	// make sure the titles are all the same
	if len(entries) == 0 {
		return nil, errors.New("Cant put no entries")
	}
	title := entries[0].Title
	for _, entry := range entries {
		if entry.Title != title {
			return nil, errors.New("All entries must have the same title")
		}
	}

	// get existing entries to bump the version
	existing, err := GetByTitle(ctx, title, userKey)
	if err != nil {
		return nil, err
	}

	nextVersion := 1
	for _, entry := range existing {
		if entry.Version >= nextVersion {
			nextVersion = entry.Version + 1
		}
	}
	keys := []*datastore.Key{}
	for idx := range entries {
		if !entries[idx].Key.Parent().Equal(userKey) {
			return nil, errors.New("Key must be the id of a key owned by you")
		}

		entries[idx].Version = nextVersion
		entries[idx].Created = time.Now()
		keys = append(keys, datastore.NewIncompleteKey(ctx, entryEntityType, entries[idx].Key))
	}

	keys, err = datastore.PutMulti(ctx, keys, entries)
	if err != nil {
		log.Errorf(ctx, "Error putting to vault: %+v", err)
		return nil, err
	}

	return keys, nil
}

// GetByTitle gets all vault entries with a given title
func GetByTitle(ctx context.Context, title string, userKey *datastore.Key) ([]Entry, error) {
	entries := []Entry{}
	query := datastore.NewQuery(entryEntityType).
		Filter("Title =", title).
		Ancestor(userKey)
	keys, err := query.GetAll(ctx, &entries)
	if err != nil {
		log.Errorf(ctx, "Unable to get by title: %+v", err)
		return nil, err
	}

	for idx := range entries {
		entries[idx].Key = keys[idx].Parent()
	}

	return entries, nil
}

func getAll(ctx context.Context, userKey *datastore.Key) ([]Entry, error) {
	entries := []Entry{}
	query := datastore.NewQuery(entryEntityType).
		Ancestor(userKey)
	keys, err := query.GetAll(ctx, &entries)
	if err != nil {
		log.Errorf(ctx, "Unable to get all: %+v", err)
		return nil, err
	}

	for idx := range entries {
		entries[idx].Key = keys[idx].Parent()
	}

	return entries, nil
}

// DeleteByKey deletes all entries encrypted by a specific key
func DeleteByKey(ctx context.Context, key *datastore.Key) error {
	query := datastore.NewQuery(entryEntityType).
		KeysOnly().
		Ancestor(key)
	keys, err := query.GetAll(ctx, nil)
	if err != nil {
		log.Errorf(ctx, "Unable to get all vault entries by key: %+v", err)
		return err
	}

	err = datastore.DeleteMulti(ctx, keys)
	if err != nil {
		log.Errorf(ctx, "Unable to delete all vault entries by key: %+v", err)
		return err
	}

	return nil
}
