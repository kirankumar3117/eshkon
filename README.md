# Page Studio

A production-grade WYSIWYG page studio that loads page definitions from Contentful, lets authorised users edit them visually, previews them as rendered landing pages, and publishes immutable, semver-versioned releases.

---

## 1. Architecture Overview

```
  Contentful CMS
       │
       │  contentfulClient.ts  ← only file allowed to import 'contentful'
       │  contentfulAdapter.ts ← maps raw Entry fields → Page (validated by Zod)
       ▼
  ┌──────────────────┐
  │   Page (domain)  │  Zod-validated, TypeScript-strict
  └────────┬─────────┘
           │
    ┌──────┴───────────────────────────────────────────┐
    │                                                  │
    ▼ Server Component                                 ▼ Server Component
┌──────────────────────┐                   ┌──────────────────────────┐
│  /preview/[slug]     │                   │  /studio/[slug]          │
│  (read-only render)  │                   │  (fetches initialPage,   │
│  sections → registry │                   │   passes to client)      │
│  → section component │                   └───────────┬──────────────┘
└──────────────────────┘                               │ initialPage prop
                                                       ▼
                                           ┌──────────────────────────┐
                                           │  StudioClient            │
                                           │  'use client'            │
                                           │  └─ StoreProvider        │
                                           │     └─ StudioInitializer │
                                           │        (loads Redux)     │
                                           └───────────┬──────────────┘
                                                       │
                                           ┌───────────▼──────────────┐
                                           │  Redux Store             │
                                           │  ┌─────────────────────┐ │
                                           │  │ draftPage (persist) │─┼──▶ localStorage
                                           │  │ ui                  │ │    key: page-studio-draft
                                           │  │ publish             │ │
                                           │  └─────────────────────┘ │
                                           └───────────┬──────────────┘
                                                       │
                                           ┌───────────▼──────────────┐
                                           │  StudioLayout            │
                                           │  ┌──────┬───────┬──────┐ │
                                           │  │Sect. │ Live  │Props │ │
                                           │  │List  │Preview│Panel │ │
                                           │  └──────┴───────┴──────┘ │
                                           └───────────┬──────────────┘
                                                       │ POST /api/publish
                                                       ▼
                                           ┌──────────────────────────┐
                                           │  /api/publish            │
                                           │  1. Verify publisher role│
                                           │  2. Validate page (Zod)  │
                                           │  3. Load latest snapshot │
                                           │  4. calculateBump()      │
                                           │  5. semver.inc()         │
                                           │  6. saveSnapshot()       │
                                           └───────────┬──────────────┘
                                                       │
                                           ┌───────────▼──────────────┐
                                           │  releases/               │
                                           │    <slug>/               │
                                           │      1.0.0.json  ←─ immutable
                                           │      1.1.0.json  ←─ immutable
                                           │      2.0.0.json  ←─ immutable
                                           └──────────────────────────┘
```

### Request-level security (two layers)

```
Browser request
    │
    ▼
Next.js Middleware (edge)           ← src/middleware.ts
  /studio/* → must be editor|publisher (redirect to /login otherwise)
  /api/publish → must be publisher (return 403 otherwise)
    │
    ▼
API Route / Server Component
  Re-checks role via getToken()     ← never trusts client-supplied claims
```

---

## 2. Redux Slice Responsibilities

### `draftPage`
**Owns:** `page: Page | null`, `isDirty: boolean`, `lastSaved: string | null`

**Actions:** `loadPage`, `addSection`, `removeSection`, `reorderSections`, `updateSectionProps`, `resetDraft`

**Persisted to localStorage** (key: `page-studio-draft`) via redux-persist. On studio load the persisted draft is rehydrated first; the server only re-loads from Contentful if the slug differs.

**Does NOT own:** UI interaction state, publish pipeline state, auth/session.

---

### `ui`
**Owns:** `selectedSectionId: string | null`, `panelOpen: boolean`, `previewMode: 'desktop' | 'mobile'`

**Actions:** `selectSection`, `togglePanel`, `setPreviewMode`

**Not persisted** — resets on every page load.

**Does NOT own:** page content, publish results, session data.

---

### `publish`
**Owns:** `status: 'idle' | 'publishing' | 'success' | 'error'`, `lastVersion`, `error`, `changelog`

