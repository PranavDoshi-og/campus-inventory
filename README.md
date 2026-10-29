# Campus Merchandise & Event Inventory Tracker

A campus merchandise and event-ticket application built as a practical DBMS
project. The FastAPI application uses a normalized relational SQL schema with
foreign keys, unique and check constraints, composite keys, indexes, SQL views,
joins, grouped reports, and ACID transactions. SQLite provides a zero-service
local setup; the SQLAlchemy async layer keeps database access explicit.

Buyers browse listings, buy merchandise and tickets, retrieve ticket codes, and
track or cancel orders. Organizers manage inventory, ticket check-in, low-stock
alerts, and sales reports. WebSocket updates notify connected clients about
stock changes. Organizer pages are role-gated in the UI and API.

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

The Docker Compose setup persists the SQL database in a named volume:

```bash
docker compose up --build
```

Create sample listings with `python scripts/seed_inventory.py`. It is safe to
rerun; existing sample SKUs are left unchanged. To create organizers, set
`ORGANIZER_INVITE_CODE` and supply that code during registration. Change
`JWT_SECRET` before deploying outside local development.

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
column types/nullability/keys, constraints, indexes, relationships, and SQL
query examples.

The schema separates users, items, orders, tickets, and alerts to reduce
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

Order placement wraps the buyer-limit upsert, conditional stock reservation,
order insert, ticket-code inserts, and any threshold alert in one transaction.
If any write fails, all writes in that transaction roll back. The stock update
is conditional (`stock >= quantity`) and the DBMS serializes concurrent SQLite
writes; the app never accepts a negative stock value. Cancellation restores
stock and changes order state in a transaction. Ticket redemption uses a
conditional update so a code can only be checked in once.

SQLite is ideal for a self-contained coursework demo. This version deliberately
uses SQLite-specific transaction locking and upserts; PostgreSQL would require
dialect-specific transaction/upsert code and an async driver before it can be
selected. For multi-instance production, also use a shared event transport for
WebSockets, and define backups/recovery and schema migrations. `create_all` is
for this project's initial schema; use a migration tool such as Alembic when
evolving a deployed schema.

## Import existing MongoDB data

The application no longer reads MongoDB. Existing MongoDB data is not deleted.
To copy the former application collections into a **fresh** SQL database:

```powershell
$env:DATABASE_URL = "sqlite+aiosqlite:///./campus_inventory_migrated.db"
python scripts/migrate_mongo_to_sql.py --mongo-uri mongodb://localhost:27017
```

The importer maps old document IDs to SQL IDs, creates normalized ticket rows,
preserves order snapshots and check-in state, and commits the import as one
transaction. It refuses to import into a non-empty SQL target. Keep the source
MongoDB backup until you have verified the imported records.

## Run the concurrency exercise

The included flash-sale test races 60 buyers for 10 units and checks the stock
and alert invariants:

```powershell
python scripts/flash_sale_test.py
```

## API summary

```
POST /auth/register      POST /auth/login       GET /auth/me
GET/POST /items           GET/PATCH /items/{id}   POST /items/{id}/restock
POST /orders              GET /orders/me          GET /orders
POST /orders/{id}/cancel  POST /orders/check-in
GET /alerts               POST /alerts/{id}/ack
GET /reports/summary      GET /reports/database
WS   /ws
```

## Syllabus mapping

| Syllabus units | Implemented project work |
|---|---|
| I — DBMS fundamentals, ER model, architecture, relational data model | Live normalized schema, primary/foreign keys, relationship model, unique indexes, API/application/database layers. |
| II — Functional dependencies and normalization | Separate entities; atomic ticket-code rows; composite-key purchase counters; order snapshot rationale and anomaly discussion in the Database Lab. |
| III — SQL, joins, views, and transaction management | CRUD endpoints; SQL joins; `GROUP BY`; live SQL views; explicit transactions and conditional updates. |
| IV — NoSQL databases | Prior MongoDB model and one-time importer provide a comparison point; MongoDB is not part of the running application. |
| V — Big data and distributed databases | The current local deployment does not claim Hadoop/Spark or distributed query processing. Multi-instance event transport, replication, and recovery are documented as scale-out work. |
| VI — Cloud and advanced databases | Cloud hosting, graph/spatial databases, and data-mining systems are extension topics, not enabled services. |

## Roles

| Capability | Buyer | Organizer |
|---|:---:|:---:|
| Browse active items and receive stock updates | ✅ | ✅ |
| Place/cancel own orders and access own ticket codes | ✅ | |
| Create/edit/restock items | | ✅ |
| View all orders, reports, DBMS lab, and alerts | | ✅ |
| Cancel any eligible order; check in tickets | | ✅ |
