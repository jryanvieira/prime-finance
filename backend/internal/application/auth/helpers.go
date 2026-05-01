package auth

import "time"

// timeNow returns the current UTC time. Extracted for testability.
func timeNow() time.Time {
	return time.Now().UTC()
}
