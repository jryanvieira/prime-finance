package timeutil

import "time"

// Clock is an interface for time operations, allowing for mocking in tests.
type Clock interface {
	Now() time.Time
}

// RealClock implements Clock using the standard time package.
type RealClock struct{}

func (c RealClock) Now() time.Time {
	return time.Now().UTC()
}

// fixedClock returns a fixed time — useful in tests.
type fixedClock struct{ t time.Time }

func (c fixedClock) Now() time.Time { return c.t }

func FixedClock(t time.Time) Clock { return fixedClock{t} }
