package keystore

import (
	"context"
	"errors"

	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
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
}

// Put saves a key
func Put(ctx context.Context, key *Key, userKey *datastore.Key) (*datastore.Key, error) {
	if key.URL == "" && key.ArmoredKey == "" {
		return nil, errors.New("One of URL and ArmoredKey must be provided")
	}

	if key.Type != public && key.Type != private {
		return nil, errors.New("Key type must be private or public")
	}

	k := datastore.NewIncompleteKey(ctx, keyEntityType, userKey)
	k, err := datastore.Put(ctx, k, key)
	if err != nil {
		log.Errorf(ctx, "Error putting to keystore: %+v", err)
		return nil, err
	}

	key.ID = k

	return k, nil
}
