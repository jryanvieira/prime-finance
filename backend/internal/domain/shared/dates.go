package shared

import (
	"errors"
	"time"
)

const (
	DateLayout  = "2006-01-02"
	MonthLayout = "2006-01"
)

func ParseDate(s string) (time.Time, error) {
	return time.Parse(DateLayout, s)
}

func ParseMonth(s string) (time.Time, error) {
	return time.Parse(MonthLayout, s)
}

func MustFormatDate(t time.Time) string {
	return t.Format(DateLayout)
}

func MustFormatMonth(t time.Time) string {
	return t.Format(MonthLayout)
}

func AddMonthsKeepingDay(d time.Time, months int) time.Time {
	y, m, day := d.Date()
	loc := d.Location()
	target := time.Date(y, m+time.Month(months), 1, 0, 0, 0, 0, loc)
	lastDay := daysInMonth(target.Year(), target.Month(), loc)
	if day > lastDay {
		day = lastDay
	}
	return time.Date(target.Year(), target.Month(), day, 0, 0, 0, 0, loc)
}

func DateForMonthDay(month time.Time, day int) (time.Time, error) {
	if day < 1 || day > 31 {
		return time.Time{}, errors.New("invalid day")
	}
	y, m, _ := month.Date()
	loc := month.Location()
	lastDay := daysInMonth(y, m, loc)
	if day > lastDay {
		day = lastDay
	}
	return time.Date(y, m, day, 0, 0, 0, 0, loc), nil
}

func StartEndOfMonth(month time.Time) (from string, to string) {
	y, m, _ := month.Date()
	loc := month.Location()
	start := time.Date(y, m, 1, 0, 0, 0, 0, loc)
	end := time.Date(y, m+1, 0, 0, 0, 0, 0, loc)
	return start.Format(DateLayout), end.Format(DateLayout)
}

func daysInMonth(year int, month time.Month, loc *time.Location) int {
	// day 0 of next month is last day of current month
	t := time.Date(year, month+1, 0, 0, 0, 0, 0, loc)
	return t.Day()
}

func DaysBetween(d1, d2 time.Time) int {
	diff := d1.Sub(d2).Hours() / 24.0
	if diff < 0 {
		diff = -diff
	}
	return int(diff)
}
