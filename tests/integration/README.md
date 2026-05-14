# Integration Flow Tests

These tests verify the full business flows by calling the **real running API** — no mocks.

## Prerequisites

1. SQL Server is running and reachable
2. `backend/.env` is configured with correct DB credentials
3. Seed data has been applied: `npm run seed`
4. The backend server is running: `npm run dev`

## Running the tests

```bash
# From the backend/ directory:
npm run test:integration
```

To target a different server:

```bash
BASE_URL=http://staging-server:3000/api/v1 npm run test:integration
```

## Test files

| File | What it tests |
|------|--------------|
| `flows/01-auth.flow.test.ts` | Login, token validation, unauthorized access |
| `flows/02-inventory.flow.test.ts` | Warehouses, products, stock adjustment, transactions |
| `flows/03-sale-lifecycle.flow.test.ts` | Full sale: draft → confirm → dispatch → deliver → pay; cancellation with stock restore |

## Notes

- Tests create isolated data (unique SKU/email per run) so they are safe to run against dev/staging
- Each test has a 60-second timeout since network calls and DB writes take time
- Tests run sequentially (`--runInBand`) within each file to maintain lifecycle order
- Default credentials used: `admin@democompany.com` / `Admin123!`
