# Campus Merchandise & Event Inventory Tracker

A real-time tracking application for student-association merchandise logistics
and event ticketing. Buyers can browse merchandise and events, purchase stock-safe
orders, retrieve their ticket codes, and track their orders. Committee organizers
can manage listings and sale windows, adjust inventory, monitor alerts, and view
sales reports. On event day, organizers can validate and redeem attendee ticket
codes from the check-in screen; each code can only be used once.

The FastAPI and MongoDB application uses atomic stock reservations and per-buyer
purchase limits to handle concurrent flash-sale orders. Live WebSocket updates
keep buyers informed about stock changes and notify organizers when inventory
crosses an alert threshold. Buyer and organizer roles have distinct permissions.

## Run it

```bash
docker compose up --build          # API on http://localhost:8000, docs at /docs
# or locally (needs a MongoDB on localhost:27017):
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://localhost:8000/` for the app and `/docs` for the Swagger UI. The
frontend supports direct links and browser history for `/login`, `/register`,
`/shop`, `/my-orders`, `/organizer`, `/organizer/inventory`,
`/organizer/orders`, `/organizer/check-in`, `/organizer/alerts`, and
`/organizer/reports`. The
`/my-orders` page avoids colliding with the existing `/orders` API endpoint.
Pages are role-gated in the frontend and protected again by the API.

Sign up from `/register` or `POST /auth/register`. Organizer accounts require
the invite code configured with `ORGANIZER_INVITE_CODE`. Sign-in lasts for the
current browser tab; signing out clears the session token.

To add fictional campus merch and event listings to MongoDB, run
`python scripts/seed_inventory.py`. The seed is safe to rerun: existing sample
SKUs are left unchanged.

Prove the concurrency handling (60 buyers, 10 units):

```bash
python scripts/flash_sale_test.py
```

## Roles

| Capability                               | Buyer | Organizer |
|------------------------------------------|:-----:|:---------:|
| Browse active items, WebSocket stock feed|  ✅   |    ✅     |
| Place / cancel own orders                |  ✅   |           |
| Create / edit / restock items            |       |    ✅     |
| View all orders, reports, alerts         |       |    ✅     |
| Cancel any order                         |       |    ✅     |

`POST /auth/register` creates a **buyer**. Supplying `organizer_code` equal to
`ORGANIZER_INVITE_CODE` creates an **organizer** (committee members get the code).

## How concurrency is handled

No locks, no replica set needed — everything rests on MongoDB's single-document atomicity:

1. **Stock reservation** – one `find_one_and_update({_id, stock: {$gte: qty}}, {$inc: {stock: -qty}})`.
   The check and decrement are a single atomic op, so stock can't go negative however many requests race.
2. **Per-buyer limit** – a `purchase_counters` doc claimed with a conditional upsert
   (`qty <= limit - n`); a failed condition surfaces as `DuplicateKeyError` → 409.
3. **Compensation** – if a later step fails, earlier claims are rolled back.
4. **Cancel** – atomic `confirmed → cancelled` transition so a double-cancel can't restore stock twice.

Multi-item carts would need Mongo transactions (replica set); this design keeps one item per order.

## Inventory alerts

After each stock change, an alert (`low_stock` / `sold_out`) is stored in `alerts` **only when that
change crosses the threshold** (`previous > threshold >= new`), so exactly one alert fires even under
a race. Organizers receive it instantly over WebSocket and can list/acknowledge via `/alerts`.

## Real-time

`ws://host/ws?token=<JWT>` — all users get `stock_update`; organizers also get `alert`.
The hub is in-process; for multiple workers use Redis pub/sub or Mongo change streams.

## Endpoints (summary)

```
POST /auth/register  /auth/login   GET /auth/me
GET  /items  /items/{id}           POST /items            PATCH /items/{id}   POST /items/{id}/restock
POST /orders          GET /orders/me (buyer)   GET /orders (organizer)   POST /orders/{id}/cancel
POST /orders/check-in (organizer; redeem a ticket code once)
GET  /alerts          POST /alerts/{id}/ack    GET /reports/summary
WS   /ws
```

## Next steps

Integer minor-unit pricing (paise/cents), payment gateway webhook with order `pending` state + reservation
expiry (TTL index), ticket check-in endpoint, rate limiting, refresh tokens, pytest suite.
