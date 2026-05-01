package user

import (
	"regexp"
	"strings"
)

// Email is a Value Object representing a valid email address.
type Email struct {
	value string
}

var emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)

// NewEmail creates a new Email Value Object. It returns an error if the format is invalid.
func NewEmail(address string) (Email, error) {
	address = strings.ToLower(strings.TrimSpace(address))
	if !emailRegex.MatchString(address) {
		return Email{}, ErrInvalidEmail
	}
	return Email{value: address}, nil
}

// String returns the string representation of the email.
func (e Email) String() string {
	return e.value
}
