# Analytica (System A) - Analytics Infrastructure

Developer-first analytics infrastructure for tracking interactions across emails, links, and websites.

## Setup

### 1. Prerequisites
- **Node.js**: v18 or higher.
- **PostgreSQL**: v14 or higher (if running in Persistent Mode).

### 2. Database Configuration
The project supports two modes for storing events: **Persistent Mode** (PostgreSQL) and **Smart Mock Mode** (In-memory).

#### A. Persistent Mode (PostgreSQL)
1. **Create Database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE analytica;"
   ```
2. **Initialize Schema**:
   Run the schema script to create tables, indexes, and custom enum types:
   ```bash
   psql -U postgres -d analytica -f src/db/schema.sql
   ```
3. **Configure Environment**:
   Update your `.env` file with the connection string:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/analytica
   ```

#### B. Smart Mock Mode (Development)
If you don't have PostgreSQL installed or want to run quick tests, simply **exclude** the `DATABASE_URL` from your `.env` file or set `MOCK_DB=true`.
- Data will be stored in an in-memory store.
- Analytics queries will still work through the simulated DB interface.
- **Note**: Data will be lost when the server restarts.

### 3. Application Installation
```bash
npm install
npm run dev
```

---

## Troubleshooting
- **Connection Refused**: Ensure PostgreSQL is running (`pg_isready`).
- **Authentication Failed**: Verify the user/password in `DATABASE_URL`.
- **Enum Errors**: If the schema fails, ensure you have permissions to run `DO $$` blocks and `CREATE EXTENSION`.

## APIs

### 1. Identity
- `POST /track/id` -> Returns `{ "trackingId": "..." }`

### 2. Tracking
- `GET /pixel/:trackingId` -> Invisible pixel for email opens.
- `GET /r/:trackingId?url=ENCODED_URL` -> Redirect for link clicks.

### 3. Ingestion
- `POST /events` -> Batch ingestion (used by JS SDK).

### 4. Query
- `GET /analytics/tracking/:trackingId` -> Full journey.
- `GET /analytics/link/:trackingId` -> Link analytics.
- `GET /analytics/page?url=...` -> Page analytics.

## JS SDK

Embed on your website:
```html
<script src="http://localhost:3000/sdk/analytica.js" data-endpoint="http://localhost:3000"></script>
```

---

## Validation Test Suite

### Step 1: Bootstrap ID
```bash
curl -X POST http://localhost:3000/track/id
# Note the trackingId
```

### Step 2: Email Open (Pixel)
```bash
curl -I http://localhost:3000/pixel/YOUR_ID
```

### Step 3: Link Click (Redirect)
```bash
curl -Lv "http://localhost:3000/r/YOUR_ID?url=https://google.com"
```

### Step 4: Website Activity (Batch)
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "trackingId": "YOUR_ID",
    "sessionId": "sess_123",
    "events": [
      { "eventType": "PAGE_VIEW", "metadata": { "url": "/home" } },
      { "eventType": "HEARTBEAT", "metadata": { "url": "/home" } }
    ]
  }'
```

### Step 5: Verify Journey
```bash
curl http://localhost:3000/analytics/tracking/YOUR_ID
```
# analytica-tool
