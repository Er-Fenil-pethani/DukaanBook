# DukaanBook

> Multi-cashier Point-of-Sale and Inventory Management system for small businesses. Atomic sale operations with row-level locking, advisory-lock-based sale numbering for concurrency-safe daily sequences, complete audit trail, thermal-printer-ready receipts, and a polished emerald-accented UI. Built with React, TypeScript, Node.js, Express, PostgreSQL, and Prisma.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 About

DukaanBook is a production-grade point-of-sale and inventory management system designed for small businesses — retail shops, kirana stores, restaurants, electronics shops. It handles the core operational realities of a real retail counter: multiple cashiers ringing up simultaneous transactions without overselling stock, sequential daily sale numbers for tax reconciliation, atomic stock movements with reason codes, refunds that restore inventory, and a complete audit trail capturing every action with the actor's IP. The frontend uses an emerald accent (distinct visual identity tied to the money/transactions domain), dark mode default, Geist Sans/Mono typography, and a categorized sidebar — designed to feel like a real cashier tool, not a generic admin panel.

This isn't a tutorial-grade POS — it's built with the concurrency safety, audit discipline, and operational realism that distinguish business tools from CRUD demos.

---

## ✨ Features

### Authentication & Roles
- 🔐 JWT-based authentication with 7-day tokens
- 👥 Two roles: OWNER (full admin) and CASHIER (POS + own sales only)
- 🚫 Suspended account enforcement — instant 403 on any request
- 🌱 Owner-seeded setup — no public registration, idempotent seed script
- 🚦 Rate-limited login (5 attempts / 15 min / IP) with per-route counters

### Owner Capabilities
- 📊 Live dashboard with today's revenue, sales count, low-stock count, total stock value, 7-day revenue chart, top-5 selling products
- 📦 Full product CRUD with image upload (Multer + Sharp), SKU, optional barcode, category assignment, low-stock threshold per product
- 🏷️ Category management with referential integrity (deletion blocked when products exist)
- 👨‍💼 Staff management — add cashiers, suspend/unsuspend, delete
- ⚙️ Business settings — name, address, currency (PKR/SAR/USD/EUR/AED), tax rate, logo upload
- 📈 Sales reporting with date/cashier/payment-method/status filters
- 📜 Audit log viewer with every mutation tracked

### POS Counter (Cashier + Owner)
- ⚡ Fast product search debounced 200ms — searches name + SKU + barcode simultaneously
- ⌨️ Keyboard shortcuts — `/` focuses search, `Esc` clears, optimized for tablet/keyboard flow
- 🛒 Real-time cart with instant total calculation, tax breakdown, quantity steppers
- 💰 Payment methods: Cash or Card (UI-level, integration-ready)
- 🧾 Print-ready 80mm thermal receipts with print-media CSS
- 🔢 Sequential daily sale numbers in format `S-YYYYMMDD-NNNNN` generated transactionally
- ⛔ Stock-aware UI — out-of-stock products grayed out, quantity steppers cap at available stock
- ↩️ Refund workflow — same-day own-sale refunds for cashiers, any-time refunds for owners

### Inventory & Stock
- 📊 Real-time stock tracking with atomic `SELECT ... FOR UPDATE` locking on sale completion
- 🔄 Typed stock movements (PURCHASE/SALE/RETURN/ADJUSTMENT/DAMAGE) with reason, actor, and timestamp
- ⚠️ Configurable low-stock thresholds per product
- 🔁 Auto-restore on refund — stock movements created with audit trail

### Visual Identity
- 🌑 Dark mode default with smooth light-mode toggle
- 🟢 Emerald-500 accent (psychologically appropriate for money/transactions)
- 🔤 Geist Sans (UI) + Geist Mono (SKUs, sale numbers, timestamps) self-hosted via @fontsource
- 📐 Generous whitespace, custom card components, micro-interactions
- 🗂️ Categorized sidebar (Overview / Operations / Management) with section headers
- 💀 Skeleton loaders with shimmer matching exact layout
- 🟢 Top progress bar for route changes and TanStack mutations

