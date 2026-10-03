# HomeStock

Shared household inventory in Hebrew, built with React/Vite, Vercel Functions and Neon Postgres + managed Neon Auth.

## Deployment

Import this repository into Vercel using the Vite preset (root directory `/`, output `dist`). Connect Neon to this project with Auth enabled. Required **server-only** environment variables:

- `DATABASE_URL` (also accepts `STORAGE_URL` or `POSTGRES_URL`)
- `NEON_AUTH_BASE_URL` (also accepts `NEON_AUTH_URL`)

The native Neon integration normally injects these. Redeploy after connecting or changing variables. Never add a `VITE_` prefix to database credentials. Neon Auth must trust the site's origin; the native integration normally registers production/preview origins automatically.

Tables are created non-destructively on the first authenticated stock request. Authentication is validated with Neon on every request. Access to inventory is restricted by server-verified household membership. The browser cannot choose another household ID.

## Using the app

Register, create a household, optionally import the list stored under this site's browser origin, then share the invitation code privately. Your partner registers a separate account and joins using that code. Generating a new invitation invalidates the previous code.

Changes are saved per item, with version checks to reject conflicting edits/deletes. The list refreshes every 12 seconds while visible and when the tab receives focus. Failed writes keep the edit form open. Existing local data is never overwritten by cloud data. A local list on the old GitHub Pages domain belongs to that origin and is not automatically available on Vercel.

## Development

`npm ci` then `npm run build`. Use `vercel dev` for local API functions with server environment variables. Plain Vite serves only the UI. GitHub Pages remains a static build and cannot provide the new cloud API; use the Vercel address for shared inventory.

`npm test` runs API authentication/validation checks. Integration verification against the actual connected Neon deployment is required before confirming end-to-end sync.
