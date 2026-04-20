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

### Prerequisites

Before you start, make sure you have:

- **Python 3.11+** (tested on 3.13)
- **Node.js 18+** and npm (for the frontend)
- A **MongoDB Atlas** account (free M0 tier is fine) or a local MongoDB instance
- A **Stripe** account in test mode — https://dashboard.stripe.com/register
- The **Stripe CLI** installed — https://stripe.com/docs/stripe-cli
- An **AWS** account with an S3 bucket and an IAM user that has `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions on that bucket

### 1. Clone and Install Backend Dependencies

```bash
git clone <repo-url>
cd cloudsec_marketplace/backend
pip install -r requirements.txt
```

### 2. Set Up MongoDB Atlas

If you're using Atlas (recommended):

1. Create a cluster at https://cloud.mongodb.com.
2. **Allow your IP address.** Go to **Network Access** → **Add IP Address** → either "Add Current IP Address" (dev-safe for your current network) or `0.0.0.0/0` (open to anywhere — only for dev; never production). Wait ~1 minute for the rule to become `Active`.
   - If your IP changes (home Wi-Fi, coffee shop, tethering), you'll need to re-add it. A `TLSV1_ALERT_INTERNAL_ERROR` or `ServerSelectionTimeoutError` on the first DB call is the classic symptom of an IP not being allowlisted.
3. Create a database user under **Database Access** and give it read/write access.
4. Click **Connect** → **Drivers** and copy the connection string. It looks like `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`.
5. If the cluster is on the free M0 tier and has been idle, check that it's not **Paused** — resume it from the Database dashboard.

If you're running MongoDB locally, the default `mongodb://localhost:27017` in `.env.example` already works.

### 3. Enable Stripe Connect

Stripe Connect is required for the artist onboarding and payout flow. It's off by default on new Stripe accounts:

1. Go to https://dashboard.stripe.com/test/connect/overview and click **Get started**.
2. Choose **Platform or marketplace** when prompted, and **Express** accounts for the artist type.
3. Fill in the required platform profile fields. You only need to complete enough to enable test mode.

Without this, `POST /payments/artist/onboard` will fail with a Stripe error.

### 4. Set Up AWS S3

1. Create an S3 bucket (any region — note it for `AWS_REGION`).
2. Create an IAM user with programmatic access and attach a policy granting `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `arn:aws:s3:::<your-bucket>/*`.
3. Save the access key ID and secret access key — you'll put these in `.env`.

### 5. Environment Variables

Copy the example and fill in your values:

```bash
cp cloudsec_marketplace/backend/.env.example cloudsec_marketplace/backend/.env
```

Fill in `.env` with the values you collected above. Key variables:

| Variable | Notes |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string, or `mongodb://localhost:27017` for local |
| `DB_NAME` | The database name to use (e.g. `cloudsec_marketplace`) |
| `STRIPE_SECRET_KEY` | From https://dashboard.stripe.com/test/apikeys (starts with `sk_test_`) |
| `STRIPE_PUBLISHABLE_KEY` | Same page (starts with `pk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | Printed by `stripe listen` — see step 7 below |
| `PLATFORM_FEE_PERCENT` | Platform cut per transaction (default 10) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user credentials |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_S3_BUCKET_NAME` | The bucket name only, no `s3://` prefix |
| `SECRET_KEY` | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `FRONTEND_URL` | Where Stripe should redirect after onboarding. Set to `http://localhost:5173` to match the Vite dev server |

### 6. Run the Backend

```bash
cd cloudsec_marketplace/backend
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

The log line `Connected to MongoDB database <name>` on startup is misleading — PyMongo connects lazily, so DB errors (bad IP allowlist, wrong credentials, paused cluster) don't surface until the first query. If `GET /home/profiles` returns 500 with a TLS or `ServerSelectionTimeoutError`, revisit step 2.

### 7. Stripe Webhook Listener

In a separate terminal, forward Stripe events to your local backend:

```bash
stripe login
stripe listen --forward-to localhost:8000/payments/webhook
```

Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET` in `.env`, then restart the backend. Leave `stripe listen` running while you test payment flows.

### 8. Run the Frontend

In another terminal:

```bash
cd cloudsec_marketplace/frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:5173** (Vite's default). If Vite starts on a different port (e.g. because 5173 is taken), update `FRONTEND_URL` in the backend `.env` to match and restart the backend — otherwise Stripe Connect will redirect to the wrong port after onboarding and you'll see `ERR_CONNECTION_REFUSED`.

### 9. Verify End-to-End

A quick smoke test that exercises the full stack:

1. Visit http://localhost:5173 — home page loads with creators
2. Sign up, then log in
3. From the dashboard, click "Become a Creator" and fill out the form
4. Click "Set Up Payouts" — you should be redirected to Stripe's hosted onboarding, and after completing it, returned to `http://localhost:5173/artist/onboard/complete` with the banner flipping to "Payouts enabled"

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

## Troubleshooting

**`ServerSelectionTimeoutError` / `TLSV1_ALERT_INTERNAL_ERROR` on first DB query**
Your client IP isn't on the Atlas Network Access list, the cluster is paused, or (on Python 3.13) your `certifi` bundle is stale. Fix in that order: add your IP, resume the cluster, then `pip install --upgrade pymongo certifi`.

**`ERR_CONNECTION_REFUSED` after Stripe Connect onboarding**
Stripe redirected to a URL the frontend isn't serving. Confirm the frontend is running, note the port Vite printed, and set `FRONTEND_URL` in the backend `.env` to match that exact origin. Restart the backend.

**Stripe onboarding returns an account-type error**
Stripe Connect hasn't been enabled on your platform account yet. See setup step 3.

**`NoCredentialsError` when uploading artwork**
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are missing or wrong in `.env`. The backend only reads `.env` at startup, so restart after changing it.

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
├── frontend/                           # Frontend application (Vite + React)
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
| `order_asset` | Uploaded artwork files (S3 keys, upload/release status for escrow) |
| `transaction` | Payment records (Stripe PaymentIntent, status, payout info) |