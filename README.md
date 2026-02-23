# 🚀 LocalBoost — MVP

> Reduce no-shows and grow Google Reviews for local businesses in Cyprus.
> Built with Next.js 14 · TypeScript · Prisma · Supabase · Stripe · Twilio · Postmark

---

## Table of Contents
1. [Architecture Overview](#architecture)
2. [Project Structure](#structure)
3. [Local Development Setup](#local-dev)
4. [Environment Variables](#env-vars)
5. [Stripe Setup](#stripe)
6. [Twilio Setup](#twilio)
7. [Postmark Setup](#postmark)
8. [Vercel Deployment](#vercel)
9. [Database Setup & Migrations](#database)
10. [Operator Playbook — Onboard a Client in 10 Minutes](#playbook)
11. [Phase 2 Roadmap](#phase2)
12. [QA Checklist](#qa)

---

## Architecture Overview {#architecture}

```
┌─────────────────────────────────────────────────────────┐
│                    NEXT.JS APP                           │
│                                                          │
│  Marketing Site       App (Authenticated)                │
│  /          /pricing  /dashboard  /appointments          │
│  /faq       /contact  /customers  /automations           │
│  /industries          /templates  /billing               │
│                       /settings   /admin                 │
│                                                          │
│  API Routes                                              │
│  /api/appointments    /api/customers    /api/billing      │
│  /api/automations     /api/templates   /api/dashboard     │
│  /api/cron            /api/webhooks/*  /api/onboarding    │
│  /api/feedback/*      /api/admin/*     /api/me            │
└──────────────────────────────┬──────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
     ┌────▼─────┐       ┌──────▼──────┐     ┌──────▼──────┐
     │ Supabase │       │   Stripe    │     │ Twilio      │
     │ (Auth +  │       │ (Billing)   │     │ (SMS)       │
     │ Postgres)│       └─────────────┘     └─────────────┘
     └──────────┘                                   │
          │                                  ┌──────▼──────┐
     ┌────▼─────┐                            │  Postmark   │
     │  Prisma  │                            │  (Email)    │
     │   ORM    │                            └─────────────┘
     └──────────┘

     ┌─────────────────────────────────────────────────────┐
     │  CRON JOB (every minute via Vercel Cron)             │
     │  POST /api/cron                                      │
     │  → Pulls QUEUED message_jobs where send_at <= now    │
     │  → Checks consent + billing limits                   │
     │  → Sends via Twilio (SMS) or Postmark (Email)        │
     │  → Updates status (SENT / FAILED / SKIPPED)          │
     └─────────────────────────────────────────────────────┘
```

---

## Project Structure {#structure}

```
localboost/
├── prisma/
│   ├── schema.prisma          # Full DB schema (12 models)
│   └── seed.ts                # Demo data seed script
├── src/
│   ├── app/
│   │   ├── (marketing)/       # Public marketing pages
│   │   ├── (auth)/            # Login / Signup / Callback
│   │   ├── (app)/             # Authenticated portal
│   │   ├── (admin)/           # Operator admin panel
│   │   └── api/               # All API routes
│   │       ├── appointments/  # CRUD + confirm/cancel tokens
│   │       ├── customers/     # CRUD + CSV import
│   │       ├── automations/   # Rule toggle + channel
│   │       ├── templates/     # CRUD + test-send
│   │       ├── billing/       # Stripe checkout + portal + webhook
│   │       ├── webhooks/      # Twilio inbound + email unsubscribe
│   │       ├── cron/          # Message job runner
│   │       ├── feedback/      # Post-visit feedback form
│   │       ├── onboarding/    # Business setup
│   │       ├── dashboard/     # KPI aggregates
│   │       ├── admin/         # Operator-only views
│   │       ├── auth/          # Registration
│   │       └── me/            # Current user + business
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── supabase.ts        # Supabase client helpers
│   │   ├── auth.ts            # Server-side auth helpers
│   │   ├── stripe.ts          # Stripe helpers + plan limits
│   │   ├── twilio.ts          # SMS sending + opt-out detection
│   │   ├── email.ts           # Postmark email sending
│   │   ├── scheduler.ts       # Job scheduling logic
│   │   ├── templates.ts       # Variable substitution engine
│   │   ├── audit.ts           # Audit log helper
│   │   ├── billing-limits.ts  # Plan usage enforcement
│   │   └── utils.ts           # Shared utilities + CSV parser
│   ├── middleware.ts           # Route protection
│   └── types/index.ts         # Shared TypeScript types
├── tests/
│   ├── unit/scheduler.test.ts
│   └── integration/message-sending.test.ts
├── vercel.json                 # Cron config + headers
├── .env.example                # All required env vars
└── README.md
```

---

## Local Development Setup {#local-dev}

```bash
# 1. Clone + install
git clone https://github.com/yourorg/localboost
cd localboost
npm install

# 2. Copy env file
cp .env.example .env.local
# Edit .env.local with your actual keys

# 3. Set up database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database

# 4. Seed demo data
npm run db:seed

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables {#env-vars}

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Postgres connection string (Supabase) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | ✅ |
| `STRIPE_PRICE_STARTER` | Stripe price ID for €19/mo plan | ✅ |
| `STRIPE_PRICE_PRO` | Stripe price ID for €49/mo plan | ✅ |
| `STRIPE_PRICE_PREMIUM` | Stripe price ID for €99/mo plan | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | ✅ |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number | ✅ |
| `POSTMARK_SERVER_TOKEN` | Postmark server token | ✅ |
| `POSTMARK_FROM_EMAIL` | Verified sender email | ✅ |
| `POSTMARK_FROM_NAME` | Sender display name | ✅ |
| `CRON_SECRET` | Secret for authenticating cron endpoint | ✅ |
| `NEXT_PUBLIC_APP_URL` | Full app URL (no trailing slash) | ✅ |
| `TEST_MODE` | Set `true` to skip real SMS/email sends | Dev only |

---

## Stripe Setup {#stripe}

### 1. Create Products and Prices

In your Stripe Dashboard → Products:

```
Starter Plan:  €19/month  → recurring, EUR, monthly
Pro Plan:      €49/month  → recurring, EUR, monthly
Premium Plan:  €99/month  → recurring, EUR, monthly
```

Copy each price ID (starts with `price_...`) to `.env.local`.

### 2. Create Webhook Endpoint

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://your-app.vercel.app/api/billing/webhook`
- Events to listen:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

### 3. Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

---

## Twilio Setup {#twilio}

### 1. Get a phone number

- Twilio Console → Phone Numbers → Buy → Cyprus (+357) or international
- Must be SMS-capable

### 2. Configure inbound webhook

- Phone number → Messaging → Configure With → Webhooks
- When a message comes in: `POST https://your-app.vercel.app/api/webhooks/twilio`
- HTTP POST

### 3. Test SMS

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json \
  -d "To=+35799000001" \
  -d "From=+15005550006" \
  -d "Body=Test from LocalBoost" \
  -u "ACxxx:your_auth_token"
```

---

## Postmark Setup {#postmark}

1. Create a Postmark account at postmarkapp.com
2. Create a Server (Transactional)
3. Add a verified Sender Signature (your from email domain)
4. Copy the Server Token to `POSTMARK_SERVER_TOKEN`
5. Set `POSTMARK_FROM_EMAIL` to your verified sender address

**Important:** Verify your sending domain's DNS records (DKIM + SPF) for production deliverability.

---

## Vercel Deployment {#vercel}

### Deploy

```bash
npm install -g vercel
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deploys.

### Environment variables

Set all variables from `.env.example` in Vercel Dashboard → Settings → Environment Variables.

### Cron job

`vercel.json` already configures the cron:
```json
{
  "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }]
}
```

The cron calls `POST /api/cron` every minute with the `Authorization: Bearer CRON_SECRET` header.

> ⚠️ **Note:** Vercel Cron requires a Pro plan for sub-hour frequency. Vercel Hobby supports daily crons. For MVP testing, you can trigger manually or use an external cron service (cron-job.org).

---

## Database Setup & Migrations {#database}

### Initial setup (Supabase)

1. Create project at supabase.com
2. Go to Settings → Database → Connection String
3. Copy the URI to `DATABASE_URL`

### Run migrations

```bash
npm run db:push          # Development: push schema directly
npm run db:migrate       # Production: create migration files

# After any schema change:
npm run db:generate      # Regenerate Prisma client
```

### Seed demo data

```bash
npm run db:seed
# Creates: admin user, demo business owner, business, customers, appointments
# Demo login: demo@localboost.app (set password in Supabase Auth)
```

---

## Operator Playbook — Onboard a Client in 10 Minutes {#playbook}

This is your step-by-step guide to getting a new Cyprus SMB live on LocalBoost.

### Step 1: Pre-call prep (2 min)
- [ ] Check their Google Business Profile — do they have a Google Review link?
- [ ] Confirm their phone number format (+357...)
- [ ] Ask if they prefer English, Greek, or both for messages

### Step 2: Account creation (2 min)
1. Direct client to `https://localboost.app/signup`
2. They enter name, email, password
3. OR create on their behalf and share credentials

### Step 3: Onboarding wizard (3 min)
1. Business name → Industry → Timezone (Asia/Nicosia)
2. SMS + Email (recommend both) → select channels
3. Paste Google Review link → click "Go to Dashboard"

### Step 4: Add first customers (2 min)

**Option A — CSV import (fastest):**
```csv
full_name,phone,email,consent_sms,consent_email
Stavros Kyriakides,+35799000001,stavros@email.com,true,true
Maria Petrou,+35799000002,maria@email.com,true,false
```
Upload via Customers → Import CSV.

**Option B — Manual:**
Customers → Add customer → fill name + phone + consent checkboxes.

### Step 5: First appointment (1 min)
1. Appointments → New appointment
2. Select customer, service, date/time
3. Save — reminders are now scheduled automatically ✅

### Step 6: Verify automations are on
- Automations page → all 4 rules should be Active
- Confirm channel (SMS / Email / Both) matches what the client prefers

### Step 7: Set up billing (if not already on paid plan)
- Billing → Choose plan → Stripe checkout
- Client enters card details directly (you never see them)

### Done! ✅ The client is live.

**What happens next (automatically):**
- 24h before appointment → SMS + email reminder sent
- 2h before → final SMS
- After marked "Completed" → feedback request
- If 4–5★ → Google review link sent
- If 1–3★ → private feedback captured + business notified

---

## Phase 2 Roadmap {#phase2}

### Integrations
- **Google Calendar sync** — two-way sync so appointments created in GCal appear in LocalBoost and vice versa
- **Calendly integration** — pull appointments from Calendly via webhook
- **Square / Fresha POS** — import appointments from POS system
- **Zapier / Make connector** — allow any CRM to push appointments

### Messaging
- **WhatsApp Business API** — send reminders and review requests via WhatsApp (architecture hook already in MessageChannel enum: can add `WHATSAPP`)
- **Viber** — popular in Cyprus; add as a channel
- **Multi-language per customer** — store preferred language on customer record

### Google Reviews
- **Google Business Profile API** — read existing reviews, respond to reviews, monitor rating changes
- **Review monitoring dashboard** — track new reviews in real-time, alert on negative reviews
- **Automated review reply suggestions** — AI-suggested responses

### AI Features
- **Smart scheduling** — predict no-show probability per customer based on history
- **AI message personalisation** — vary message tone based on customer history
- **Churn prediction** — flag customers who haven't booked in 60+ days

### Operations
- **Team seats** — multiple staff logins with role-based permissions per location
- **Multi-business operator** — one operator account managing multiple independent businesses
- **Franchises** — parent/child business hierarchy

### Analytics
- **Attribution reporting** — which channel drives most confirmations, reviews
- **A/B testing** — test different template variations
- **ROI calculator** — estimated revenue saved from reduced no-shows

### Compliance
- **Data export (GDPR Article 20)** — one-click customer data export as JSON/CSV
- **Consent audit report** — printable report of all consents for compliance review
- **Data retention policies** — auto-delete customer data after configurable period

---

## QA Checklist {#qa}

### Functional
- [ ] User can sign up, verify email, complete onboarding
- [ ] Appointment creation schedules message jobs (verify in DB)
- [ ] Appointment cancellation marks jobs as SKIPPED
- [ ] Appointment rescheduling updates job send_at times
- [ ] Marking appointment COMPLETED triggers feedback job
- [ ] Rating ≥ 4 triggers review job
- [ ] Rating ≤ 3 sends private notification to business owner
- [ ] STOP reply from customer sets opted_out_sms = true
- [ ] Email unsubscribe link sets opted_out_email = true
- [ ] Opted-out customers have jobs SKIPPED, not SENT
- [ ] Monthly message limit blocks sending and shows upgrade prompt
- [ ] Stripe checkout creates subscription and updates billing record
- [ ] Stripe webhook handles subscription updates correctly
- [ ] CSV import creates customers with correct consent data
- [ ] Admin can view all businesses and billing status

### Security
- [ ] Unauthenticated requests to /api/* return 401 (except webhooks)
- [ ] Business owner cannot access another business's data
- [ ] Stripe webhook validates signature
- [ ] Twilio webhook validates signature
- [ ] Cron endpoint requires CRON_SECRET header
- [ ] Rate limiting active on Twilio inbound webhook

### Performance
- [ ] Dashboard loads in < 2 seconds with 500+ appointments
- [ ] Customer search returns results in < 500ms
- [ ] Cron job processes 50 jobs in < 30 seconds

---

## Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

---

## License

Proprietary — LocalBoost. All rights reserved.
