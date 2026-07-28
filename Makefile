.PHONY: up down restart logs migrate-up migrate-down seed test fmt lint reset-db update-backend update-frontend clean

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

clean:
	docker compose down -v --rmi all
	docker image prune -f

update-backend:
	docker compose up -d --no-deps --build backend

update-frontend:
	docker compose up -d --no-deps --build frontend

logs:
	docker compose logs -f

DB_URL_INTERNAL := postgres://nexara:nexara@postgres:5432/nexara_food?sslmode=disable

migrate-up:
	docker compose run --rm --no-deps backend migrate -path /app/migrations -database "$(DB_URL_INTERNAL)" up

migrate-down:
	docker compose run --rm --no-deps backend migrate -path /app/migrations -database "$(DB_URL_INTERNAL)" down 1

seed:
	docker compose run --rm --no-deps -e DATABASE_URL="$(DB_URL_INTERNAL)" backend go run ./cmd/seed

test:
	docker compose run --rm --no-deps -e DATABASE_URL="$(DB_URL_INTERNAL)" backend go test -v -race ./...

fmt:
	cd backend && gofmt -w . && goimports -w . 2>/dev/null || gofmt -w .

lint:
	cd backend && golangci-lint run ./...

reset-db: down up
	$(MAKE) migrate-up
	$(MAKE) seed
