# Creator Card API

A RESTful API for managing digital creator cards — shareable profile pages that let creators list their links, services, and rates with optional access control.

## Tech Stack

- **Runtime:** Node.js (ES2022, CommonJS)
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Validation:** Custom VSL (Validator Spec Language) schema engine
- **Logging:** Pino (structured JSON logs)
- **Queue:** Bull (Redis-backed background jobs)
- **Email:** Resend
- **Code Quality:** ESLint (Airbnb base) + Prettier + Husky + commitlint

## Architecture

The project follows a layered, clean architecture pattern:

```
Request → Endpoint → Middleware (optional) → Service → Repository → Database
```

| Layer | Location | Responsibility |
|---|---|---|
| Endpoints | `endpoints/` | HTTP routing, request parsing, response shaping |
| Services | `services/` | Business logic and validation |
| Repositories | `repository/` | Database access (Mongoose queries) |
| Models | `models/` | Mongoose schema definitions |
| Middlewares | `middlewares/` | Cross-cutting concerns (auth, logging) |
| Workers | `workers/` | Background job processors (Bull queues) |
| Core | `core/` | Shared utilities — logger, validator, errors, JWT, etc. |

Path aliases keep imports clean:

```js
require('@app-core/validator')   // core utilities
require('@app/services/...')     // application services
require('@app/messages/...')     // error message definitions
```

## API Endpoints

### Creator Cards

#### `POST /creator-cards`

Create a new creator card.

**Request body:**
```json
{
  "title": "My Card",
  "description": "Frontend developer & designer",
  "creator_reference": "01ARZ3NDEKTSV4RRFFQ69G5FA",
  "status": "published",
  "access_type": "public",
  "links": [
    { "title": "Portfolio", "url": "https://example.com" }
  ],
  "service_rates": {
    "currency": "USD",
    "rates": [
      { "name": "UI Design", "amount": 150, "description": "Per hour" }
    ]
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | Yes | 3–100 chars |
| `description` | string | No | Max 500 chars |
| `slug` | string | No | Auto-generated from title if omitted; 5–50 chars |
| `creator_reference` | string | Yes | Exactly 20 chars (creator identifier) |
| `status` | string | Yes | `draft` or `published` |
| `access_type` | string | No | `public` (default) or `private` |
| `access_code` | string | No | Required when `access_type` is `private`; exactly 6 chars |
| `links` | array | No | Array of `{ title, url }` objects |
| `service_rates` | object | No | `{ currency: NGN|USD|GBP|GHS, rates: [...] }` |

**Success response `200`:**
```json
{
  "status": "success",
  "message": "Creator card created",
  "data": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FA",
    "title": "My Card",
    "slug": "my-card",
    "status": "published",
    "access_type": "public",
    "access_code": null,
    "links": [...],
    "service_rates": {...},
    "created_at": 1720000000000,
    "updated_at": 1720000000000,
    "deleted": null
  }
}
```

---

#### `GET /creator-cards/:slug`

Retrieve a published creator card by its slug.

```
GET /creator-cards/my-card
GET /creator-cards/my-card?access_code=ABC123   # for private cards
```

- Returns `404` if the card does not exist or has been deleted.
- Returns `404` if the card is in `draft` status.
- Returns `403` if the card is `private` and no `access_code` is provided.
- Returns `403` if the `access_code` is incorrect.
- The `access_code` field is never returned in GET responses.

---

#### `DELETE /creator-cards/:slug`

Soft-delete a creator card. Requires the `creator_reference` in the request body to confirm ownership.

**Request body:**
```json
{
  "slug": "my-card",
  "creator_reference": "01ARZ3NDEKTSV4RRFFQ69G5FA"
}
```

Deleted cards are not removed from the database — a `deleted` timestamp is set instead.

---

### Onboarding

#### `POST /onboarding/login`

Validates login credentials and schedules a background validation job via Bull.

**Request body:**
```json
{ "username": "your-username" }
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Redis (for Bull job queue)

### Install dependencies

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Key variables:

```
MONGO_URI=mongodb://localhost:27017/creator-card-api
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

### Run the dev server

```bash
npm run dev
```

### Run tests

```bash
npm test
```

## Data Model

### Creator Card

| Field | Type | Description |
|---|---|---|
| `_id` | ULID | Auto-generated unique ID |
| `title` | String | Display name of the card |
| `description` | String | Short bio or tagline |
| `slug` | String | URL-friendly identifier (unique) |
| `creator_reference` | String | ID of the owning creator |
| `links` | Mixed | Array of link objects `{ title, url }` |
| `service_rates` | Mixed | Pricing info with currency and rate tiers |
| `status` | String | `draft` or `published` |
| `access_type` | String | `public` or `private` |
| `access_code` | String | 6-character code for private cards |
| `created_at` | Number | Unix timestamp (ms) |
| `updated_at` | Number | Unix timestamp (ms) |
| `deleted` | Number/null | Soft-delete timestamp; `null` if active |
