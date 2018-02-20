package scopes

import (
	"encoding/gob"
)

// Scope represents a level of authorization
type Scope string

const (
	// U2fForRead is a scope with no permissions, used to signify that a user must u2f for read permissions
	U2fForRead Scope = "U2F_FOR_READ"
	// U2fForWrite is a scope with no permissions, used to signify that a user must u2f for write permissions
	U2fForWrite Scope = "U2F_FOR_WRITE"
	// Read marks a user as having permission to read their data
	Read Scope = "READ"
	// Write marks a user as having permission to write to their data
	Write Scope = "WRITE"
)

// gob is used for sessions under the hood, so custom types must be registered
func init() {
	gob.Register(Scope(""))
}
