.PHONY: run test fmt lint migrate-up migrate-down seed

DATABASE_URL ?= postgres://nexara:nexara@localhost:5432/nexara_food?sslmode=disable

run:
	DATABASE_URL=$(DATABASE_URL) go run ./cmd/api

test:
	go test -v -race ./...

fmt:
	gofmt -w .
	goimports -w . 2>/dev/null || true

lint:
	golangci-lint run ./...

migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

seed:
	DATABASE_URL=$(DATABASE_URL) go run ./cmd/seed
