# Campus Merchandise & Event Inventory Tracker

A campus merchandise and event-ticket application built as a practical, production-grade DBMS
project. The FastAPI application uses a normalized relational SQL schema with
foreign keys, unique and check constraints, composite keys, indexes, SQL views,
joins, grouped reports, full CRUD operations across all entities, and ACID transactions.
SQLite provides a zero-service local setup; the SQLAlchemy async layer keeps database
access explicit.

Buyers browse listings, customize quantities, add items to a slide-over bag,
checkout via atomic multi-item batch transactions, retrieve scannable digital
ticket passes with ISO-compliant QR codes, track/cancel orders, and update profile
details. Organizers manage full CRUD over inventory and users, operate a live ticket
check-in gate terminal, receive and dismiss stock alerts, inspect executive sales
analytics with visual SVG charts, export audit-ready CSV datasets, and execute
read-only SQL queries directly in the interactive Database Lab.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The app and OpenAPI docs run at `http://localhost:8000` and
`http://localhost:8000/docs`. On first startup, SQLAlchemy creates
`campus_inventory.db` and its tables and views. Override the database with
`DATABASE_URL`, for example `sqlite+aiosqlite:///./local.db`.

To run the automated test suite:
```powershell
pytest -v
```

The Docker Compose setup persists the SQL database in a named volume:

```bash
docker compose up --build
```

Create sample listings with `python scripts/seed_inventory.py`. It is safe to
rerun; existing sample SKUs are left unchanged. To create organizers, set
`ORGANIZER_INVITE_CODE` and supply that code during registration. Change
`JWT_SECRET` before deploying outside local development.

## Complete CRUD Operations

The system exposes RESTful CRUD operations across all relational entities:

### 1. Items (`/items`)
- **Create:** `POST /items` — Add a new merchandise or ticket listing.
- **Read:** `GET /items`, `GET /items/{id}` — Filter and fetch item details.
- **Update:** `PATCH /items/{id}`, `POST /items/{id}/restock` — Update catalog details and stock levels.
- **Delete:** `DELETE /items/{id}` — Permanently delete unused listings or safely archive historical items to preserve relational order history.

### 2. Users (`/users` & `/auth`)
- **Create:** `POST /users`, `POST /auth/register` — Provision student buyers or organizer accounts.
- **Read:** `GET /users`, `GET /users/{id}`, `GET /auth/me` — List users, inspect order histories, search by name/email, and filter by role.
- **Update:** `PATCH /users/{id}`, `PATCH /auth/profile` — Update name, email, role, or credentials.
- **Delete:** `DELETE /users/{id}` — Delete accounts, with foreign key integrity checks preventing orphan purchase orders.

### 3. Orders (`/orders`)
- **Create:** `POST /orders`, `POST /orders/batch` — Place single orders or atomic cart checkouts.
- **Read:** `GET /orders`, `GET /orders/me`, `GET /orders/{id}` — Track purchase history and receipt snapshots.
- **Update:** `PATCH /orders/{id}` — Update order status (confirmed / cancelled).
- **Delete:** `DELETE /orders/{id}` — Purge cancelled test orders.

### 4. Stock Alerts (`/alerts`)
- **Create:** `POST /alerts` — Create manual stock threshold alerts.
- **Read:** `GET /alerts`, `GET /alerts/{id}` — Query unacknowledged and historical alert logs.
- **Update:** `PATCH /alerts/{id}`, `POST /alerts/{id}/ack` — Acknowledge and update alert states.
- **Delete:** `DELETE /alerts/{id}`, `DELETE /alerts` — Dismiss individual alerts or bulk-purge acknowledged alerts.

## Relational schema

| Table | Purpose and DBMS concepts |
|---|---|
| `users` | User identity; unique email and role `CHECK`. |
| `items` | Merchandise/events; unique SKU, nonnegative stock/price checks, sale-window check, and active/name index. |
| `orders` | Purchase facts with buyer/item foreign keys and immutable SKU/name/price snapshots. Indexed by buyer/date and item/status. |
| `ticket_codes` | One row per ticket code, primary key on code, order foreign key, nullable redemption timestamp. Avoids multivalued ticket-code fields. |
| `purchase_counters` | Per-buyer limit; composite primary key `(item_id, buyer_id)` and nonnegative quantity check. |
| `alerts` | Stock threshold events linked to items and indexed by creation time. |

`items.created_by`, `orders.buyer_id`, `orders.item_id`, `ticket_codes.order_id`,
and `alerts.item_id` are foreign keys. The organizer's **Database Lab**
(`/organizer/database`) displays the live database engine, row counts, actual
column types/nullability/keys, constraints, indexes, relationships, and an
**Interactive SQL Console** with query performance benchmarking.

The schema separates users, items, orders, tickets, and alerts to eliminate
insertion/update/deletion anomalies. Ticket codes are atomic rows. Purchase
counters depend on their full composite key. An order snapshots the catalog
values at purchase time deliberately: historical receipts must not change when
an organizer edits an item. In a relational design, these snapshots belong to
the order fact rather than being recalculated from the current catalog.

## Queries, views, and transactions

