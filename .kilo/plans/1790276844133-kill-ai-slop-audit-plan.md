# Remove decorative kickers

## Decision

Delete uppercase tracked labels sitting above headings. Keep real labels:

- Brand wordmark (header/footer Oswald “Iglesia Bautista / Victory”)
- Footer column titles (`Explorar`, `Conectar`, `Recursos`)
- Job titles on `/equipo` (`Pastor principal`, `Líder del Ministerio en Español`) — **user-confirmed keep; do not touch the `<p>`+`<h2>` name blocks in `equipo.astro`**
- Service-time / location field labels (data, not kickers)

On `/equipo` only the two job-title labels are exempt. The `Liderazgo` hero eyebrow is still removed (user-confirmed). Do not apply other kill-ai-slop leads in this pass.

## Tasks

### 1. Drop `PageHero` eyebrow

`src/components/layout/page-hero.astro`: remove the `eyebrow` prop from `Props`, its destructure, and the `<p>` at lines 67–71. Heading stays first in the overlay.

Remove `eyebrow="…"` from every call site:

- `src/components/evangelio/hero.astro` — “El mensaje de la salvación”
- `src/pages/equipo.astro` — `eyebrow="Liderazgo"` (hero only — the job titles further down the page stay)
- `src/pages/nosotros.astro` — “Nosotros”
- `src/pages/visitanos.astro` — “Bienvenido”
- `src/pages/terminos.astro` / `privacidad.astro` — “Legal”
- `src/pages/atribucion.astro` — “Créditos”

**Guard:** in `equipo.astro`, touch nothing below the `<PageHero>` element. The `<p class="mb-1 font-semibold text-primary text-sm tracking-widest uppercase">Pastor principal</p>` and `Líder del Ministerio en Español` labels (currently lines 61–65 and 90–94) must remain unchanged.

### 2. Home section kickers

Delete the gold uppercase `<p>` above each section `h2`:

| File                                            | Copy to delete                                  |
| ----------------------------------------------- | ----------------------------------------------- |
| `src/components/home/ministries.astro:69-73`    | Visión                                          |
| `src/components/home/ministries.astro:117-121`  | Destacado                                       |
| `src/components/home/who-we-are.astro:48-52`    | Quiénes somos                                   |
| `src/components/home/giving.astro:15-19`        | Ofrendas                                        |
| `src/components/home/plan-visit.astro:26-30`    | Planea Tu Visita (kicker only; keep the button) |
| `src/components/home/get-connected.astro:12-16` | Conéctate                                       |
| `src/components/home/get-connected.astro:29-33` | Nuestro equipo                                  |
| `src/components/home/get-connected.astro:52-56` | Evangelio                                       |

Keep the gold bar in `who-we-are.astro:47` (`h-0.5 w-12 bg-primary`); it sits above the heading after the kicker is gone.

### 3. Homepage hero church-name kicker

`src/components/hero/hero-courtyard.astro`: delete both “Iglesia Bautista Victory” `<p>`s (desktop ~121–124, mobile ~208–212). Drop the leftover `mt-3` / `mt-4` on the following `h1`s so the title is not inset from a missing line.

### 4. Tests

`tests/vision-bento.spec.ts:142` asserts `getByText("Visión", { exact: true })`. Change that to the remaining heading, e.g. `getByRole("heading", { name: "Lo que nos guía." })`. No other specs assert kicker copy.

### 5. Spacing

After each deletion, collapse any `mb-*` that existed only to separate kicker from heading. Do not restyle remaining type.

## Out of scope

- Footer nav headings, job titles, service-time/location labels, brand wordmark
- Other slop (icon tiles, `transition-all`, verse-card gradient, `--font-serif`)

## Validation

- `pnpm check`
- `pnpm exec playwright test tests/vision-bento.spec.ts tests/hero-courtyard.spec.ts tests/evangelio-story.spec.ts`
- Spot-check: home (hero, vision, who-we-are, giving, plan-visit, get-connected), `/evangelio`, `/nosotros`, `/visitanos`, `/equipo` — on `/equipo` confirm “Liderazgo” is gone while “Pastor principal” and “Líder del Ministerio en Español” still render above the names

## Risks

Low. Copy-only deletions. Hero courtyard tests bind to the title box — dropping the kicker slightly raises the `h1`; re-run that spec. Vision bento layout tests should be unaffected once the “Visión” assertion is updated. Main hazard is over-deleting on `/equipo`; the guard in task 1 calls out the exact lines to preserve.
