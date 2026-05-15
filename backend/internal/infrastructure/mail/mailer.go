package mail

import "context"

type Message struct {
	To      string
	Subject string
	HTML    string
}

type Mailer interface {
	Send(ctx context.Context, msg Message) error
}

// NoopMailer descarta todos os emails silenciosamente (útil para dev/test).
type NoopMailer struct{}

func (NoopMailer) Send(_ context.Context, _ Message) error { return nil }
