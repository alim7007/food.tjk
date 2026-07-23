# Nexara — Food Delivery

Simple food delivery platform. One admin manages everything. Clients browse restaurants, add food to basket, place orders with delivery address/phone/note. Admin accepts orders, assigns couriers, marks delivered. Couriers see their assigned orders.

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Backend  | Go 1.25, Chi router, pgx, JWT |
| Database | PostgreSQL 16                 |
| Frontend | Next.js 16, React 19, CSS Modules |
| Infra    | Docker Compose                 |

## Quick Start

```bash
make up              # start postgres + backend + frontend
make migrate-up      # create tables
make seed            # insert test data (10 restaurants, 44 foods, 11 users)
open http://localhost:3000
```

## Commands

| Command          | What it does                          |
|------------------|---------------------------------------|
| `make up`        | Build and start all Docker services   |
| `make down`      | Stop everything, delete DB volume     |
| `make reset-db`  | Full reset: down → up → migrate → seed |
| `make logs`      | Tail all Docker logs                  |
| `make test`      | Run Go tests with race detector       |
| `make seed`      | Re-seed database                      |

## Architecture

```
Browser → Next.js :3000 → Chi Router :8080 → Handler → Service → Repository → PostgreSQL
```

### Backend layers

| Layer       | Directory    | Responsibility                        |
|-------------|-------------|---------------------------------------|
| Transport   | `handler/`  | Parse HTTP, validate DTO, call service |
| Business    | `service/`  | Domain logic, validation              |
| Data        | `repository/`| SQL queries via pgx                  |
| Domain      | `model/`    | Plain structs                         |
| Contracts   | `dto/`      | Request/response types                |
| Shared      | `pkg/`      | JWT, middleware                       |

### Database tables (8)

users, refresh_tokens, restaurants, categories, foods, couriers, orders, order_items

### Roles (3)

customer, courier, admin

## API Endpoints (18)

### Public
| Method | Path                        | Purpose              |
|--------|-----------------------------|----------------------|
| GET    | /api/v1/health              | Health check         |
| GET    | /api/v1/restaurants         | List restaurants     |
| GET    | /api/v1/restaurants/:id     | Restaurant detail    |
| GET    | /api/v1/restaurants/:id/foods| Restaurant menu     |
| GET    | /api/v1/categories          | List categories      |
| POST   | /api/v1/auth/register       | Register             |
| POST   | /api/v1/auth/login          | Login                |
| POST   | /api/v1/auth/refresh        | Refresh token        |
| POST   | /api/v1/auth/logout         | Logout               |
| POST   | /api/v1/orders              | Place order (optional auth) |

### Authenticated (any role)
| Method | Path                        | Purpose              |
|--------|-----------------------------|----------------------|
| GET    | /api/v1/orders              | My orders            |
| GET    | /api/v1/orders/:id          | Order detail         |

### Admin only
| Method | Path                              | Purpose              |
|--------|-----------------------------------|----------------------|
| POST   | /api/v1/admin/restaurants         | Add restaurant       |
| PUT    | /api/v1/admin/restaurants/:id     | Update restaurant    |
| DELETE | /api/v1/admin/restaurants/:id     | Delete restaurant    |
| POST   | /api/v1/admin/restaurants/:id/foods| Add food            |
| PUT    | /api/v1/admin/foods/:id           | Update food          |
| DELETE | /api/v1/admin/foods/:id           | Delete food          |
| GET    | /api/v1/admin/orders              | All orders           |
| PUT    | /api/v1/admin/orders/:id/status   | Accept / mark delivered |
| PUT    | /api/v1/admin/orders/:id/assign   | Assign courier       |
| GET    | /api/v1/admin/couriers            | List couriers        |
| POST   | /api/v1/admin/couriers            | Add courier          |

### Courier only
| Method | Path                        | Purpose              |
|--------|-----------------------------|----------------------|
| GET    | /api/v1/courier/orders      | Assigned orders      |

## Frontend Pages (7)

| Route              | Who sees it | Content                                    |
|--------------------|-------------|--------------------------------------------|
| /                  | public      | Restaurant cards with search               |
| /restaurants/:id   | public      | Food list + basket + order form            |
| /login             | public      | Email + password login                     |
| /register          | public      | Registration (name, email, password, phone, address) |
| /orders            | customer    | My orders with status filter               |
| /orders/:id        | customer    | Order detail with 3-step status tracker    |
| /admin             | admin       | Tabs: Orders, Restaurants, Couriers        |
| /courier/orders    | courier     | Assigned orders list                       |

## Order Flow

```
Client places order (pending) → Admin accepts (accepted) → Admin assigns courier → Admin marks delivered
```

Clients can add a free-text note (e.g. "buy bread from market"). Admin calls the client to confirm, calls the courier to deliver.

## Seed Data

- 10 restaurants (Nexara, Bella Napoli, Quick Bite, Sushi Master, Tandoor House, Wok & Roll, Burger House, Dolce Vita, Shawarma King, Green Garden)
- 11 categories, 44 foods
- Admin: admin@nexara.com / pass1234
- 5 customers, 5 couriers — all password: pass1234

## Environment Variables

| Variable                  | Default                                                      |
|---------------------------|--------------------------------------------------------------|
| DATABASE_URL              | postgres://nexara:nexara@localhost:5432/nexara_food?sslmode=disable |
| SERVER_PORT               | 8080                                                         |
| ALLOWED_ORIGINS           | http://localhost:3000                                        |
| JWT_SECRET                | change-me-in-production-use-a-strong-random-secret           |
| JWT_EXPIRY_MINUTES        | 60                                                           |
| JWT_REFRESH_EXPIRY_DAYS   | 7                                                            |
| BCRYPT_COST               | 12                                                           |
| NEXT_PUBLIC_API_URL       | http://localhost:8080/api/v1                                 |