**Actions:** `startPublish`, `publishSuccess`, `publishFailure`

**Not persisted** — reflects the result of the current/last publish attempt only.

**Does NOT own:** the page being published, user identity, snapshot files.

---

## 3. Contentful Model Structure + Adapter

### Required content types

**`page`**

| Field      | Type                | Notes                    |
|------------|---------------------|--------------------------|
| `pageId`   | Short text (Symbol) | Unique logical identifier |
| `slug`     | Short text (Symbol) | URL path segment          |
| `title`    | Short text (Symbol) | Display title             |
| `sections` | References (many)   | Linked `section` entries  |

**`section`**

| Field   | Type              | Notes                                             |
|---------|-------------------|---------------------------------------------------|
| `id`    | Short text        | Stable section identifier (used for diff)         |
| `type`  | Short text        | One of: `hero`, `featureGrid`, `testimonial`, `cta` |
| `props` | JSON object       | Shape validated by Zod per section type           |

### Adapter explanation (`src/lib/contentful/contentfulAdapter.ts`)

1. Calls `getClient(preview)` — the only way to obtain a Contentful SDK client.
2. Queries `content_type: 'page'` with `'fields.slug': slug` and `include: 2` to resolve linked section entries.
3. Maps **each field explicitly** — no spreading of raw `entry.fields`.
4. Passes the mapped object through `validatePage()` (Zod) before returning.
5. All SDK errors are caught and rethrown as `ContentfulError`.

`contentfulClient.ts` is the **sole file** that imports from `'contentful'`. All other code uses `getClient()` or `fetchPage()`.

---

## 4. Publish Flow + SemVer Rules

### Step-by-step

```
1.  Publisher clicks "Publish" in the studio toolbar.
2.  Redux: startPublish() sets status → 'publishing'.
3.  Browser POSTs { slug, page } to /api/publish.
4.  Edge middleware verifies publisher role (JWT); rejects with 403 if not.
5.  API route re-verifies role server-side (never trusts client claims).
6.  Page data is validated through Zod (PageValidationError → 422).
7.  Latest snapshot is loaded from releases/<slug>/ (or null if first publish).
8.  calculateBump(latest.page, currentPage) computes the semver bump level.
9.  If bump === 'none' → return 200 with existing version (idempotent, no write).
10. If no previous snapshot → version is always '1.0.0'.
11. Otherwise → semver.inc(latestVersion, bump) produces the next version.
12. Immutable snapshot saved to releases/<slug>/<version>.json (throws if exists).
13. API returns { version, changelog[], snapshot, idempotent }.
14. Redux: publishSuccess() sets status → 'success' and stores version.
```

### SemVer bump rules (highest wins when multiple changes occur)

| Bump    | Trigger                                                         |
|---------|-----------------------------------------------------------------|
| `major` | Section **removed** from the page                               |
| `major` | Section **type changed** (e.g. `hero` → `cta`)                 |
| `major` | **Required prop removed** from an existing section              |
| `major` | Page **slug changed**                                           |
| `minor` | Section **added** to the page                                   |
| `minor` | **Optional or required prop added** to an existing section      |
| `patch` | **Prop value changed** (text, URL, etc.)                        |
| `patch` | Section **order changed** (same ids, different sequence)        |
| `patch` | Page **title changed**                                          |
| `patch` | Optional prop **removed** from a section                        |
| `none`  | Pages are **deeply equal** (idempotent guard — no write occurs) |

---

## 5. Accessibility Approach

This project targets **WCAG 2.2 Level AAA**.

### Enforcement in CI

Every pull request runs `npm run test:e2e`, which includes the axe-core accessibility audit (`tests/e2e/accessibility.spec.ts`). After the test run:

```
node scripts/check-a11y.js
```

This script reads `a11y-report.json`, counts violations with `impact === 'critical'` or `impact === 'serious'`, and exits 1 (failing the build) if any are found.

### Measures applied

