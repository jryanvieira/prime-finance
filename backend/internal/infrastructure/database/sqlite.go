package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// OpenOptions configures the SQLite database connection.
type OpenOptions struct {
	Path string
}

// Open opens a SQLite database connection.
func Open(ctx context.Context, opt OpenOptions) (*sql.DB, error) {
	db, err := sql.Open("sqlite", fmt.Sprintf("file:%s?_pragma=busy_timeout(5000)", opt.Path))
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(0)
	db.SetConnMaxIdleTime(0)

	pctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if _, err := db.ExecContext(pctx, `PRAGMA foreign_keys = ON;`); err != nil {
		_ = db.Close()
		return nil, err
	}
	if _, err := db.ExecContext(pctx, `PRAGMA journal_mode = WAL;`); err != nil {
		_ = db.Close()
		return nil, err
	}
	if _, err := db.ExecContext(pctx, `PRAGMA synchronous = NORMAL;`); err != nil {
		_ = db.Close()
		return nil, err
	}

	if err := db.PingContext(pctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}
