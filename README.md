# CloudSec Marketplace

A commission-based art marketplace where buyers and artists transact securely through an escrow system. Buyers request commissions, artists deliver artwork, and Stripe handles payment with funds held in escrow until both parties approve. The platform automatically watermarks artwork during the escrow period and only releases the unwatermarked original after payment is captured and the artist is paid out.

Built for CPSC 454 — Cloud Computing and Security.

## How the Escrow Works

The escrow system is the core of the payment flow. It ensures neither party gets burned: the buyer's money is held (not charged) until the artist delivers, and the artist's work is watermarked until they get paid.

### Transaction State Machine

```
                                ┌──────────┐
                     create     │          │  Stripe confirms
                   PaymentIntent│ pending  │  funds authorized
                   ────────────►│          ├──────────────────┐
                                └────┬─────┘                  │
                                     │                        ▼
                                     │ cancel/expire   ┌────────────┐
                                     ▼                 │            │
                              ┌───────────┐   all 4    │ funds_held │
                              │ canceled  │ conditions  │            │
                              └───────────┘   met      └──────┬─────┘
                                                              │
                    ┌─────────────────────────────────────────┘
                    ▼
            ┌──────────────┐   capture     ┌──────────┐   transfer   ┌─────────────┐
            │ Escrow Check ├──────────────►│ released ├─────────────►│ payout_sent │
            │ (4 conditions)│   PI on      │          │  to artist   │             │
            └──────┬───────┘   Stripe      └────┬─────┘   Connect    └─────────────┘
                   │                             │
                   │ capture fails               │ transfer fails
                   ▼                             ▼
             ┌──────────┐              (stays at released,
             │  failed  │               art withheld,
             └──────────┘               manual intervention)
```

### The 4 Escrow Conditions

All four must be true before the swap executes:

