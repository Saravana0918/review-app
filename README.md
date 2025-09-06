# NextPrint Review App (Option 3)

Lightweight Express backend + SQLite to collect customer-submitted reviews with moderation.
You can run this locally, approve reviews via the admin UI, and the approved reviews endpoint
serves JSON for your Shopify storefront to fetch and render.

## Features
- `POST /api/submit-review` accepts multipart form (name, city, rating, text, image)
- Stores uploads in `/uploads` and records in `reviews.db` (SQLite)
- `GET /api/reviews` returns approved reviews as JSON
- Simple admin UI at `/admin` (password-protected via `ADMIN_PASSWORD` env)
- `POST /api/admin/approve/:id` to approve a review via admin UI

## Quick start (local)
1. Unzip the project and open in VS Code.
2. Copy `.env.example` to `.env` and set `ADMIN_PASSWORD` and optionally `PORT`.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open in browser:
   - Submit form: http://localhost:5000/submit
   - Admin UI: http://localhost:5000/admin
   - Approved reviews JSON: http://localhost:5000/api/reviews

## How to use with Shopify
- Host this server so it's reachable from the web (Cloudflare Tunnel, ngrok, or a VPS).
- On Shopify Fan Page, embed a "Submit Review" link to the `/submit` page (or copy the form HTML into a page).
- To display reviews on your Fan Page, use `fetch("https://YOUR_SERVER/api/reviews")` and render the results (we included `reviews-widget.js` you can use).

## Notes on moderation & security
- Always keep `ADMIN_PASSWORD` strong.
- Review images are publicly accessible at `/uploads/<filename>`. If you host publicly, consider virus scanning and content moderation.
- For production, add rate-limiting, CAPTCHA, and stricter admin auth.

If you want, I can prepare a Cloudflare Tunnel guide or provide a hosted deployment option.
