# Nexara/Zudras Food — Continuation Notes

## Current State (Session End: Aug 2026)

### What's Working in Production
- Full food delivery app running on DigitalOcean VPS at nexaraandme.com
- Dark yellow-themed customer UI (mobile-first)
- Dark yellow admin panel with sidebar navigation
- SSE real-time order notifications (toast in admin browser)
- Telegram bot notifications for new orders
- Cancel order functionality (pending + accepted → cancelled)
- User profile dropdown (address/phone saved to localStorage)
- Uploads bind-mounted to host filesystem (survives Docker destruction)

### What's NOT Working / Needs Fixing

1. **Telegram bot — wrong bot**
   The token `8827782282:AAH3smz_oeGONdBZQZve-fyyhmqktVzRN8I` sends to whatever bot was created.
   Need to create a fresh bot via @BotFather:
   ```
   /newbot → "Zudras Orders" → "zudrasorders_bot"
   ```
   Then update TELEGRAM_BOT_TOKEN in .env and .env.prod, get new chat_id.

2. **Browser SSE — dashboard auto-refresh only on Overview page**
   The `useSSEVersion()` hook only triggers re-fetch on `/admin` (dashboard).
   If admin is on `/admin/orders` page, the toast appears but the order list doesn't auto-refresh.
   Need to add `useSSEVersion()` to the orders list page too.

3. **Multiple Telegram recipients**
   Currently only one TELEGRAM_CHAT_ID. For multiple admins, either:
   - Create a Telegram group, add bot + all admins, use group chat_id (zero code changes)
   - Or change TELEGRAM_CHAT_ID to comma-separated, loop through all (5 lines of Go)

### Project Structure
```
food.tjk/
├── backend/           Go 1.25 + Chi router
│   ├── cmd/api/       Entry point
│   ├── cmd/seed/      Database seeder
│   ├── internal/
│   │   ├── config/    Env config (caarlos0/env)
│   │   ├── database/  PostgreSQL pool
│   │   ├── dto/       Request/response structs
│   │   ├── handler/   HTTP handlers (auth, order, restaurant, food, courier, upload, sse)
│   │   ├── model/     Domain models + state machine
│   │   ├── notify/    Telegram bot (telegram.go)
│   │   ├── pkg/jwt/   JWT generation/validation
│   │   ├── pkg/middleware/  Auth middleware (RequireAuth, RequireRole, OptionalAuth)
│   │   ├── repository/  Database queries (pgx)
│   │   ├── server/    Router setup (routes.go, server.go)
│   │   ├── service/   Business logic
│   │   └── sse/       SSE hub (hub.go)
│   ├── migrations/    000001_init.up.sql
│   ├── uploads/       Seed images
│   ├── Dockerfile     Dev (air hot-reload)
│   └── Dockerfile.prod  Production (multi-stage, alpine)
├── frontend/          Next.js 16 + React 19
│   ├── app/
│   │   ├── layout.tsx        Root layout (AuthProvider + I18nProvider)
│   │   ├── page.tsx          Homepage (restaurant cards)
│   │   ├── login/            Login form
│   │   ├── register/         Registration form
│   │   ├── orders/           Customer orders list
│   │   ├── orders/[id]/      Order detail + cancel button
│   │   ├── restaurants/[id]/ Restaurant menu + food grid + product modal
│   │   ├── restaurants/[id]/basket/  Dedicated basket screen
│   │   ├── admin/            Dashboard (overview)
│   │   ├── admin/layout.tsx  Admin shell (sidebar + SSE EventSource)
│   │   ├── admin/orders/     Orders table + filters
│   │   ├── admin/orders/[id]/ Order detail + actions
│   │   ├── admin/restaurants/ Restaurant CRUD
│   │   ├── admin/menu/       Food management
│   │   └── admin/couriers/   Courier management
│   ├── components/
│   │   ├── layout/    Header, Container
│   │   ├── ui/        ProductModal, Skeleton, Button
│   │   └── admin/     AdminLayout, Toast, ConfirmDialog, admin-vars.css
│   ├── lib/
│   │   ├── api.ts     All HTTP calls
│   │   ├── auth.tsx   Auth context
│   │   ├── basket.ts  Cart logic (localStorage)
│   │   ├── i18n.tsx   Translations (tj/ru/en)
│   │   ├── image.ts   Image URL helper
│   │   ├── profile.ts User profile storage (localStorage)
│   │   ├── types.ts   TypeScript interfaces
│   │   ├── validation.ts  Form validation
│   │   └── translations/  tj.json, ru.json, en.json
│   ├── styles/        variables.css, shared.module.css
│   ├── Dockerfile     Dev
│   └── Dockerfile.prod  Production (multi-stage, standalone)
├── nginx/
│   ├── nginx.conf     SSL + reverse proxy + SSE location
│   └── certs/         origin.pem, origin.key (gitignored)
├── uploads/           Bind-mounted uploads (gitignored)
├── docker-compose.yml       Dev (3 services)
├── docker-compose.prod.yml  Production (4 services: postgres + backend + frontend + nginx)
├── Makefile                  Dev + prod commands
├── .env.prod.example        Production env template
├── DEPLOY.md                Deployment guide
└── .gitignore
```

### Key Commands
```
make up                    Start dev
make up-prod               Start production
make update-prod-backend   Deploy backend changes
make update-prod-frontend  Deploy frontend changes
make migrate-prod          Run migrations
make seed-prod             Seed database
```

### Design System
```
Customer app:  Dark (#0a0a0a bg, #1a1a1a surface, #eab308 yellow primary)
Admin panel:   Dark (#0a0a0a bg, #141414 surface, #eab308 yellow primary)
Currency:      TJS (сомони)
Brand:         Zudras
```

### Order State Machine
```
pending → accepted → delivered
pending → cancelled
accepted → cancelled
```

### API Endpoints (admin-only SSE)
```
GET /api/v1/admin/orders/events   SSE stream (no timeout, admin auth)
```

### .env.prod Required Variables
```
DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
DOMAIN, DOMAIN_WWW
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

### Next Steps (Priority Order)
1. Fix Telegram bot token (create new bot, update .env.prod)
2. Add SSE auto-refresh to /admin/orders page
3. Consider Telegram group for multiple admins
4. Add sound notification for new orders (optional)
5. Add browser notification API as fallback (optional)
