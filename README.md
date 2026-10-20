# Astro Starter Kit: Minimal

```sh
pnpm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm install`         | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Conexión (QR-gated connection form)

The connection form lives behind a printed QR code. Non-QR visits never reach
it, and submissions are emailed to `info@iglesiafresno.com`.

### Routes

| Route                   | Access                  | Purpose                                                            |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ |
| `GET /qr/<token>`       | public (token required) | QR landing: stores a signed gate cookie, redirects to `/conectar`  |
| `GET /conectar`         | gate cookie required    | The connection form                                                |
| `POST /api/conectar`    | gate cookie required    | Validates, emails the submission, redirects to `/conectar/gracias` |
| `GET /conectar/gracias` | gate cookie required    | Confirmation page                                                  |
| `GET /visitanos`        | public                  | Plan-your-visit page; includes the public "Contáctanos" form       |
| `POST /contacto`        | public                  | Contact handler: re-renders with values on failure, redirects to   |
|                         |                         | `/contacto/gracias` on success                                     |
| `GET /contacto/gracias` | public                  | Contact confirmation page                                          |
| `POST /api/evento`      | public                  | First-party CTA beacon endpoint (`204 No Content`)                 |

Requests without a valid cookie are redirected (`302`) to `/visitanos`.
`/conectar`, `/conectar/gracias`, `/api/conectar` and `/contacto` render on
demand; every
other page stays prerendered. All gated pages are `noindex` and excluded from
`robots.txt`/the sitemap.

The token and cookie are HMAC-signed values derived from `QR_CONNECT_SECRET`
(see `src/lib/connect-gate.ts`), so nothing needs to be stored server-side.

### Local setup

```sh
cp .dev.vars.example .dev.vars   # then edit QR_CONNECT_SECRET
pnpm dev                         # workerd via the Cloudflare adapter
```

### Generate the QR URL

The QR code must contain the URL printed by:

```sh
pnpm connect:url
```

Rotating `QR_CONNECT_SECRET` (production: `npx wrangler secret put QR_CONNECT_SECRET`)
invalidates the old QR code and all open gate cookies.

### Email delivery

Two transports are supported in `src/lib/connect-email.ts`; the first one
configured wins. Validation and delivery failures re-render with all entered values and
checked options intact (422 for validation, 502 for delivery failure); only
successful submissions redirect to `/conectar/gracias`. Responses containing
visitor data are `no-store`. The form accepts URL-encoded data only, caps the
streamed body at 64 KiB, and rejects fields exceeding the displayed limits
rather than truncating them.

**Option A — Resend (`RESEND_API_KEY` secret, active as soon as it is set):**

```sh
npx wrangler secret put RESEND_API_KEY
```

Verify `iglesiafresno.com` in Resend first so it can send from
`sitio-web@iglesiafresno.com`; without a verified domain Resend rejects the
send with 403 and visitors see the delivery-error state.

**Option B — Cloudflare Email Sending (`send_email` binding):**

1. Verify the destination address so the restricted binding can deliver to it:
   `npx wrangler email routing addresses create info@iglesiafresno.com`, then
   click the verification link in the `info@` inbox.
