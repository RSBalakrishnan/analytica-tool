# Analytica (System A) - Analytics Infrastructure

Developer-first analytics infrastructure for tracking interactions across emails, links, and websites.

## Setup

1. **Database:**
   - Create a PostgreSQL database named `analytica`.
   - Run the schema in `src/db/schema.sql`.

2. **Environment:**
   - Copy `.env.example` to `.env`.
   - Update `DATABASE_URL`.

3. **Install & Run:**
   ```bash
   npm install
   npm run dev
   ```

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
