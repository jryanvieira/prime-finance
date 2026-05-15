package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port int

	DBPath string

	AccessTokenSecret  string
	RefreshTokenSecret string

	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	AllowedOrigins []string

	CookieSecure bool

	ResendAPIKey string
	MailFrom     string
}

func (c Config) HTTPAddr() string {
	return fmt.Sprintf(":%d", c.Port)
}

func FromEnv() (Config, error) {
	_ = godotenv.Load() // Ignore error if .env doesn't exist

	var cfg Config

	cfg.Port = envInt("PORT", 8080)
	cfg.DBPath = envString("DB_PATH", "dash-fin.sqlite")

	cfg.AccessTokenSecret = envString("ACCESS_TOKEN_SECRET", "")
	cfg.RefreshTokenSecret = envString("REFRESH_TOKEN_SECRET", "")

	cfg.AccessTokenTTL = envDuration("ACCESS_TOKEN_TTL", 15*time.Minute)
	cfg.RefreshTokenTTL = envDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour)

	originsStr := envString("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
	cfg.AllowedOrigins = strings.Split(originsStr, ",")
	for i := range cfg.AllowedOrigins {
		cfg.AllowedOrigins[i] = strings.TrimSpace(cfg.AllowedOrigins[i])
	}

	cfg.CookieSecure = envBool("COOKIE_SECURE", false)

	cfg.ResendAPIKey = envString("RESEND_API_KEY", "")
	cfg.MailFrom = envString("MAIL_FROM", "")

	if cfg.AccessTokenSecret == "" || cfg.RefreshTokenSecret == "" {
		return Config{}, errors.New("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET are required")
	}
	if cfg.AccessTokenTTL <= 0 || cfg.RefreshTokenTTL <= 0 {
		return Config{}, errors.New("token TTLs must be positive")
	}
	return cfg, nil
}

func envString(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}

func envInt(key string, def int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func envBool(key string, def bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func envDuration(key string, def time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return def
	}
	return d
}

