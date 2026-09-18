# Horse Yard Manager — PRD

## Original Problem Statement
Horse Yard Manager — One app for vaccinations, farrier, dental, physio, feed, expenses, competition entries, passports, leases and owner billing. Yards pay monthly according to number of horses.

## User Choices
- Auth: JWT-based custom auth (email + password) with password reset via Emergent-managed email
- Payments: Stripe (BYOK Flow B — shared sandbox `sk_test_emergent`, since ZA is not supported for claimable sandbox Flow A)
- Emails: Resend via Emergent (managed)
- Roles: Yard Manager + Horse Owner
- Design: Modern equestrian (saddle brown / hunter green / warm bone / ochre) — no purple gradients

## Architecture
- Backend: FastAPI + MongoDB (Motor) — `/api` prefix on all routes
- Frontend: React 19, react-router 7, Tailwind, shadcn/ui, sonner toasts, lucide-react icons, Playfair Display + DM Sans + JetBrains Mono
- Auth: httpOnly cookies, bcrypt, bearer fallback, brute force lockout, TTL-cleared reset tokens
- Stripe: emergentintegrations Checkout Sessions, webhook `/api/webhook/stripe`
- Email: httpx → integrations proxy `/api/v1/email/send`

## Implemented (2026-02)
- Register / Login / Logout / Me / Refresh / Forgot / Reset password
- Horses CRUD with passport, UELN, owner, lease status, monthly livery, image
- Care events (Vaccination / Farrier / Dental / Physio) with next-due tracking
- Feed plans (morning/midday/evening + supplements + daily cost)
- Expense ledger (categorised, billable-to-owner flag)
- Competition entries tracker
- Owner statements (auto-generated from billable care + expenses this month)
- Yard subscription checkout ($4/horse/mo) via Stripe test mode
- Dashboard summary (counts, upcoming/overdue care, monthly totals)
- Owner portal (my horses + care history + statements)

## Backlog (P1)
- Recurring reminder rule builder (auto-generate next_due dates)
- Photo/invoice attachment on care events (object storage)
- PDF export of owner statements
- Email invoices to owners via Resend
- Practitioner directory
- Passport document upload
- Lease agreement PDF generator

## P2
- Multi-yard organisation
- Feed inventory & low-stock alerts
- Show entry deadline reminders via email
- Owner self-service password reset & invitation

## Test credentials
See /app/memory/test_credentials.md
