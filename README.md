# CPSC_454_Cloud_Computing_and_Security_Project
This project is the creation of a Marketplace for users to purchase artwork. It's unique in its holding of art and money, and swapping the two items once both are present on the server. Buyers can have profiles, and users can buy from these profiles.

## Setup

### 1. Install Dependencies
```bash
cd scan-and-save/backend
pip install -r requirements.txt
```

### 2. Environment Variables
Copy the example and fill in your values:
```bash
cp scan-and-save/backend/.env.example scan-and-save/backend/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | Database name |
| `STRIPE_SECRET_KEY` | For payments | Get from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) |
| `STRIPE_PUBLISHABLE_KEY` | For payments | Get from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | For payments | Get from Stripe CLI (see below) |
| `PLATFORM_FEE_PERCENT` | No (default 3%) | Platform commission on each transaction |
| `AWS_REGION` | For S3 | AWS region for image storage |

### 3. Run the Server
```bash
cd scan-and-save/backend
uvicorn app.main:app --reload --port 8000
```
API docs available at `http://localhost:8000/docs`

### 4. Stripe Webhook Testing (Payments team)
Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:
```bash
stripe login
stripe listen --forward-to localhost:8000/payments/webhook
```
This prints a `whsec_...` value — add it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

### Payment Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/payments/config` | Get Stripe publishable key for frontend |
| `POST` | `/payments/create-intent` | Buyer initiates payment (creates escrow hold) |
| `GET` | `/payments/{order_id}/status` | Check transaction/escrow status |
| `POST` | `/payments/webhook` | Stripe webhook receiver |
| `POST` | `/payments/{order_id}/artwork-uploaded` | Signal escrow that art is ready |
| `GET` | `/payments/{order_id}/download` | Buyer downloads released artwork |
| `POST` | `/payments/{order_id}/refund` | Refund/cancel a payment |
| `POST` | `/payments/artist/onboard` | Artist Stripe Connect setup (needs auth) |
| `GET` | `/payments/artist/onboard/status` | Check artist onboarding (needs auth) |
| `GET` | `/payments/my-transactions` | View user's transactions (needs auth) |