1. **Funds held** -- transaction status is `funds_held` (buyer's payment authorized on Stripe)
2. **Art uploaded** -- artist uploaded the final artwork (both watermarked and unwatermarked versions stored in S3)
3. **Client approved** -- buyer approved the delivered artwork
4. **Artist approved** -- artist confirmed the order is complete

Once all four are met, `execute_escrow_release` runs this sequence:

1. Atomically claim the release (prevents double-execution)
2. Re-verify all 4 conditions
3. Capture the PaymentIntent on Stripe (authorize -> charge)
4. Transfer funds to the artist's Stripe Connect account (minus platform fee)
5. Mark the order as `completed`
6. Release the unwatermarked artwork to the buyer

### Two Release Paths

Orders can exist with or without payment:

- **With payment (escrow path):** Approve triggers `check_escrow_ready` -> `execute_escrow_release` which captures funds, pays the artist, then releases art.
- **Without payment (direct path):** Approve triggers `release_image` directly, marking art as released and order as completed. No Stripe interaction.

## Setup

### 1. Install Dependencies

```bash
cd cloudsec_marketplace/backend
pip install -r requirements.txt
```

### 2. Environment Variables

Copy the example and fill in your values:

```bash
cp cloudsec_marketplace/backend/.env.example cloudsec_marketplace/backend/.env
```

### 3. Run the Server

```bash
cd cloudsec_marketplace/backend
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Stripe Webhook Testing

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:8000/payments/webhook
```

This prints a `whsec_...` value. Add it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

## API Endpoints

All authenticated endpoints require an `Authorization: Bearer <token>` header. Tokens are obtained from `POST /auth/login`.

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create a new user account |
| POST | `/auth/login` | No | Authenticate and receive JWT token |
| POST | `/auth/logout` | User | Log out (invalidate session) |

### Health (`/health`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health/status` | No | Check API health |

### Home (`/home`) -- Public Browsing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/home/users/search` | No | Search users by username |
| GET | `/home/profiles` | No | List all user profiles |
| GET | `/home/profiles/{user_id}` | No | View a user's public profile |
| GET | `/home/profiles/{user_id}/images` | No | View a user's portfolio |
| GET | `/home/profiles/{user_id}/images/{image_id}` | No | View a single portfolio image |
| POST | `/home/profiles/{user_id}/request` | User | Create a commission order |

### User (`/user`) -- Authenticated User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user/me` | User | View your profile |
| GET | `/user/me/settings` | User | View your settings |
| PATCH | `/user/me/settings` | User | Update settings (username, email, bio) |
| POST | `/user/me/settings/pfp` | User | Upload profile picture |
| DELETE | `/user/me` | User | Delete your account |
| POST | `/user/me/images/upload` | User | Upload a portfolio image |
| GET | `/user/me/images` | User | List your portfolio images |
| GET | `/user/me/images/{image_id}` | User | View one of your images |
| DELETE | `/user/me/images/{image_id}` | User | Delete one of your images |
| GET | `/user/me/orders/client` | User | View orders where you are the buyer |
| GET | `/user/me/orders/artist` | User | View orders where you are the artist |
| GET | `/user/me/orders/{order_id}` | User | View a single order's details |
| DELETE | `/user/me/orders/{order_id}` | User | Delete/cancel an order |
| PATCH | `/user/me/orders/{order_id}/accept` | User | Artist accepts a commission |
| PATCH | `/user/me/orders/{order_id}/decline` | User | Artist declines a commission |
| POST | `/user/me/orders/{order_id}/upload` | User | Artist uploads final artwork |
| GET | `/user/me/orders/{order_id}/download` | User | Buyer downloads released artwork |
| POST | `/user/me/orders/{order_id}/approve` | User | Buyer or artist approves the order |

### Payments (`/payments`) -- Stripe Integration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payments/config` | No | Get Stripe publishable key for frontend |
| POST | `/payments/create-intent` | User | Buyer creates a PaymentIntent (escrow hold) |
| GET | `/payments/{order_id}/status` | User | Check transaction status for an order |
| POST | `/payments/webhook` | No* | Stripe webhook receiver (signature-verified) |
| POST | `/payments/{order_id}/artwork-uploaded` | User | Signal escrow that artwork is ready |
| GET | `/payments/{order_id}/download` | User | Buyer downloads artwork after escrow release |
| POST | `/payments/{order_id}/refund` | User | Refund or cancel a payment |
| POST | `/payments/artist/onboard` | User | Create Stripe Connect account, get onboarding URL |
| POST | `/payments/artist/onboard/refresh` | User | Regenerate an expired onboarding link |
| GET | `/payments/artist/onboard/status` | User | Check if Stripe onboarding is complete |
| GET | `/payments/my-transactions` | User | View your transactions (not yet implemented) |

*Webhook endpoint uses Stripe signature verification instead of JWT auth.

### Admin (`/admin`) -- Admin Only

All admin endpoints require the `admin` role.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | Admin | List all users |
| GET | `/admin/users/search` | Admin | Search users (includes private data) |
| GET | `/admin/users/{user_id}` | Admin | View a user's full profile |
| DELETE | `/admin/users/{user_id}` | Admin | Delete a user account |
| GET | `/admin/users/{user_id}/permissions` | Admin | View user role |
| PATCH | `/admin/users/{user_id}/permissions` | Admin | Toggle user role (user/admin) |
| GET | `/admin/users/{user_id}/images` | Admin | View a user's images |
| GET | `/admin/users/{user_id}/images/{image_id}` | Admin | View a specific image |
| DELETE | `/admin/users/{user_id}/images/{image_id}` | Admin | Delete an image |
| GET | `/admin/users/{user_id}/orders` | Admin | View a user's orders |
| GET | `/admin/users/{user_id}/orders/{order_id}` | Admin | View a specific order |
| DELETE | `/admin/users/{user_id}/orders/{order_id}` | Admin | Delete an order |

## Order Lifecycle

```
Buyer creates order ──► received ──► Artist accepts ──► accepted
                           │                               │
                     Artist declines                 Both parties work,
                           │                        upload art, approve
                           ▼                               │
                       declined                       ┌────┴────┐
                                               Escrow path   Direct path
                                              (with payment) (no payment)
                                                    │              │
                                              Capture funds,   Release art
                                              pay artist,      directly
                                              release art          │
                                                    │              │
                                                    └──────┬───────┘
                                                           ▼
                                                       completed
```

## Running Tests

Tests use [mongomock](https://github.com/mongomock/mongomock) for the database and mock all Stripe and S3 calls.

```bash
cd cloudsec_marketplace/backend
python -m pytest tests/ -v
```

Run a specific test file:

```bash
python -m pytest tests/test_payments.py -v
python -m pytest tests/test_routes.py -v
```

The payment test suite (`test_payments.py`) covers:
- PaymentIntent creation and validation
- Webhook handlers (authorized, succeeded, failed, canceled)
- Refund flows (uncaptured cancel vs captured refund)
- Escrow conditions and release ordering
- Artist payout (success, no Stripe account, Stripe errors)
- Artist Stripe Connect onboarding
- Upload-to-escrow bridge (with and without transactions)
- Approve-to-escrow bridge (escrow path vs direct path)
- Auth guards on all payment routes

## Project Structure

```
cloudsec_marketplace/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI app, lifespan, router mounting
│   │   ├── api/
│   │   │   ├── __init__.py              # Router imports
│   │   │   ├── deps.py                  # Auth dependencies (get_current_user, JWT)
│   │   │   └── routes/
│   │   │       ├── admin.py             # Admin endpoints
│   │   │       ├── auth.py              # Register, login, logout
│   │   │       ├── health.py            # Health check
│   │   │       ├── home.py              # Public browsing, commission requests
│   │   │       ├── payments.py          # Stripe payments, escrow, onboarding
│   │   │       └── users.py             # User profile, images, orders
│   │   ├── core/
│   │   │   ├── config.py               # Settings (env vars, Pydantic)
│   │   │   ├── logging.py              # Logging configuration
│   │   │   └── security.py             # Security utilities
│   │   ├── models/
│   │   │   ├── image.py                # Image model
│   │   │   ├── order.py                # Order, OrderAsset, approval models
│   │   │   ├── transaction.py          # Transaction state machine, payment models
│   │   │   └── user.py                 # User, profile, settings models
│   │   ├── services/
│   │   │   ├── db_service.py           # MongoDB operations (users, images, orders)
│   │   │   ├── payment_service.py      # Stripe integration, escrow logic, payouts
│   │   │   └── s3_service.py           # AWS S3 uploads, downloads, presigned URLs
│   │   └── workers/
│   │       ├── jobs.py                 # Background job definitions
│   │       └── lambda_handler.py       # AWS Lambda entry point
│   ├── tests/
│   │   ├── conftest.py                 # Fixtures (mongomock, test users, mock Stripe)
│   │   ├── test_payments.py            # Payment and escrow tests (33 tests)
│   │   └── test_routes.py             # Route and auth tests
│   ├── watermark/
│   │   ├── __init__.py
│   │   └── watermark.py               # Image watermarking logic
│   └── requirements.txt
├── database/
│   ├── schemas/                        # DB schema documentation
│   └── seed/                           # Sample seed data
├── docs/
│   └── architecture/                   # Architecture and security notes
├── frontend/                           # Frontend application
└── infastructure/
    ├── aws/                            # IAM roles, S3 policies, SQS config
    └── docker-compose.yml
```

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `user` | User accounts (credentials, profile, Stripe account ID) |
| `image` | Portfolio images uploaded by artists |
| `order` | Commission orders between buyers and artists |
| `order_asset` | Uploaded artwork files (watermarked + unwatermarked S3 keys) |
| `escrow_asset` | Escrow-tracked artwork (synced with order_asset during payment flow) |
| `transaction` | Payment records (Stripe PaymentIntent, status, payout info) |
