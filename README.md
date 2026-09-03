# Invoicing-mirco-saas

Backend API for a small pharmaceutical inventory and invoicing application.

## Tech stack

- Cloudflare Workers
- Hono
- TypeScript
- Cloudflare D1 (SQLite)
- Drizzle ORM
- Zod (validation foundation)
- Web Crypto API for password/session security

## Features

### Authentication

- Email/password signup and login
- Logout
- `USER` and `ADMIN` roles
- D1-backed sessions
- Session tokens are hashed before storage
- HttpOnly session cookie
- Bootstrap admin account using Cloudflare Worker secrets

### Inventory

- Product CRUD
- SKU, HSN code, unit, selling price, GST rate
- Stock quantity tracking
- Soft delete for products
- Normal reads exclude deleted records

### Customers

- Customer CRUD
- Name, phone, email, address and GSTIN
- Soft delete support

### Invoices

- Create invoice/order from inventory items
- Validate available stock before invoice creation
- Automatically reduce inventory
- Transactional invoice + stock update using D1 batch execution
- Product details are snapshotted into invoice items
- Store money as integer paise
- Payment method and payment status stored as integer enums
- List invoices
- Get invoice details
- Soft delete invoices
- Generate invoice PDF directly from D1 data
- PDF is returned as an HTTP response and is not stored in R2/object storage

## API routes

```text
/api/health
/api/auth/signup
/api/auth/login
/api/auth/logout
/api/auth/me

/api/admin/users

/api/products
/api/products/:id

/api/customers
/api/customers/:id

/api/invoices
/api/invoices/:id
/api/invoices/:id/pdf
```

All product, customer, and invoice endpoints require an authenticated session unless explicitly documented otherwise.

## Roles

```text
0 = USER
1 = ADMIN
```

Signup creates a `USER`. Admin users can manage users through the admin API.

## Invoice payment enums

### Payment method

```text
0 = CASH
1 = UPI
2 = BANK
3 = CREDIT
4 = OTHER
```

### Payment status

```text
0 = PENDING
1 = PAID
2 = PARTIAL
3 = FAILED
4 = REFUNDED
```

## Data model

The backend currently uses these core tables:

```text
users
sessions
products
customers
invoices
invoice_items
```

Soft-delete is represented with an `is_deleted` flag. Deleted records remain in the database for history but are excluded from normal application reads.

## Local development

### Install

```bash
npm install
```

### Local admin secrets

Create a `.dev.vars` file in the project root:

```text
ADMIN_EMAIL=root
ADMIN_PASSWORD=root
```

Do not commit `.dev.vars` or production secrets.

### Apply local D1 migrations

```bash
npm run db:migrate:local
```

### Start the Worker locally

```bash
npm run dev
```

## Database migrations

Generate a new Drizzle migration:

```bash
npm run db:generate
```

Apply migrations to local D1:

```bash
npm run db:migrate:local
```

Apply migrations to the remote D1 database:

```bash
npm run db:migrate:remote
```

Migration files are stored in the `drizzle/` directory and should be applied in order.

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start local Cloudflare Worker |
| `npm run deploy` | Deploy Worker to Cloudflare |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:generate` | Generate Drizzle migration SQL |
| `npm run db:migrate:local` | Apply migrations to local D1 |
| `npm run db:migrate:remote` | Apply migrations to remote D1 |

## Architecture

```text
Frontend
   |
   v
Cloudflare Worker
   |
   +-- Hono API
   +-- Authentication / Sessions
   +-- Admin APIs
   +-- Product / Inventory APIs
   +-- Customer APIs
   +-- Invoice APIs
   +-- PDF generation
   |
   v
Cloudflare D1 (SQLite)
```

## Design constraints

The current backend is intentionally simple and Cloudflare-native:

- D1 is the only database
- No PostgreSQL / Neon / Supabase
- No R2/object storage
- No Stripe
- No Razorpay
- No external payment gateway
- Invoice PDFs are generated on demand from database values
- Payment recording is manual through invoice payment fields

## Security notes

- Passwords are never stored in plaintext
- Password hashing uses the Worker Web Crypto API
- Session tokens are randomly generated and stored as hashes
- Authentication uses an HttpOnly cookie
- Admin bootstrap credentials should be stored as Cloudflare secrets in deployed environments
- `.dev.vars` is for local development only

## Current status

Implemented backend foundations:

- Authentication and sessions
- Admin/user roles
- Product and inventory management
- Customer management
- Soft delete
- Integer enum storage
- Invoice creation
- Automatic stock deduction
- Invoice history APIs
- Direct invoice PDF generation

Planned next backend work includes payment references/UTR, stock adjustment/restock APIs, invoice cancellation with stock restoration, pagination/search/filtering, dashboard/reporting APIs, and stronger request validation/security hardening.
