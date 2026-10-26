# SafeGate Admin Console

Admin-only web frontend for the Autism Support Platform backend. Built with Vite, React, TypeScript, and Tailwind CSS v4.

Covers what the backend's admin role supports: account management (search, sort, paginate, edit, deactivate, therapist approval, password reset, force sign-out), safety oversight (alerts inbox with acknowledge, flagged-conversation review showing metadata only, never message text), an audit log (record access and admin actions), child corrections and therapist reassignment, cancelling sessions on a family's behalf, CSV export, and system health with read-only settings. Parents, therapists, and children use the separate mobile app in `mobile/`.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on localhost:8000
npm run dev
```

Requires the backend running (see the project root `README.md`) with CORS configured to allow this app's origin -- `CORS_ORIGINS` in the backend's `.env` already includes `http://localhost:5173` by default.

## Stack notes

- **Tailwind v4** via `@tailwindcss/vite` -- theme tokens (the given color palette, fonts, shadows, animations) are defined in `src/index.css` under `@theme`, not a `tailwind.config.js`.
- **Fonts** are self-hosted via `@fontsource` (Inter for UI, Fraunces for headings) rather than a Google Fonts CDN link, consistent with the backend's "no third-party trackers" stance.
- **TanStack Query** for all server state -- no manual loading/error state juggling in components.
- **react-hook-form + zod** for form validation.
- **sonner** for toasts, themed to match the design system rather than using its defaults.
- Auth token is stored in `localStorage` and decoded client-side only for optimistic UI (expiry check) -- the backend is always the real authority; every request still gets a real 401 if the token is invalid server-side.

## What's intentionally not here

- Nothing lets an admin create/edit a child, session, or schedule directly -- those are parent/therapist actions by design (see `extras/CLAUDE.md` at the repo root). Admin's job is user management and oversight only.
- No `session_notes` view -- the backend doesn't have endpoints for it yet (see the root `README.md`'s "known gaps").
