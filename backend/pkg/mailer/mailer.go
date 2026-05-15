package mailer

import (
	"context"
	"errors"
)

var ErrSendFailed = errors.New("mailer: send failed")

type Mailer interface {
	Send(ctx context.Context, to, subject, htmlBody string) error
}
