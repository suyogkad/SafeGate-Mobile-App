# SafeGate — mobile app UI

SafeGate is a care app for **neurodivergent children and people with disabilities**, launching in Australia first. A child works with a **real therapist**; between sessions an **AI companion** helps with small things (breaking tasks into steps, calm-down activities, a journal, check-ins); and a **parent or carer owns the account** and can see what happens.

The core idea: **the AI is not the safety system.** In the real product an independent safety engine checks everything the child writes *before* any AI sees it. If something serious comes up, the child's app switches to **calm mode** (calm steps and helplines), the AI is locked out, and the parent is alerted.

This repository is the **frontend** of the MVP: the complete mobile UI for all three sides of the app, the child app, the parent area and the therapist area, built with Expo (React Native). It runs on phones and in the browser.

> **Working on this project? Read [`HANDOFF.md`](HANDOFF.md) first.** It explains every screen and flow, the product rules and *why* things behave the way they do, and exactly what the backend needs to replace.

---

## What's in it

**Child app:** onboarding with a link code from the parent · Home ("Your day") · Explore · Talk (AI companion, with voice input) · Today I feel check-ins · Calm me activities · Journal · My task · My sessions · Comfort settings (text size, colours, motion, read-aloud…) · Get help (000, helplines, trusted people) · **calm mode**.

**Parent area:** account setup and "About your child" · Home with "Needs you" alerts · the Alert screen (calm mode, help requests, contacting emergency services) · reading the child's chats and journal · Insights and check-in charts (interactive) · finding and booking a therapist (times worked out from each therapist's hours) · sessions and notes · Alex's day (what shows on the child's Home) · notifications (a bell with an unread count and a list) · Help lines.

**Therapist area:** Today (what needs attention, coming up, open times) · a calendar · My hours and time off (families' booking follows them live) · clients, with only what each family chose to share · session prep · session notes in two parts (shared with the family / private working notes) · alerts · notifications.

About 65 screens and states on 63 routes. Accessibility is built in: 56 dp touch targets, labels on every control, adjustable text size, WCAG 2.2 AA contrast, reduce-motion support, and plain language for children.

## Status

- Frontend only. **No backend yet:** all data is demo data (`src/data/`) and all state is in memory (`src/store/app.ts`), so a reload resets it.
- Buttons that would call, text or message show a **"Demo only"** alert instead; nothing ever dials.
- Anything marked `DEMO ONLY` or `TODO(safegate)` is a stand-in for the backend. The full list is in `HANDOFF.md` §14.

## Run it

You need **Node 20+** and **pnpm** (`npm i -g pnpm`).

```bash
pnpm install
pnpm web        # opens the app in your browser
```

Or run `pnpm start` and scan the QR code with **Expo Go** on your phone (press `w` in the terminal for the browser instead). Before committing, run `pnpm typecheck`.

**Try the demo story** (browser):
1. *I'm a parent or carer* → create the account → answer "About your child" → note the link code **ABC 123**.
2. Account → Sign out → *I already have a code* → type `ABC123` → you're on the child's Home.
3. Open **Talk** and type `calm` to see calm mode (demo trigger; the real app decides this on the server).
4. Press **Alt+P** to jump to the parent's Home and see the alert; **Alt+C** jumps back to the child; **Alt+T** opens the therapist's side (Priya). (Demo shortcuts, web only.)
5. As the therapist: My hours → switch Friday on → the parent's Book shows the new times. Clients → Alex → Sessions → Thu 8 Oct → *Write notes* → *Share with Jordan* → the parent's bell lights up.

The full 13-step script is in `HANDOFF.md` §9.5.

Other demo words in Talk: `offline`, `not sent`, `blocked`.

## Tech

Expo SDK 57 · Expo Router · TypeScript (strict) · Zustand · react-native-svg · expo-linear-gradient · expo-speech · Plus Jakarta Sans. No UI kit: every component is built on the project's own design tokens (`src/theme/tokens.ts`).

```
app/            screens (Expo Router: one file per route)
src/components  shared UI and primitives
src/theme       design tokens (colours, type, spacing)
src/data        demo data
src/store       in-memory app state
src/lib         helpers (calls, calm-mode wording, motion, speech)
assets/         characters and illustrations
HANDOFF.md      the full project context: rules, screens, flows, backend integration
```
