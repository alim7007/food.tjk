package config

import "github.com/caarlos0/env/v11"

type Config struct {
	DatabaseURL          string `env:"DATABASE_URL,required"`
	ServerPort           string `env:"SERVER_PORT" envDefault:"8080"`
	ReadTimeout          string `env:"SERVER_READ_TIMEOUT" envDefault:"15s"`
	WriteTimeout         string `env:"SERVER_WRITE_TIMEOUT" envDefault:"15s"`
	AllowedOrigins       string `env:"ALLOWED_ORIGINS" envDefault:"http://localhost:3000"`
	JWTSecret            string `env:"JWT_SECRET,required"`
	JWTExpiryMinutes     int    `env:"JWT_EXPIRY_MINUTES" envDefault:"60"`
	JWTRefreshExpiryDays int    `env:"JWT_REFRESH_EXPIRY_DAYS" envDefault:"7"`
	BcryptCost           int    `env:"BCRYPT_COST" envDefault:"12"`
}

func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, err
	}
	return cfg, nil
}
