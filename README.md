# Kulhad & Kaapi (चाय · कॉफी) — Full-Stack Indian Tea & Coffee Café Platform

A complete, production-ready full-stack Indian Tea (Chai) & Coffee e-commerce and café management platform. **Exclusively sells Tea & Coffee** (12 traditional Indian Chai varieties & 10 Indian Coffee varieties) with zero food clutter.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, `qrcode`
- **Backend**: Node.js + Express 5 REST API, Helmet security headers, Express Rate Limiting, Server-Sent Events (SSE) for real-time order updates
- **Database**: ACID SQLite (`better-sqlite3`) with SQL migrations (`server/migrations/001_initial_schema.sql`) + PostgreSQL-ready Prisma schema (`prisma/schema.prisma`)
- **Security**: Salted `scrypt` password hashing, HMAC-SHA256 signed JWT tokens, Role-Based Access Control (`customer`, `staff`, `owner`), server-side cart/coupon/tax calculation, Razorpay HMAC payment signature verification

## Quick Start & Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment configuration
cp .env.example .env

# 3. Build frontend production bundle
npm run build

# 4. Start full-stack Express + SQLite server (serves API + frontend on http://localhost:4000)
node server/index.mjs
```

### Development Mode (Two Terminals)
```bash
# Terminal 1: Start Express API + SQLite backend on port 4000
node server/index.mjs

# Terminal 2: Start Vite React dev server
npm run dev
```

## Demo Credentials (Pre-Seeded)
- **Admin Dashboard** (`Admin` button in navbar or `Ctrl+Shift+A`):
  - Email: `admin@kulhadkaapi.in`
  - Password: `chai2026`
- **Verified Customer Account** (`Account` button in navbar):
  - Email: `ananya@studio.in`
  - Password: `chai1234`
- **Active Promo Coupons**: `FIRSTCHAI` (20% off first order), `FESTIVAL20` (20% festival offer), `KAAPI50` (₹50 off ₹220+)

## Payment Gateway Configuration (Razorpay)
By default, Razorpay runs in **explicit Sandbox Test Mode** so developers can test payment verification, failure handling, and refunds safely without charging cards.
To enable **Live Razorpay Payments**, configure these environment variables in `.env`:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (Webhook endpoint: `POST /api/payments/webhook`)

## Core API Endpoints
- `GET /api/health` — Service & SQLite database health
- `GET /api/events` — Real-time Server-Sent Events (SSE) stream
- `GET /api/storefront` — Sanitized storefront catalog, coupons, reviews, hours & branding
- `GET /api/products/search` — Search by name/Hindi/ingredient + hot/cold/price/sort filters
- `POST /api/auth/register`, `POST /api/auth/customer/login`, `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/customer/me`, `PUT /api/customer/profile`, `POST /api/customer/addresses`, `PUT /api/cart`
- `POST /api/cart/quote` — Server-side subtotal, coupon, loyalty redemption, GST & delivery quote
- `POST /api/orders`, `GET /api/orders/:orderNumber`, `POST /api/payments/verify`, `POST /api/payments/webhook`
- `GET /api/reviews/:productId`, `POST /api/reviews` (verified purchasers only), `POST /api/reviews/:id/report`
- `POST /api/support` — Customer support ticket creation
- **Admin RBAC Routes** (`/api/admin/*`): State snapshot, Analytics (`daily/weekly/monthly/yearly`), Settings (Timings/GST/Delivery/Brand/Logo), Menu CRUD & Reorder, Orders & Refunds, Inventory Adjustments, Coupons CRUD, Review Moderation, Support Inbox, Notifications, Reset.

## Production Deployment Notes
1. Set strong `AUTH_TOKEN_SECRET`, `DEFAULT_ADMIN_PASSWORD`, and `NODE_ENV=production` in `.env`.
2. For PostgreSQL deployment, configure `DATABASE_URL` and run Prisma migrations against `prisma/schema.prisma`.
3. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` before accepting live payments.
4. Build static assets with `npm run build` and launch with `PORT=4000 node server/index.mjs` behind Nginx/Caddy HTTPS reverse proxy.