---

## 💡 Design Decisions

### Why `SELECT FOR UPDATE` on sale completion

A POS system runs on a critical assumption: stock cannot oversell. Two cashiers ringing up the last unit of an item simultaneously would corrupt inventory without proper locking. Sale completion runs inside a transaction that row-locks each product, validates stock, decrements atomically, creates the Sale + SaleItem + StockMovement rows, and commits — all-or-nothing. Failed validation rolls back cleanly; partial sales don't exist.

### Why atomic sale completion combines row-level locking and advisory transaction locks

`SELECT FOR UPDATE` solves stock contention (row-level), but generating the daily sale number (`S-YYYYMMDD-NNNNN`) requires a separate guarantee — two cashiers ringing up simultaneously must get different sequential numbers, not duplicates. A row lock on Products doesn't help here because the contention is on a counter, not a row. The pattern: `pg_advisory_xact_lock(YYYYMMDD::int8)` at the start of the transaction, scoped to the current day. Released automatically on commit or rollback. This serializes sale-number generation across cashiers without locking unrelated rows or requiring SERIALIZABLE isolation level. The combination — row locks for stock, advisory lock for sale number — is precise about what's actually contended.

### Why snapshot product name and price in SaleItem

Receipts and historical reports must remain accurate even after products are deleted or repriced. `SaleItem.productName` and `productPrice` are denormalized at sale time. Reprinting a 6-month-old receipt shows the price the customer actually paid, not the current price. Same pattern used in production systems like Shopify, Stripe, and Square.

### Why no public registration

A real shop's POS isn't a sign-up form — the owner is provisioned once during setup, and only the owner creates cashiers. This eliminates an entire class of security concerns (account farming, spam registrations) and reflects how POS systems actually deploy. The seed script is idempotent: running it twice doesn't duplicate.

### Why strict port binding (`strictPort: true`)

Vite's default behavior is to fall back to the next available port if 3000 is taken. That silent fallback creates configuration drift — the frontend talks to backend on a port the dev didn't realize had changed. `strictPort` fails loudly when the port is taken, which is easier to debug than figuring out which port your services accidentally landed on.

### Why per-route rate limiting (not shared)

A shared rate-limit counter across `/auth/login` and other endpoints means an attacker hammering registrations can lock out legitimate logins from the same IP. Independent counters keep failure modes isolated. Discovered as a real bug during acceptance testing — fixed and codified.

### Why audit log captures IP at action time

For after-the-fact incident investigation. If a staff member's account is compromised, the audit log shows whether the suspicious actions came from the usual IP or a new one. Trivial to add at the middleware layer, invaluable when something goes wrong.

### Why monotonic daily sale numbers

Sequential numbers within a day are required by some tax authorities and make reconciliation trivial. The format `S-20260524-00001` is human-readable, sortable, and obviously a sale identifier. Generated atomically inside the sale transaction (with the advisory lock above) to prevent gaps or duplicates under concurrency.

### Why emerald accent instead of default

Each project in my portfolio has a distinct color identity tied to its domain — POS uses emerald because the domain is money and transaction success. Stripe, Square, and Foodics use green-tones for transaction success states; the convention has psychological weight. The "Complete Sale" button in emerald subtly encourages the cashier action (green = go). Color isn't decoration, it's communication.

---

## 🛠️ Tech Stack

### Backend
| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Language | TypeScript (strict) |
| Framework | Express.js |
| Database | PostgreSQL 14+ |
| ORM | Prisma 6.x |
| Auth | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Validation | Zod |
| File Upload | Multer 2.x |
| Image Processing | Sharp |
| Rate Limiting | express-rate-limit |
| Logging | Winston |
| Testing | Jest + supertest |

### Frontend
| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Language | TypeScript (strict) |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives) |
| Data Fetching | TanStack Query v5 |
| State Management | Zustand |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | lucide-react |
| Fonts | @fontsource/geist-sans, @fontsource/geist-mono |
| Notifications | react-hot-toast |

---

## 🏗️ Architecture

