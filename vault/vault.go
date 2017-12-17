package vault

import (
	"context"

	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
)

const (
	// LoginPasswordEntryTitle is the title used for entries that contain a user's password to log in
	LoginPasswordEntryTitle = "Login Password"
	entryEntityType         = "entry"
)

// An Entry is just information stored in the vault
type Entry struct {
	Title            string `json:"title"`
	EncryptedMessage []byte `json:"encryptedMessage"`
}

// Put puts a message into the vault
func Put(ctx context.Context, entry *Entry, user *datastore.Key) (*datastore.Key, error) {
	k := datastore.NewIncompleteKey(ctx, entryEntityType, user)
	k, err := datastore.Put(ctx, k, entry)
	if err != nil {
		log.Errorf(ctx, "Error putting to vault: %+v", err)
		return nil, err
	}
	return k, nil
}

// Get gets a message from the vault
func Get(ctx context.Context, key *datastore.Key) (*Entry, error) {
	entry := new(Entry)
	if err := datastore.Get(ctx, key, entry); err != nil {
		log.Errorf(ctx, "Error getting from vault: %+v", err)
		return nil, err
	}
	return entry, nil
}
