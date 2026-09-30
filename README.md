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