```
┌──────────────────┐         ┌──────────────────┐
│  React + Vite    │◄────────│  Express API     │
│  (Owner UI +     │  HTTPS  │  (port 5000)     │
│   POS Counter)   │────────►│  + JWT Auth      │
│  port 3000       │         │  + Rate Limit    │
└──────────────────┘         └──────────┬───────┘
                                        │
                                        │ Prisma 6
                                        ▼
                              ┌──────────────────┐
                              │   PostgreSQL     │
                              │   8 models       │
                              │   + indexes      │
                              └──────────────────┘
```

**Sale completion flow:**
1. POS cart submitted with items + payment method
2. Backend opens transaction
3. `pg_advisory_xact_lock(YYYYMMDD)` — serialize sale-number generation for this day
4. `SELECT ... FOR UPDATE` on each product (row lock)
5. Validate stock for each item
6. Decrement stock atomically
7. Generate next daily sale number
8. Create Sale, SaleItem rows (with denormalized product snapshots), StockMovement rows
9. Commit transaction (releases both locks)
10. Create AuditLog entry
11. Return sale ID + receipt data to frontend
12. Frontend opens receipt modal with print option

---

## 📋 Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **npm** 9+

---

## 🚀 Getting Started

### Clone

```bash
git clone https://github.com/Haseebaleem/DukaanBook.git
cd DukaanBook
```

### Backend setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with PostgreSQL credentials and JWT secret

# Create database
psql -U postgres -c "CREATE DATABASE inventory_pos;"

# Run migrations
npx prisma migrate dev

# Seed demo data (owner + cashier + categories + 20 sample products)
npx prisma db seed

# Start backend (strictly port 5000)
npm run dev
```

### Frontend setup

In a new terminal:

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env

# Start frontend (strictly port 3000)
npm run dev
```

### Demo Credentials

The seed script creates two pre-configured accounts:

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@demo.local` | `Owner123!` |
| Cashier | `cashier@demo.local` | `Cashier123!` |

Plus 5 categories, 20 sample products with realistic stock distribution (low-stock items visible on dashboard), and one configured business profile.

### Quick Tour
1. Log in as **owner** → land on `/dashboard`, see live stats and charts
2. Visit `/products` → 20 seeded products with categories and varying stock levels
3. Visit `/staff` → demo cashier listed
4. Sign out, log in as **cashier** → land on `/pos`
5. Search a product, add to cart, complete sale → receipt modal with print option
6. Sign out, log in as owner → check `/sales` for the new sale, `/audit-logs` for the trail

---

## 📡 API Endpoints

All endpoints under `/api/v1`. JWT in `Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | — | Owner or cashier login |
| GET | `/auth/me` | ✅ | Current user + business profile |

### Owner Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/admin/business` | Get/update business profile |
| POST | `/admin/business/logo` | Upload business logo |
| GET/POST | `/admin/staff` | List/create cashiers |
| PATCH | `/admin/staff/:id/suspend` | Suspend cashier |
| PATCH | `/admin/staff/:id/unsuspend` | Restore cashier |
| DELETE | `/admin/staff/:id` | Delete cashier |
| GET/POST | `/admin/categories` | List/create categories |
| PATCH/DELETE | `/admin/categories/:id` | Update/delete (blocked if products exist) |
| GET/POST | `/admin/products` | List/create products with image upload |
| GET/PATCH/DELETE | `/admin/products/:id` | Detail/update/soft-or-hard-delete |
| POST | `/admin/products/:id/stock` | Stock adjustment |
| GET | `/admin/reports/dashboard` | Dashboard widgets data |
| GET | `/admin/reports/sales` | Paginated sales with filters |
| GET | `/admin/audit-logs` | Paginated audit log with filters |

### POS (Owner + Cashier)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pos/products/search` | Search for POS counter (name/SKU/barcode) |
| POST | `/pos/sales` | Complete sale (atomic) |
| GET | `/pos/sales` | List sales (own or all by role) |
| GET | `/pos/sales/:id` | Sale detail |
| POST | `/pos/sales/:id/refund` | Refund with reason + stock restore |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service + DB health check |

