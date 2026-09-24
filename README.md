# Dog Groomer App

A booking and client-management app for dog groomers — calendar, client and pet records, automated appointment/payment reminders, and in-app two-way client texting filed to a specific pet, sold to groomers as a monthly subscription.

- **Plan:** [PLAN.md](./PLAN.md) — the full product and build plan (data model, messaging architecture, pricing, build order, edge cases).
- **Design mockup (clickable, 9 screens):** https://claude.ai/artifact/Tg96dmvG8sMc8nWSVFwDPJ

Working name: **Slotted** (placeholder — see PLAN.md §9 for naming candidates).

## Status: Phase 1 (Core) built

Per PLAN.md §6, Phase 1 is auth + business onboarding, households/pets, calendar/booking and the Today dashboard. That's what's in this repo now: no messaging, billing or automations yet (Phases 2–4).

**Stack:** React + TypeScript + Vite + Tailwind, Firebase (Auth + Firestore), deployed as a static site to GitHub Pages, per PLAN.md §5.

```
app/                  The React app (Vite project root)
scripts/seed.mjs       Seeds the local emulators with demo data
firestore.rules        Security rules (one business per `bizId`, membership-gated)
firestore.indexes.json Composite indexes the app's queries need
firebase.json           Emulator config (Firestore rules + Auth + Firestore emulators)
.github/workflows/deploy.yml   Builds `app/` and deploys to GitHub Pages
```

## Repo layout note

`app/` holds the frontend project (its own `package.json`); `firebase.json` and the rules/indexes files live at the repo root because that's where the Firebase CLI expects them, and because a future `functions/` directory (Phase 2's Twilio/Stripe Cloud Functions) will be a sibling of `app/`, not nested inside it.

## Running it locally

```bash
cd app
npm install
npm run dev
```

By default this uses a harmless placeholder Firebase config (`src/firebase/config.ts`) — the app boots and renders, but sign-in and Firestore calls will fail until you either connect a real Firebase project (below) or point it at the local emulators (below that).

### Connect a real Firebase project

1. Create a Firebase project (Blaze plan — required later for Phase 2's Twilio/Stripe calls from Cloud Functions, even though Phase 1 doesn't need it yet; see PLAN.md §0/§1).
2. Enable **Authentication → Email/Password** and **Firestore** (production mode; rules below apply).
3. Firebase console → Project settings → General → "Your apps" → add a Web app → copy the config.
4. `cp app/.env.example app/.env.local` and fill in the six `VITE_FIREBASE_*` values.
5. Deploy the security rules: `firebase use --add` (pick your project), then `firebase deploy --only firestore:rules,firestore:indexes`.
6. `cd app && npm run dev`.

For the GitHub Pages deploy workflow to work, add the same six values as repository secrets (Settings → Secrets and variables → Actions): `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`.

### Local development without a real Firebase project

The Firebase emulator suite lets you develop and test fully offline:

```bash
# Terminal 1, from the repo root
firebase emulators:start --only firestore,auth

# Terminal 2 — seed some demo households, pets and appointments
cd scripts
npm install
npm run seed
# prints a demo login: demo@slotted.app / password123

# Terminal 3
cd app
echo "VITE_USE_FIREBASE_EMULATORS=true" > .env.local
npm run dev
```

This is also how this build was actually tested end-to-end (auth, onboarding, households/pets CRUD + CSV import, calendar/booking, Today dashboard) before being pushed.

## Deploying

The GitHub Actions workflow (`.github/workflows/deploy.yml`) builds `app/` and publishes it to GitHub Pages on every push to `main` — **but this repo doesn't have a `main` branch yet** (development so far has happened on feature branches). Either rename your default branch to `main` once this is merged, or edit the workflow's `branches:` list to match whatever branch you treat as production. It also needs the `FIREBASE_*` repo secrets described above, or the deployed build will fail its build step outright rather than silently shipping the placeholder config.

GitHub Pages must be enabled once, manually: repo Settings → Pages → Source → "GitHub Actions".

## Security rules

`firestore.rules` enforces one rule throughout: every read/write under `businesses/{bizId}` requires `request.auth.uid` to be a key in that business's `members` map (PLAN.md §4). Phase 1 only ever puts one `'owner'` in that map, but the map (not a bare `ownerUid` field) is there from day one so adding staff later (the salon tier PLAN.md mentions) doesn't need a rules rewrite. A few fields are blocked from client writes entirely — `subscriptionStatus`, `smsProvider`, appointment `reminderSentAt`/`followUpSentAt` — because Phase 2–4's Cloud Functions own them.

## Suggested next steps / automation opportunities

- **CI on PRs:** the deploy workflow only runs on push to `main`; a second workflow running `npm run build` (or `tsc -b`) on every PR would catch type errors before merge instead of at deploy time.
- **Firestore rules tests:** `firestore.rules` was hand-verified against the emulator during this build (one business genuinely can't read another's data, a self-referential `get()` bug was caught this way — see the rules file's comments), but there's no automated test suite for it yet. The `@firebase/rules-unit-testing` package plus a few Jest/Vitest cases would let this be verified on every change instead of manually.
- **Code-split the Firebase SDK:** the production bundle is ~960 KB (mostly `firebase/app` + `firebase/auth` + `firebase/firestore`); a dynamic `import()` around the app shell, or splitting auth from Firestore, would bring that down.

## What's next (Phase 2+)

See PLAN.md §6: messaging (BYOA Twilio setup, two-way SMS threaded by pet), automations (reminders, confirmations, rebook nudges), billing (Stripe), then polish/beta.
