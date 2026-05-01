package paymentmethod

import "errors"

var (
	ErrPaymentMethodNotFound = errors.New("payment method not found")
	ErrEmptyLabel            = errors.New("label cannot be empty")
	ErrEmptyType             = errors.New("type cannot be empty")
)