`sales_by_item` and `low_stock_items` are SQL views created at startup.
`GET /reports/summary` reads those views; organizer order listings use SQL
joins across `orders` and `users`; the Database Lab runs `GROUP BY` queries and
introspects model constraints/indexes.

Order placement (`POST /orders` and `POST /orders/batch`) wraps buyer-limit
upserts, conditional stock reservations, order inserts, ticket-code inserts,
and threshold alerts in a single ACID transaction. If any item write fails,
all writes roll back. The stock update is conditional (`stock >= quantity`)
and serialized; the app never accepts negative stock. Cancellation restores
stock and changes order state in an atomic transaction. Ticket redemption
uses a conditional update ensuring each pass can only be checked in once.

## User-Based Recommendation Engine

The platform includes a personalized recommendation algorithm (`GET /items/recommendations`) that analyzes relational purchase records to suggest tailored gear and events:
1. **Peer Collaborative Filtering:** Identifies peer buyers who purchased the same items (`orders.buyer_id != user_id`) and computes an affinity score based on co-occurrence across transactions.
2. **Category / Kind Affinity:** Automatically identifies the user's most frequently purchased item kind (`merch` vs `ticket`) and selects top-selling items within that category.
3. **Campus Popularity & Cold Start:** Fallback mechanism for new buyers that ranks campus bestsellers by total sales volume (`items.sold DESC`), guaranteeing relevant recommendations even before first purchase.
4. **Interactive Badging:** In the Shop view, recommended items display reason badges (e.g. `✨ Frequently bought by students with similar taste`, `Top trending in merch based on your picks`, or `Campus Bestseller · Trending Now`).

## Interactive SQL Console

Organizers can run ad-hoc read-only SQL queries directly against the database
with performance benchmarking (e.g. `⚡ Executed in 1.4 ms`):
- Includes 1-click preset queries demonstrating SQL views, 3-table relational
  JOINs, aggregations (`GROUP BY`), and composite key indexing.
- Enforces strict safety rules (blocks destructive keywords like `DROP`, `DELETE`,
  `UPDATE`, `INSERT`, `ALTER`).

## Data Export

The system provides 1-click CSV data export endpoints for accounting and audit:
- `GET /reports/export/orders.csv`: Full transaction log with buyer and pricing snapshots.
- `GET /reports/export/inventory.csv`: Real-time catalog snapshot with stock and limits.

## Run the concurrency exercise

The included flash-sale test races 60 buyers for 10 units and checks the stock
and alert invariants:

```powershell
python scripts/flash_sale_test.py
```

## API summary

```
POST /auth/register              POST /auth/login               GET /auth/me              PATCH /auth/profile
GET/POST /users                   GET/PATCH/DELETE /users/{id}
GET/POST /items                   GET/PATCH/DELETE /items/{id}   POST /items/{id}/restock
GET /items/recommendations
POST /orders                      POST /orders/batch             GET/DELETE /orders/{id}   PATCH /orders/{id}
GET /orders                       POST /orders/{id}/cancel       POST /orders/check-in     GET /orders/me
GET/POST/DELETE /alerts           GET/PATCH/DELETE /alerts/{id}  POST /alerts/{id}/ack
GET /reports/summary              GET /reports/database          POST /reports/query
GET /reports/export/orders.csv    GET /reports/export/inventory.csv
WS   /ws
```

## Syllabus mapping

| Syllabus units | Implemented project work |
|---|---|
| I — DBMS fundamentals, ER model, architecture, relational data model | Live normalized schema, primary/foreign keys, relationship model, unique indexes, full CRUD API, application/database layers. |
| II — Functional dependencies and normalization | Separate entities; atomic ticket-code rows; composite-key purchase counters; order snapshot rationale and anomaly discussion in the Database Lab. |
| III — SQL, joins, views, and transaction management | Complete CRUD endpoints; SQL joins; `GROUP BY`; live SQL views; explicit transactions, conditional updates, batch multi-item checkouts, and interactive SQL console. |
| IV — NoSQL databases | Prior MongoDB model and one-time importer provide a comparison point; MongoDB is not part of the running application. |
| V — Big data and distributed databases | The current local deployment does not claim Hadoop/Spark or distributed query processing. Multi-instance event transport, replication, and recovery are documented as scale-out work. |
| VI — Cloud and advanced databases | Cloud hosting, graph/spatial databases, and data-mining systems are extension topics, not enabled services. |

## Roles

| Capability | Buyer | Organizer |
|---|:---:|:---:|
| Browse active items, flash sales & live stock | ✅ | ✅ |
| Personalized 'Recommended For You' feed | ✅ | ✅ |
| Quantity selection & slide-over campus bag | ✅ | |
| Atomic multi-item cart checkout | ✅ | |
| Digital Event Pass with ISO-compliant SVG QR code | ✅ | |
| Update own profile & password | ✅ | ✅ |
| Place/cancel own orders and access ticket codes | ✅ | |
| Create/edit/restock/archive items | | ✅ |
| Create/read/update/delete campus user accounts | | ✅ |
| View all orders, reports, DBMS lab, and alerts | | ✅ |
| Dismiss & bulk-purge stock alerts | | ✅ |
| Interactive SQL Console & execution benchmarking | | ✅ |
| Export orders and inventory to CSV | | ✅ |
| Cancel any eligible order; check in tickets | | ✅ |