2. Check the sender-domain configuration in Cloudflare Email Service. If needed,
   onboard `iglesiafresno.com` for outbound sending in Compute → Email Service →
   Email Sending, following the [domain configuration guide](https://developers.cloudflare.com/email-service/configuration/domains/).
   Review authentication records carefully; keep the existing Google Workspace
   inbox MX records. Do not enable inbound Email Routing on the apex just to
   send this form: that would change where `info@` receives mail.
3. The binding is already declared in `wrangler.jsonc` (`CONNECT_EMAIL`, from
   `sitio-web@iglesiafresno.com`, restricted to `info@iglesiafresno.com`).

According to [Cloudflare's current pricing](https://developers.cloudflare.com/email-service/platform/pricing/),
**sending to verified destination addresses is free on all plans**, including
when only Email Routing is configured. This fixed-recipient form does not
require a paid-plan upgrade. Sending to arbitrary recipients is the paid
Email Sending case. Production provisioning and inbox delivery still need
verification; the automated tests use the local email simulator.

Delete the `RESEND_API_KEY` secret (`npx wrangler secret delete
RESEND_API_KEY`) to switch back to the binding once the domain and destination
are verified.

### Tests

`pnpm test:e2e` runs the QR gate and validation specs. The preview server reads
`.dev.vars`; `tests/prepare-dev-vars.mjs` creates it from `.dev.vars.example`
when missing.

## Analytics (Cloudflare Web Analytics + Workers Analytics Engine)

The site uses a two-layer, cookie-free Cloudflare analytics architecture without
storing personal data:

1. **Cloudflare Web Analytics** for Core Web Vitals, pageviews, referrers, and
   geography on prerendered static pages (`/`, `/evangelio`, `/visitanos`,
   `/nosotros`, `/equipo`, `/privacidad`, `/terminos`, `/atribucion`,
   `/contacto/gracias`) and the Worker-rendered pages. Prerendered pages are served
   directly from Cloudflare Assets (`dist/`) without invoking the Worker, so
   Web Analytics is how traffic and performance metrics reach those pages.
   **Pick ONE setup method below so pageviews are not double-counted:**
   - **Option A — Automatic edge injection (Cloudflare Dashboard):** Enable Web
     Analytics automatic JS snippet injection for the proxied `iglesiafresno.com`
     zone and leave `PUBLIC_CF_WEB_ANALYTICS_TOKEN` **unset**.
   - **Option B — Explicit build-time beacon (`PUBLIC_CF_WEB_ANALYTICS_TOKEN`):**
     Disable automatic injection in the Cloudflare Dashboard and set
     `PUBLIC_CF_WEB_ANALYTICS_TOKEN=<token>` in `.env` (for local builds) or in
     your CI / Cloudflare Workers Builds environment variables so `astro build`
     renders `beacon.min.js` in `src/components/layout/base-head.astro`. (Do not
     put `PUBLIC_CF_WEB_ANALYTICS_TOKEN` in `.dev.vars`; `.dev.vars` is only
     read by the Worker runtime, not by `astro build`.)
2. **Cloudflare Workers Analytics Engine** (`ANALYTICS` binding → dataset
   `ibv_events` in `wrangler.jsonc`) for server-side funnels and first-party CTA
   beacons (`src/lib/analytics.ts`, `src/lib/connect-gate-decision.ts`,
   `src/lib/connect-submit.ts`, and `src/pages/api/evento.ts`). Allowlisted
   targets, paths and placements live in `src/lib/analytics-dimensions.ts`,
   which the browser click tracker also imports, so it must stay free of
   server-only code.
   - `gate_view` counts authorized loads of `/conectar` and
     `/conectar/gracias` (reloads included), not unique visitors.
   - `/api/evento` enforces `POST`, a 1 KiB body cap, same-origin verification
     (`Sec-Fetch-Site: same-origin` or matching `Origin`/`Referer`), and strict
     allowlists (`CTA_TARGETS`, `KNOWN_PATHS`, `KNOWN_PLACEMENTS`). In
     production, you can also attach a Cloudflare WAF rate-limiting rule to
     `URI Path eq "/api/evento"`.

### `ibv_events` dataset schema

| Column    | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index1`  | Event name (`qr_scan`, `gate_view`, `gate_blocked`, `connect_submit`, `contact_submit`, `cta_click`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `blob1`   | Event name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `blob2`   | Outcome or CTA target: `valid`, `invalid`, `authorized`, `redirect_visitanos`, `success`, `validation_error`, `delivery_error`, `honeypot`, or `CTA_TARGETS` (`maps`, `phone`, `email`, `giving`, `english_site`, `social_facebook`, `social_youtube`, `plan_visit`, `contact_cta`, `gospel_cta`)                                                                                                                                                                                                                                                                                                                                                                                                               |
| `blob3`   | Allowlisted path: `/qr` (with secret token stripped case-insensitively), `/conectar`, `/conectar/gracias`, `/contacto`, `/contacto/gracias`, `/visitanos`, `/evangelio`, `/nosotros`, `/equipo`, `/privacidad`, `/terminos`, `/atribucion`, `/api/conectar`, `/`, or `other`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `blob4`   | Detail: `cookie_issued` / `invalid_token` (`qr_scan`); `cookie_valid` (`gate_view`); `missing_cookie` / `invalid_or_expired_cookie` (`gate_blocked`); transport `cloudflare` / `resend`, error code `nombre` / `contacto` / `correo` / `mensaje` / `longitud` / `formato` / `contenido` / `envio`, or honeypot field `sitio_web` (`connect_submit`, `contact_submit`); allowlisted placement `header` / `mobile_menu` / `hero` / `footer` / `visita` / `conectar` / `ofrendas` / `nosotros` / `vision` / `contacto` / `oracion` / `oraste-sinceramente` / `conversemos` / `paso-1`…`paso-4` / `page` / `other` (`cta_click`); events before 5 Oct 2026 may also contain `banner` (retired first-service banner) |
| `blob5`   | Two-letter ISO country code (`US`, `MX`, `XX`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `blob6`   | Coarse device category (`mobile`, `desktop`, `bot`, `unknown`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `blob7`   | Comma-separated allowlisted "how heard" categories on `/conectar` (never free text)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `blob8`   | Comma-separated allowlisted ministry interest categories on `/conectar` (never free text)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `double1` | Event count (`1`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `double2` | HTTP status code (`200`, `204`, `302`, `303`, `400`, `413`, `415`, `422`, `502`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `double3` | Count of selected "how heard" checkboxes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `double4` | Count of selected ministry interest checkboxes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `double5` | Prayer request included flag (`1` or `0` on `connect_submit`; always `0` on `contact_submit` and other events)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Sample Cloudflare Analytics Engine SQL queries

Run against `https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql`.
The SQL API accepts one statement per request, so send each query separately.

```sql
-- 1. QR Connection Card Funnel (Last 30 Days)
SELECT
  blob1 AS event,
  blob2 AS outcome,
  blob4 AS detail,
  SUM(_sample_interval * double1) AS total_events
FROM ibv_events
WHERE timestamp >= NOW() - INTERVAL '30' DAY
  AND index1 IN ('qr_scan', 'gate_view', 'gate_blocked', 'connect_submit')
GROUP BY event, outcome, detail
ORDER BY total_events DESC;

-- 2. Form Health & Email Transport Reliability
-- Note: double5 (prayer flag) applies only to connect_submit.
SELECT
  blob1 AS form,
  blob2 AS outcome,
  blob4 AS transport_or_error,
  SUM(_sample_interval * double1) AS submissions,
  SUM(IF(index1 = 'connect_submit', _sample_interval * double5, 0)) AS connect_prayer_requests
FROM ibv_events
WHERE timestamp >= NOW() - INTERVAL '30' DAY
  AND index1 IN ('connect_submit', 'contact_submit')
GROUP BY form, outcome, transport_or_error
ORDER BY form, submissions DESC;

-- 3. High-Intent CTA & Outbound Clicks by Page and Placement
SELECT
  blob2 AS cta_target,
  blob3 AS page_path,
  blob4 AS placement,
  blob6 AS device,
  SUM(_sample_interval * double1) AS clicks
FROM ibv_events
WHERE timestamp >= NOW() - INTERVAL '30' DAY
  AND index1 = 'cta_click'
  AND blob6 != 'bot'
GROUP BY cta_target, page_path, placement, device
ORDER BY clicks DESC;

-- 4. Connection Card Ministry Interests & Attribution Breakdown
SELECT
  blob7 AS how_heard_combo,
  blob8 AS interests_combo,
  SUM(_sample_interval * double1) AS cards_submitted,
  SUM(_sample_interval * double5) AS with_prayer_request
FROM ibv_events
WHERE timestamp >= NOW() - INTERVAL '90' DAY
  AND index1 = 'connect_submit'
  AND blob2 = 'success'
GROUP BY how_heard_combo, interests_combo
ORDER BY cards_submitted DESC;
```