| Requirement | Implementation |
|---|---|
| **Color contrast ≥ 7:1** | `--muted-foreground` set to 33% lightness (≈ 8:1 on white). Primary/secondary text already dark enough. |
| **Skip navigation** | `<a href="#main-content" class="skip-link">` is the first focusable element on every page. |
| **Keyboard: drag alternative** | Every section item has Move Up / Move Down buttons alongside the drag handle. |
| **Focus visible** | All interactive elements use `focus-visible:ring-2 focus-visible:ring-ring`. No `outline: none` without replacement. |
| **Focus management** | `StudioPanel` stores the triggering element in a ref, focuses the first input on open, and returns focus to the trigger on close. |
| **Headings** | `/preview`: `h1` = page title (sr-only), `h2` = section headings, `h3` = sub-items. `/studio`: `h1` = "Studio: {title}", sidebars use `h2`. |
| **Forms** | Every input has a visible `<Label>` linked by `htmlFor`/`id`. Error messages linked via `aria-describedby`. Required fields have `aria-required="true"`. |
| **Live regions** | Section count changes announced via `role="status" aria-live="polite"`. Publish errors use `aria-live="assertive"`. |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)` sets all animation/transition durations to 0.01 ms. |
| **Colour alone** | Information is never conveyed by colour alone — text labels accompany all role badges, status indicators, and error states. |
| **ARIA landmarks** | `<main>`, `<header>`, `<aside aria-label="...">` used consistently. |
| **Section semantics** | Each section renders a `<section aria-labelledby="...">` element with an appropriate heading. |

---

## 6. Running Locally

### Prerequisites

- Node.js 20+
- A Contentful space with the content model described in §3

### Environment setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Contentful — get from app.contentful.com → Space Settings → API Keys
CONTENTFUL_SPACE_ID=your_space_id
CONTENTFUL_DELIVERY_TOKEN=your_delivery_token
CONTENTFUL_PREVIEW_TOKEN=your_preview_token
CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_PREVIEW=false

# NextAuth — generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### Contentful content model setup

1. Log in to [app.contentful.com](https://app.contentful.com).
2. Navigate to **Content model** → **Add content type**.
3. Create `section` with fields: `id` (Short text), `type` (Short text), `props` (JSON object).
4. Create `page` with fields: `pageId` (Short text), `slug` (Short text), `title` (Short text), `sections` (References, many → `section`).
5. Add at least one `page` entry with a `section` entry of type `hero`.
6. Set `TEST_SLUG` in your `.env.local` to match the page's slug (default: `home`).

### Commands

```bash
# Install dependencies
npm install

# Start the development server
npm run dev                  # → http://localhost:3000

# Type check (strict mode, no emit)
npm run typecheck

# ESLint
npm run lint

# Unit tests (Vitest — no server required)
npm run test:unit

# E2E + accessibility tests (Playwright — starts server automatically)
npm run test:e2e

# Check axe report after e2e run
node scripts/check-a11y.js

# Production build
npm run build
npm run start
```

### Test accounts (seeded, dev-only)

| Email | Password | Role |
|---|---|---|
| viewer@test.com | viewer123 | viewer |
| editor@test.com | editor123 | editor |
| publisher@test.com | publisher123 | publisher |

---

## 7. What Is Incomplete and Why

| Area | Status | Reason |
|---|---|---|
| **Contentful webhook → preview invalidation** | Not implemented | On-demand revalidation (`revalidatePath`) requires a webhook secret and a dedicated route. The adapter and ISR config are ready to receive it. |
| **E2E tests without Contentful** | Tests skip gracefully | Content-dependent tests check `CONTENTFUL_SPACE_ID` and call `test.skip()` when absent. Accessibility tests always run against whatever the page renders. |
| **Snapshot storage** | Vercel Blob in production | A `src/lib/storage.ts` abstraction switches automatically: filesystem locally (`.storage/`), Vercel Blob in production when `BLOB_READ_WRITE_TOKEN` is set. Add a Blob store in the Vercel dashboard to activate. |
| **FeatureGrid inline editing** | Read-only in studio | Editing an array-of-objects requires a full sub-form with add/remove per item. Managed in Contentful directly. |
| **Real user database** | Hardcoded seed users | NextAuth Credentials + bcrypt is wired correctly; swapping the seed array for a DB query is a single-file change in `src/lib/auth/authOptions.ts`. |
| **Undo / redo** | Not implemented | `redux-undo` middleware can be added without changing existing slice API. |
| **Collaborative editing** | Not implemented | Would require a CRDT layer (Yjs). Out of scope. |
