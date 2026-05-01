package user

import "strings"

// NormalizeEmail normalizes an email address for comparison.
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