---

## 📁 Project Structure

```
DukaanBook/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/         # singleton Prisma client
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/       # audit, sale, stock
│   │   ├── utils/
│   │   ├── validators/     # Zod schemas
│   │   └── index.ts
│   ├── uploads/            # gitignored
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # axios + endpoint wrappers
│   │   ├── components/
│   │   │   ├── ui/         # shadcn primitives
│   │   │   ├── layout/     # AppLayout, sidebar, topbar
│   │   │   ├── pos/        # POS-specific
│   │   │   └── shared/
│   │   ├── pages/
│   │   ├── stores/         # Zustand (theme, cart)
│   │   ├── lib/
│   │   └── App.tsx
│   └── package.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🔐 Security Practices

- Passwords hashed with bcrypt (10 rounds) — never returned in any response
- JWT secret loaded from environment, never committed
- Per-route rate limiting on `/auth/login` (5 attempts / 15 min / IP) — independent counters
- Role middleware enforces OWNER vs CASHIER access on every protected route
- Suspended accounts return 403 immediately on any request
- File uploads: MIME filter as first pass, Sharp metadata validation as the actual gate (MIME headers are spoofable, image bytes are not)
- All uploads converted to WebP and resized server-side — original files never served
- Prisma's parameterized queries prevent SQL injection
- CORS configured to frontend origin only, configurable per environment
- Audit log captures IP per action for post-incident investigation
- TypeScript strict mode in both backend and frontend
- `.env` gitignored, `.env.example` committed with placeholders

> **Note:** JWT stored in localStorage is appropriate for this demonstration. Production deployments should consider httpOnly cookies with CSRF protection for hardened XSS resistance.

---

## 🧪 Testing

End-to-end integration tests cover authentication, role gating, product CRUD, atomic stock adjustment, atomic sale creation (decrement + movements + tax + sale-number generation), monotonic daily sale numbers, refunds (stock restoration + double-refund rejection), reports, staff lifecycle, and health:

```bash
cd backend
npm test
```

**Coverage:** 28 test cases with 60+ assertions, all passing.

---

## 🗺️ Roadmap

### Hardware Integration
- [ ] Thermal receipt printer support via ESC/POS protocol (USB + Bluetooth)
- [ ] Native barcode scanner integration — handheld USB HID + camera-based mobile
- [ ] Cash drawer control via printer kick-out
- [ ] Customer-facing display (second screen) showing transaction total
- [ ] Card reader / payment terminal integration

### Business Features
- [ ] Bulk product import from Excel/CSV with row-by-row validation
- [ ] Multi-branch support with inventory transfers between locations
- [ ] Customer database with purchase history and loyalty points
- [ ] Discounts, coupons, and promotional pricing rules
- [ ] Returns and exchanges (partial refund, item swap)
- [ ] End-of-day Z-reports and cashier shift reconciliation
- [ ] Multiple tax rates per product category

### Operations
- [ ] PWA installability with offline cache for the POS counter
- [ ] Concurrent multi-cashier handling beyond row-level locking
- [ ] Customizable receipt templates (logo, footer, return policy)
- [ ] Supplier management with purchase orders

### Tax Compliance
- [ ] Pakistan FBR-compliant tax invoicing
- [ ] Saudi ZATCA e-invoicing integration (Phase 2 mandatory format)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file. Use it as a reference, starting point, or learning resource.

---

## 👤 Author

**Haseeb Aleem**
Senior Full Stack Developer & Team Lead

- 💼 **LinkedIn:** [linkedin.com/in/haseeb-aleem-dev](https://www.linkedin.com/in/haseeb-aleem-dev/)
- 💻 **GitHub:** [github.com/Haseebaleem](https://github.com/Haseebaleem)
- 📧 **Email:** haseebaleem2802@gmail.com
- 📍 **Location:** Multan, Pakistan (Open to Saudi Arabia & GCC relocation)

---

⭐ If you found this project useful, consider giving it a star.
