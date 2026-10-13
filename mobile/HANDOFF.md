# SafeGate mobile app: frontend handoff

> **Who this is for:** the backend team (and the AI tools they use) who will connect this frontend to the real SafeGate backend for the MVP showcase.
> **What it is:** the single source of context for this repository. Everything that shaped the frontend (product rules, design decisions, every screen and why it is built the way it is, the flows, the state, and exactly what is faked) is written here. The internal planning documents are not part of this repo; where code comments mention them, section 15 maps those references to this file.
> **Status (26 Sep 2026):** every screen in the spec is built (47 routes, about 50 screens and states), rehearsed end to end, and has had an accessibility pass and a wording pass. `pnpm typecheck` passes.

---

## Contents

1. [What SafeGate is](#1-what-safegate-is)
2. [What this repo is (and isn't)](#2-what-this-repo-is-and-isnt)
3. [The product rules, and why each exists](#3-the-product-rules-and-why-each-exists)
4. [Running it](#4-running-it)
5. [Code map](#5-code-map)
6. [Design system: where the look comes from](#6-design-system-where-the-look-comes-from)
7. [Motion](#7-motion)
8. [Accessibility decisions](#8-accessibility-decisions)
9. [Navigation and flows](#9-navigation-and-flows)
10. [Calm mode: the safety state machine](#10-calm-mode-the-safety-state-machine)
11. [Every screen: child app](#11-every-screen-child-app)
12. [Every screen: parent area](#12-every-screen-parent-area)
12a. [Notifications (parent and therapist)](#12a-notifications-parent-and-therapist)
12b. [Every screen: therapist area](#12b-every-screen-therapist-area)
13. [State: the store](#13-state-the-store)
14. [What is faked, and what the backend replaces](#14-what-is-faked-and-what-the-backend-replaces)
15. [Map of references in code comments](#15-map-of-references-in-code-comments)
16. [Toolchain gotchas](#16-toolchain-gotchas)
17. [Known gaps and open items](#17-known-gaps-and-open-items)
18. [Decision log](#18-decision-log)
19. [Glossary](#19-glossary)

---

## 1. What SafeGate is

**SafeGate.ai** is a care app for **neurodivergent children and people with disabilities**, launching in **Australia** first.

Three people are involved:

| Who | Role in the app |
|---|---|
| **The child** (demo: **Alex**, about 10) | Uses the child app on their own phone. Talks to an AI companion, checks in on feelings, does calm-down steps, journals, sees their next session. |
| **A real therapist** (demo: **Priya Shah**, psychologist) | The human the child sees in sessions. The app supports the time *between* sessions. Signs in to the **therapist area** of this app to set their hours, see bookings in a calendar, follow each child's shared information and write session notes (section 12b). |
| **The parent or carer** (demo: **Jordan Lee**) | **Owns the account.** Sets up the child, links the child's phone with a code, books sessions, reads chats and journal, gets alerts when something serious comes up. |

The **AI companion** helps between sessions: breaking tasks into steps, explaining simply, chatting, suggesting approved calm activities. It is **never** a therapist and never pretends to be a person.

### The core idea

> **The AI is not the safety system.**

In the real product, an **independent safety engine checks everything the child types or says before any AI is called**. If something serious comes up, the AI is locked out, the child's app switches to **calm mode** (pre-written calm steps and helplines), the **parent is alerted**, and the therapist is told. In this frontend the switch is triggered by a demo keyword (section 14); in the real build the backend decides, never the app.

### Positioning (why the wording is so strict)

SafeGate is **assistive / wellbeing technology for disability** (fundable under the NDIS as low-cost assistive tech). It is **not** a mental-health treatment app, **not** a medical device, and **not** an AI therapist. In Australia the wording in the UI helps define the product's legal "intended purpose" (TGA medical-device rules), so **copy is a compliance surface**. That is why section 3 bans certain words outright and why the child never sees scores or levels.

### Users and tone

- **Child (6–16, neurodivergent):** low stimulation, predictable layout, one thing per screen, short sentences, big targets, the same thing always in the same place (Get help always in the same corner), fewer choices. Warm but not babyish.
- **Parent or carer:** calm, clear, trustworthy. The Alert screen is the most important parent screen: clear, calm, no alarm red, obvious next actions.

### The real product vs. this repo

The real product has a backend (FastAPI), the safety engine, a local LLM, speech-to-text and text-to-speech servers, a therapist portal, payments, video calls and real notifications. **None of that is in this repo.** This repo fakes all of it with scripted data so every screen and flow can be seen and tested.

---

## 2. What this repo is (and isn't)

- **A frontend-only mobile UI** built with Expo (React Native), running on phones (Expo Go or a dev build) and in the browser (Expo web).
- **No backend, no API calls, no mock server.** All data is static (`src/data/`), all state is in memory (`src/store/app.ts`). Restarting the app or reloading the page resets everything.
- **One app holds both sides:** the child app and the parent area. This was done so a child's message could visibly cause a parent alert on the same device. In production these become two separate signed-in experiences (a child device and a parent device) sharing data through the backend. See section 14 for how to split them.
- Every "Call", "Text", "Chat" and "Message" button shows a **"Demo only"** alert instead of dialling (section 14).

---

## 3. The product rules, and why each exists

These rules were set before any screen was designed and every screen follows them. **They must stay true after the backend is connected.** Several of them are enforced by what the backend sends, not only by the UI, so they're listed with the backend implication.

| # | Rule | Why | What the backend must do |
|---|---|---|---|
| 1 | **Get help is one tap away on every child screen**, always in the same place (header, top right), including calm mode and error screens. Get help itself is the only child screen without the button. | A child in distress must never have to hunt for help; predictability matters more for neurodivergent users. | Nothing, but never add a child screen without `[GH]` (the `Header` component adds it by default). |
| 2 | **Wording:** the AI is a **"companion"** ("AI companion"), never a "therapist". "Therapist" only ever means the human. **Never** use: *therapy, treatment, diagnosis / diagnose, assessment, clinical, patient, risk score, detects / prevents suicide*. Say instead: support, help, calm, steps, check-in, session. **Never imply the AI is a person.** | Compliance (not a medical device, not therapy) and honesty with children. | Any text the backend sends to the child (AI replies, notifications, help content) must follow this. Filter or template server-side. |
| 3 | **Never promise a child privacy.** Talk and Journal say *"Your grown-up can read what you write here."* Never call the app "private" or "secret" to the child. Point the child to their therapist for things that are easier to say to a person, without promising the therapist keeps secrets. | The parent can read everything, and a therapist has duty-of-care obligations. Promising secrecy to a child would be a lie and a safeguarding risk. | Parent really must be able to read chats and journal (the child is told so). |
| 4 | **"SafeGate is not an emergency service."** Shown wherever emergency help is offered (Welcome, How this works, Get help, calm mode, How are you feeling now, the after-calm banner in Talk, About, the parent's Alert and Help lines). | Liability and honesty: the app does not dispatch help. | Nothing. |
| 5 | **Never show risk levels or scores in the child app.** Only the parent's Alert may show "Concern: High". | A visible level for a child's emotional state is a monitoring/prediction claim (TGA risk) and raises arousal exactly when the app is trying to lower it. | **Never send risk levels, scores or classifier output to the child app.** Only the parent endpoints may carry a concern level. |
| 6 | **Call buttons never dial in the demo.** Everything goes through `callNumber()` / `contact()` in `src/lib/call.ts`. | A stray tap on "Call 000" during a demo must not ring emergency services. | Replace the bodies of those two functions (section 14). Keep them as the single choke point. |
| 7 | **No engagement mechanics:** no streaks, badges, points, confetti, notification dots, or progress that "counts" the child's day. (One task checklist may show "2 of 5 steps".) | Australia's Children's Online Privacy Code expects no engagement-maximising design; the reward for using SafeGate is feeling better, not a score. | No gamification data, no "come back" push notifications to the child. |
| 8 | **Accessibility:** touch targets at least 56 dp, a label on every interactive element, text scales, colour is never the only signal, WCAG 2.2 AA minimum. | The audience. See section 8. | Nothing. |
| 9 | **The "calm" trigger in Talk is demo-only** (`// DEMO ONLY`). | In the real product the safety engine decides on the server, before the AI is called. A keyword check in the app is trivially bypassed and must never be the safety system. | **Implement the safety decision server-side and push the calm-mode state to the app.** Remove the keyword trigger. |
| 10 | **Motion is calm and tiered:** reduce-motion turns everything off; the child app gets only gentle short fades unless the child switches **Movement** on; the parent area can have fuller motion. Text never animates. Every entrance has a fail-safe so content can't stay invisible. No pulsing, glowing or countdowns in the child app, with one deliberate exception: while Speak is listening, soft rings pulse out from the record button (the familiar "I'm listening" cue; still with reduce-motion). | Sensory sensitivity; vestibular disorders. The Speak rings were the owner's call (26 Sep 2026): a listening cue children recognise. See section 7. | Nothing. |
| 11 | **"Someone is hurting me"** (a help topic) **never offers to tell the grown-up.** | The grown-up could be the person hurting the child. | **Never auto-notify the parent for this topic.** Any escalation for it must go somewhere other than the parent. |
| 12 | **Calm mode tells the child the truth** about what grown-ups have done, and **never promises a time** (section 10). | Honesty; a promised time that isn't met is worse than no promise, and there is no 24/7 roster yet. | Calm-mode state (`active` / `seen` / emergency requested) must come from real parent actions and reach the child device live. |
| 13 | **Voice is never the only way.** Speak always has "Type instead". Push-to-talk only, never always-listening. The child always sees and can fix what was heard ("Is this right?"). | Accessibility and trust. | Speech-to-text returns text for confirmation; never auto-send a transcription. |
| 14 | **The child sees no analytics.** Charts, summaries and insights live in the parent area only, in the child's own words. | Rule 5 and rule 7. | Insight endpoints are parent-only. |
| 15 | **Plain words for kids** ("Sad", "Worried", "Bad"), no clinical terms. **No red** for moods or errors in the child app; no "Oops", warning triangles or error codes. | Low arousal, no blame. | Error payloads shown to the child must map to the calm error screens (C29), never raw messages or codes. |
| 16 | **Emergency numbers are data, not constants**, each with a "Checked <date>" line. Numbers are never generated. | A wrong emergency number is dangerous; every number must be verified and dated. | Serve helplines from a verified, dated source (per country). Never generate or guess numbers. |
| 17 | **Contact emergency services** (parent) is never automatic and never one tap: it's behind a confirm dialog that names who is asking and when. | Accountability and preventing accidents. | Record who/when; the real action (whatever it is) happens only after the confirm. |
| 18 | **The therapist area follows the same wording rules** (rule 2): "client" or "child", never "patient"; "session notes", "goals", "things to try", never "treatment plan", "assessment", "diagnosis" or "clinical". Notes for the family are plain words, no scores. | The wording defines the product's intended purpose on every side, not only the child's. | Any templates or AI help for notes must follow the same list. |
| 19 | **The therapist sees only what the family shares.** Always: the child's name and age band, the parent's "About your child" answers, Comfort settings (read-only) and calm-step alerts. Only when the parent shares them: the week's check-ins and summary, chats, journal entries. Anything not shared is simply absent, with a line saying so. | It matches what parents are told ("Chats are only shared if you choose them"), and the child app never mentions the therapist reading. | Enforce it on the server (per-share permissions), never by hiding things in the app. |
| 20 | **Notification counts exist only for parents and therapists**, never in the child app (rule 7). Urgent items (calm mode, help requests, emergency) are always shown and pushed and can't be switched off; frequent child activity (check-ins, journal) is a quiet update by default, not a push each time. | Engagement mechanics are banned for children; a push for every check-in would feel like surveillance. | Push rules: urgent always; the rest per the parent's Alerts settings (store `alertPrefs`). |
| 21 | **Session notes have two parts:** the part shared with the family (it becomes the parent's "Notes from Priya") and the therapist's own working notes, which the family never sees. The child is still never promised privacy (rule 3). | That's how practices work, and parents get a clear, plain summary. | Store the two parts separately with different permissions; the parent API never returns working notes. |

**One visual language.** Every screen is built from the same small set of parts (headers, cards, rows, buttons, characters) in `src/components/`, never a one-off style. A new screen should reuse them.

---

## 4. Running it

```bash
pnpm install
```

```bash
pnpm start
```

`pnpm start` opens the Expo dev server (press `w` for the browser, or scan with Expo Go). `pnpm web` goes straight to the browser. Run `pnpm typecheck` before every commit.

**Stack:** Expo SDK 57 · Expo Router · TypeScript (strict) · Zustand (state) · react-native-svg · expo-linear-gradient · expo-speech ("Read to me") · Plus Jakarta Sans via `@expo-google-fonts/*` (the logo is an image) · Feather icons via `@expo/vector-icons`. pnpm with `nodeLinker: hoisted` in `pnpm-workspace.yaml` (Metro needs the hoisted tree). No Reanimated and no UI kit, on purpose: everything is built from our own primitives so the look stays consistent.

**Web layout:** on the web the app renders in a phone-width column (max 430 px) so it looks like a phone in a desktop browser.

**Demo-only helpers (remove for production, section 14):**
- **Alt+P** jumps to the parent Home (signs the parent in); **Alt+C** jumps to the child side (calm mode if it's still running, otherwise Home); **Alt+T** jumps to the therapist's Today (signs Priya in). Web only. `src/lib/demoSwitch.ts`.
- Development builds expose the store as `window.__safegate` (e.g. `__safegate.getState().setCalmMode('active')`).
- `/dev/components` is a gallery of the UI primitives, useful when changing tokens.

---

## 5. Code map

```
app/                      routes (Expo Router, file = screen)
  _layout.tsx             root Stack: fonts, safe area, phone-width column on web, screen transitions (motion-tiered)
  index.tsx               C01 Splash
  (child)/                child tab screens: home, explore, you  (+ _layout with the custom child tab bar)
  parent/                 parent screens; parent/(tabs)/ = parent tab screens: home, sessions, insights, account
  therapist/              therapist screens (sign-in, availability, hours, slot, client, session, notes, alert, notifications);
                          therapist/(tabs)/ = today, calendar, clients, account
  *.tsx                   other child screens (talk, feel, calm-mode, get-help, …), pushed full screen
  dev/components.tsx      primitives gallery (dev tool)
src/components/           shared screen parts (Screen, Header, GetHelpButton, TabBars, HeroBand, CheckinCard, …)
src/components/ui/        primitives on design tokens: Tappable, Button, T (text), Card, Chip, Badge, Switch,
                          Segmented, ListRow, Dialog, Input, CodeInput, Icon, IconButton, Appear/Stagger, bits
src/theme/tokens.ts       colours, type scale, spacing, radius, shadows, motion timings. Screens never use raw hex.
src/theme/useTheme.ts     applies Comfort settings (text size, stronger colours, letter spacing) to tokens
src/data/                 all demo data (people, therapists, sessions, transcripts, calm activities, journal, help topics, helplines…);
                          practice.ts = the therapist side (clients, hours, bookings, notes, goals); notifications.ts = seeded notifications
src/store/app.ts          the in-memory store (Zustand). The shape the backend has to fill. Section 13.
src/lib/call.ts           callNumber() / contact(): the single choke point for every call/text/chat (demo alert)
src/lib/calmLead.ts       the truthful line shown on calm screens (rule 12)
src/lib/motion.ts         useMotion() / useReduceMotion(): the motion tiers (section 7)
src/lib/speak.ts          "Read to me" text-to-speech (expo-speech, en-AU, rate from Reading speed)
src/lib/liveTranscript.ts builds the parent's "Today" transcript from this session's Talk + journal
src/lib/demoSwitch.ts     DEMO ONLY Alt+P / Alt+C / Alt+T
src/lib/schedule.ts       every therapist's calendar worked out from their hours + bookings: open times, next free, day blocks
src/lib/clients.ts        what the therapist knows about each client (only what's shared), "needs attention", latest shared notes
src/lib/time.ts           clockTime(): "3:42 pm"
src/lib/preloadImages.ts  loads every character and illustration at start-up so no screen shows a picture popping in
                          (prefetchImage.ts / .web.ts do the per-platform loading; imageUri.ts / .web.ts resolve the file URL)
assets/faces/, assets/art/  the brand characters and hero art (transparent PNGs)
assets/brand/              the logo: wordmark.png and mark.png (transparent)
assets/therapists/         optimised therapist photos (a 980×700 hero + a 320×320 face each, 9–97 KB; `PHOTOS` in src/data/faces.ts)
types/                    ambient types
```

**Rules of thumb in the code:**
- **Use the primitives.** Pills, switches, segmented tabs, rows and dialogs are never hand-rolled. If one is missing it's added to `src/components/ui` first.
- **All text goes through `T`** so Comfort settings (size, spacing, colours) apply everywhere, and so text never animates.
- **All tappables go through `Tappable`** (or a primitive built on it), which requires a `label` and guarantees the 56 dp hit area.
- **Every child screen uses `Screen` + `Header`**, which puts Get help in the same place.
- **If the same fix is needed on three screens, fix the token or the primitive**, not the screens.

---

## 6. Design system: where the look comes from

The screens are finished; this section explains the visual rules so anything added later matches, and why some choices were made. All values live in `src/theme/tokens.ts`. **Wording always comes from the product rules in section 3**, never from anywhere else.

### 6.1 Mood

Clean, light and friendly: mostly white screens with pale-grey cards, one confident blue for every button, one deep navy for heroes and selected states. The personality comes from **flat, bright blob characters with simple black line faces** (orange, cyan, pink, amber, purple). Playful but not babyish, which suits a child app, while staying calm enough for the parent area.

The owner rejected "plain" screens (white page, plain cards, no brand) early on: **every screen must carry the brand language** (characters in tinted circles, navy panels, branded gradient backgrounds, raised white cards). Child screens are calmer and more minimal than parent screens, but still branded.

### 6.2 Colour (`src/theme/tokens.ts`)

| Token | Hex | Role |
|---|---|---|
| `primary` (blue500) | `#4868EC` | Buttons, links, active tab, selected chip, focus ring (white text 4.70:1) |
| `brand` (blue700) | `#30459D` | Hero bands, wordmark, selected dates, emphasised companion text (white text 8.52:1) |
| `surfaceTint` (blue50) | `#DAE1FB` | Companion card, info surfaces, avatar circles |
| `brandSoft` (blue100) | `#C2CDF9` | Soft selected |
| `bg` | `#FFFFFF` | Canvas |
| `surface` (grey50) | `#F7F9FA` | Cards |
| `border`/`divider`/`chip` (grey100) | `#F2F4F5` | Chips, dividers, field border |
| `track` (grey200) | `#E3E5E5` | Progress tracks |
| `text` | `#090A0A` | Text |
| `textSecondary` (grey700) | `#404446` | Secondary text |
| `textMuted` | `#5E6366` | Muted text. Darkened twice (from `#72777A`, then `#6A6F72`) so it stays at least 4.5:1 on grey cards **and** on the tinted page backgrounds. |
| `fieldBorder` | `#8E949A` | The edge of anything you type into (fields, code boxes, writing boxes): 3.1:1 on white, the WCAG minimum for a control's boundary. 2 px `focus` blue while typing. |
| `cardBorder` | `#DCE2F3` | Hairline edge on white and grey cards (built into the `lift` shadow as a 1 px ring), so cards never look like they're floating on the pale backgrounds. |
| `chipBorder` | `#B6BED3` | Edge of unselected chips and segmented tracks (chips are white with this edge; selected chips are solid blue). |
| `help` / `helpTint` / `onHelpTint` | `#FFA300` / `#FFEFD7` / `#8A5A00` | **Get help and emergency.** Amber comes from the characters' own palette: warm, clearly different from the blue, and not alarm red. Solid amber only for emergency actions (Call 000); the tint for Get help and emergency notes. |

**No red anywhere in the child app** (moods, errors, alerts). The parent area uses navy for emphasis, never red. Red accents and red illustrations were deliberately left out.

**On tinted surfaces and page backgrounds** the bright primary blue only passes contrast on pure white. So: **text buttons and links** ("Edit", "View more", "Change", "More times"…) are drawn in navy `brand`; **outline buttons** have a white fill so their blue text always sits on white; quiet text on tints uses `textSecondary`. Contrast was measured against the real background under each piece of text (gradient + glows), not just the card behind it.

**Mood tokens** (five moods, never colour alone: each has a word and a character face too):

| Mood | Face | Tint | Word colour |
|---|---|---|---|
| Bad | pink diamond, sad mouth | `#E9E5FF` lavender | `#5B4BC4` |
| Not great | cyan hexagon, frown | `#BFEAEC` | `#00666B` |
| Ok | purple star-burst, flat mouth | `#DAE1FB` | `#30459D` |
| Good | purple flower, soft smile | `#ECFCE5` | `#198155` |
| Great | amber flower, big grin | `#FFF8CC` sunny yellow | `#7A5C00` |

"Great" uses sunny yellow so it can't be confused with the Get help amber.

**Stronger colours** (a Comfort setting) swaps in deeper steps: brand `#18234F`, primary `#30459D`, muted text grey700, stronger borders.

### 6.3 Type

One family, **Plus Jakarta Sans** (400/500/700). Letter spacing is 0 on every style.

**Logo.** The SafeGate logo is artwork, not text: the blue wordmark whose G carries an orange dot (`assets/brand/wordmark.png`) and the G mark on its own (`assets/brand/mark.png`), both transparent cut-outs of the brand artwork in the brand blue `#4060DB` and orange `#FF9B00`. `Wordmark` / `LogoMark` in `src/components/Wordmark.tsx` draw them. The splash shows the G above the wordmark; Welcome, the sign-in headers and About show the wordmark. The app icon (the G on white), splash icon, Android adaptive icons and the web favicon (the brand tile) are generated from the same mark.

| Token | Size / line | Weight |
|---|---|---|
| `display` | 32/40 | Bold |
| `title` | 24/32 | Bold |
| `heading` | 18/24 | Bold |
| `section` | 16/24 | Bold |
| `navTitle` | 18/24 | Regular |
| `bodyLg` | 16/24 | Medium |
| `body` | 16/24 | Regular |
| `label` | 16/20 | Medium |
| `bodySm` / `bodySmMedium` | 14/20 | Regular / Medium |
| `caption` | 12/16 | Regular |
| `mood` / `moodLg` | 18/24 Medium · 24/32 Bold | |

The child's **Text size** setting scales these ×0.94 / ×1 / ×1.18 (Normal / Bigger / Biggest) on top of the phone's own text scale (capped at 2×). The default, "Bigger", is the design's own sizes. The parent area isn't scaled by the child's setting.

### 6.4 Spacing, shape, elevation

24 px side gutter (a 327 px column on a 375 px phone), base unit 4 (`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`). Radius: field 8 · tile 12 · card 16 · panel 24 · pill (buttons, chips, badges, circles). Almost no shadows: a soft one on the sticky bottom bar, and white cards with a 1 px `cardBorder` ring plus a soft blue-tinted lift, so they stand out from the branded backgrounds without looking like they float. Buttons are 48 tall (small 36); the **hit area** is grown to 56 (section 8).

### 6.5 Icons and illustration

Icons are **Feather** (`@expo/vector-icons`), 24 in bars, 20 in buttons. Illustrations are the brand characters in `assets/faces/` and `assets/art/`:
- In lists a face sits in a tinted circle (the check-in card).
- In heroes one character is cropped big on a navy band (Home, Explore).
- In confirmations one character sits centred above the title.
- Welcome uses a collage of the faces.
- **Calm mode, errors and Get help use no characters**: quiet and text-first.
- No photos of people in the child app; the parent area uses initials.

### 6.6 Branded backgrounds

Every screen sits on a `Backdrop` (`src/components/Backdrop.tsx`): a soft top-to-bottom wash plus three blurred glows in the brand colours, echoing the Welcome screen's pale blue curve. Presets: `soft` (child), `brand` (sign-in and parent setup), `help` (Get help and help topics), `calm` (barely there, calm mode), `none` (full-bleed hero screens).

**The backgrounds never fade to pure white** (changed 26 Sep 2026). White cards and fields on a white page had no visible edge; a light tint all the way down lets them separate, like on the parent screens. Talk and Journal writing use the same background as every other child screen.

### 6.7 Shared parts worth knowing

Help colour and Get help button (amber, above) · 5-item tab bars · switch · segmented control · dialog · step dashes ("Step 2 of 5" + dashes, not a filling bar) · the Talk conversation layout (companion lines emphasised in navy, child lines plain, **no chat bubbles**, companion card in the blue tint with an "AI companion" badge) · calm mode · mood colours.

**Added with notifications and the therapist area (all made of the parts above, no new visual style):** `CountBadge` (amber count pill, "9+") · `NotificationRow` (the type's character + the child's initial, tag, time, bold + "New" when unread) · `NotificationsScreen` (the one list layout for parents and therapists) · `SessionCard` (the parent's Sessions card) · `DayStrip` (Book's day tiles with a word under each: Open / Full / Off / Away) · `TimeBlock` (a calendar row: booked · open with a dashed edge · away/off in grey, always in words) · `TimeChooser` (half-hour chips grouped Morning / Afternoon / Evening; times are picked, never typed) · `TherapistCard` (Find a therapist's card, with the live "next free") · `NotesParts` (highlights, the message card, things to try, the locked working-notes card) · `AlertParts` (the Alert's facts rows and action rows).

**Selected state is never colour alone:** selected chips show a ✓, switches show a ✓ in the knob, tabs use colour plus weight plus the accessibility "selected" state.

---

## 7. Motion

Every animation goes through `useMotion()` in `src/lib/motion.ts`, so one place controls it. The tiers (rule 10):

| Where | Parent / login screens | Child, Movement **off** (default) | Child, Movement **on** | Phone's reduce-motion on |
|---|---|---|---|---|
| Content entrance (`Appear` / `Stagger`) | 250 ms fade + 12 px rise, 60 ms stagger | 150 ms fade only | fade + 8 px rise, stagger | none |
| Screen-to-screen transition | fade | none (the content fade is enough) | fade | none |
| `Backdrop` glows | drift slowly (16 s) | still | drift | still |
| Mood / feeling picker | — | instant, no size change | selected item grows 1.1× | instant |
| Mood band character | — | none | settles in (220 ms) | none |
| Dialogs (parent only) | fade | — | — | none |
| Splash | wordmark shows, fades, soft ripple rings, Welcome fades in (~2.3 s) | same (it plays before a side is chosen) | same | plain wordmark, then Welcome |
| Speak, while listening | — | two soft rings grow out from the record button and fade (1.8 s loop) | same | rings shown, not moving |

- **Text never animates.**
- **Fail-safe:** every entrance forces content visible after 600 ms, so nothing can stay invisible if an animation doesn't run (e.g. a backgrounded tab). The splash has its own 3.6 s fail-safe.
- No pulsing, glowing, bouncing or countdowns in the child app, except the Speak listening rings above (only while listening, slow and low-contrast). No waveform. "Thinking…" doesn't blink.
- **Calm mode's arrival is instant**, never a fade: the switch is the safety mechanism.
- Verified in the accessibility pass by measuring opacity/transform during navigation in each tier.

---

## 8. Accessibility decisions

Accessibility follows a neurodiversity checklist (175 items across general, ADHD, autism, dyslexia and dyscalculia) plus WCAG 2.2 AA. What was verified on every one of the 47 routes (25 Sep 2026):

- **Labels:** every interactive element has an accessible name (verb-first, e.g. "Call Lifeline on 13 11 14"). Icon-only buttons (Back, Close, Get help circle) have labels. Decorative art is hidden from screen readers.
- **Touch targets:** every hit area is at least **56 × 56 dp**, above the 44 the checklist asks for. Visual sizes stay small and tidy (48 px buttons, 36–40 px pills); `Tappable` grows the hit area. On native that's `hitSlop` from the measured size (both axes). **React Native Web ignores `hitSlop`**, so on web `Tappable` renders an invisible layer inside the pressable that extends to 56 × 56 using CSS (`min(0px, calc((100% - 56px) / 2))` on each side). Don't remove it.
- **Contrast:** every text element meets AA (4.5:1, or 3:1 for large text), measured against the real background under it (the page gradient and glows, not just the white layer beneath), including placeholders and with **Stronger colours** on. Re-checked on all 49 routes on 26 Sep 2026.
- **Visible edges:** every field, code box and writing box has a 3:1 edge (`fieldBorder`); white cards have a hairline ring; chips have a visible edge. Nothing white sits edgeless on a white page.
- **Text size Biggest + "More space between letters":** nothing overflows sideways, nothing is clipped. Header titles wrap to two lines instead of cutting off ("no loss of content").
- **Reduce-motion:** see section 7; verified.
- **Colour is never the only signal:** moods always have a word and a face; selected states have a ✓.
- **Focus:** a visible 3 px focus ring (web). The code-entry wrapper is not a separate tab stop; the labelled input inside is.
- **Line height** 1.5× throughout; "More space between letters" adds 0.12 em letter spacing and 1.6× line height (opt-in, because default wide tracking hurts other readers).
- **Progress** is "Step N of M" plus dashes, never a filling bar (dyscalculia).
- **Phone numbers** are shown with spaces (`13 11 14`) and dialled from a separate field; they're selectable.
- **Tooltips are banned** (unreachable by touch, and surprise elements are an autism concern).

### Where SafeGate deliberately overrides the checklist (don't "fix" these)

1. **Predictability vs. a safety switch the child didn't ask for.** The checklist says don't change context without warning. SafeGate switches to calm mode immediately, without asking. *Why:* the switch is the safety mechanism; asking would let the child refuse a server safety decision. *Mitigation:* How this works tells the child in advance that this can happen, calm mode announces itself to screen readers, and it's the calmest layout in the app.
2. **Auto-save vs. storing nothing sensitive.** The checklist wants auto-save and resume. SafeGate stores **no messages, transcripts, audio or notes on the device**. *Why:* a child's phone may be shared, inspected or taken; history on the device is a safeguarding risk. *Mitigation:* the safety mode and typed text that failed to send survive; Talk says "This chat isn't kept on this phone. Your grown-up can still read it." **Backend implication:** persist conversation server-side only; on the device keep only the session token, Comfort settings, the safety mode, and public content.
3. **Progress tracking vs. no engagement mechanics.** Only per-task progress inside one screen. No streaks, stats or reminders.
4. **Colour-coded status vs. never showing risk.** No red/amber levels, gauges or scores of the child's state anywhere in the child app.
5. **Declared response times vs. never promising.** The app never states when someone will reach out; the phone lines, shown in the same breath, are the immediate option.
6. **Wide margins vs. line length.** 2–3 em margins would leave under 30 characters per line on a phone, so line length wins (~40 characters on a phone).

### Comfort settings (the child's accessibility profile)

Set by the child (C23 You) or by the parent for the child (P07); one shared setting store.

| Setting | Values | Wired in this frontend? |
|---|---|---|
| Text size | Normal / **Bigger** / Biggest | **Yes**: scales all child text |
| Reading speed | Slower / **Normal** / Faster | **Yes**: "Read to me" speech rate |
| Country | Australia | Stored (helplines are AU only for now) |
| Read things aloud | **on** | **Yes**: shows "Read to me" on step screens |
| Stronger colours | off | **Yes**: deeper palette |
| Movement | off | **Yes**: the child motion tier |
| More space between letters | off | **Yes**: letter spacing + line height |
| Simple words | **on** | Stored only: would select simpler AI / content wording (backend) |
| Speak to SafeGate | **on** | Stored only: could hide the mic |
| Show pictures with words | **on** | Stored only: could hide icons (never text) |
| Fewer choices | off | Stored only: could trim options |
| Sounds | off | Stored only |

These belong to the child's profile on the backend so they follow the child across devices; the parent edits the same values.

---

## 9. Navigation and flows

### 9.1 Big picture

```
Splash ─► Welcome ─┬─ I'm a kid ──────────► Ask your grown-up ─► Link my phone ─► How this works ─► CHILD HOME
                   ├─ I already have a code ─────────────────► Link my phone
                   └─ I'm a parent or carer ─► Create account ─► About your child 1–5 ─► Alex's comfort ─► Link Alex's phone ─► PARENT HOME
                                                 └─ I already have an account ─► Sign in ─► PARENT HOME
                   └─ I'm a therapist ─► Therapist sign in ─► THERAPIST TODAY
```

### 9.2 Routes

| Route | Screen |
|---|---|
| `/` | C01 Splash |
| `/welcome` | C02 Welcome |
| `/ask-grown-up` | C03 Ask your grown-up first |
| `/link-phone` | C04 Link my phone |
| `/how-it-works` (`?again=1` from You) | C05 How this works |
| `/home` (tab) | C06 Home "Your day" |
| `/explore` (tab) | C07 Explore |
| `/you` (tab) | C23 You: Comfort settings |
| `/talk` (`?prompt=` prefills) | C08–C09 Talk |
| `/speak` | C10 Speak |
| `/is-this-right` (`?unsure=1`) | C11 Is this right? |
| `/feel` | C12 Today I feel |
| `/whats-going-on?mood=&feelings=` | C13 What's going on? |
| `/checkin-saved?mood=` | C14 Check-in saved |
| `/calm` (`?filter=`) | C15 Calm me |
| `/calm-activity?id=feet\|breathing\|squeeze` | C16 Calm activity |
| `/calm-steps?id=` | C17 Calm steps |
| `/journal` | C18 Journal |
| `/journal-topic?id=` | C19 Journal topic |
| `/journal-write?prompt=` | C20 Journal writing |
| `/my-task` | C21 My task |
| `/my-sessions` | C22 My sessions |
| `/about` (`?from=parent`) | C24 About SafeGate |
| `/get-help` | C25 Get help |
| `/help-topic?id=unsafe\|hurting\|scared\|hurts` | C25a Help topic |
| `/calm-mode` (`?order=emergency`) | C26 / C28 Calm mode |
| `/feeling-now?from=calm\|calmMode` | C27 How are you feeling now? |
| `/talk-error?kind=notSent\|blocked` | C29 Error |
| `/parent/sign-in` | P00 Sign in |
| `/parent/create-account` | P01 Create account |
| `/parent/about-child?step=1…5` | P02–P06 About your child |
| `/parent/child-comfort` (`?from=home`) | P07 Alex's comfort |
| `/parent/link-child` | P08 Link Alex's phone |
| `/parent/home` (tab) | P09 Parent Home |
| `/parent/find-therapist` | P10 Find a therapist |
| `/parent/therapist?id=priya\|sam\|mei` | P11 Therapist profile |
| `/parent/book?id=` | P12 Book (+ P12b You're booked) |
| `/parent/sessions` (tab) | P13 Sessions |
| `/parent/session-notes?id=oct8\|oct6\|sep24` (default: the newest shared) | P14 Session notes |
| `/parent/alert?kind=calm\|help` | P15 Alert (+ P16 confirm) |
| `/parent/chats` | P17 Alex's chats |
| `/parent/transcript?id=live\|homework\|calm\|smile\|calm-place\|school` | P18 A chat, read-only |
| `/parent/insights` (tab) | P19 Insights |
| `/parent/checkins` | P20 Check-ins overview |
| `/parent/journal` | P21 Alex's journal |
| `/parent/share` | P22 Share with Priya |
| `/parent/alexs-day` | P23 Alex's day |
| `/parent/account` (tab) | P24 Account |
| `/parent/help-lines` | P25 Help lines |
| `/parent/notifications` | P26 Notifications |
| `/therapist/sign-in` | T00 Therapist sign in |
| `/therapist/today` (tab) | T01 Today |
| `/therapist/calendar` (tab) | T02 Calendar |
| `/therapist/availability` | T03 My hours |
| `/therapist/hours?day=mon…sun[&i=]` | T03a Day hours |
| `/therapist/slot` (`?date=&start=[&extra=]` · `?mode=off` · `?booking=`) | T04 Add or change a time · time off · a booked session |
| `/therapist/clients` (tab) | T05 Clients |
| `/therapist/client?id=alex\|mia\|leo[&tab=Overview\|Shared\|Sessions]` | T06 Client |
| `/therapist/session?id=` | T07 Session |
| `/therapist/notes?session=` | T08 Write session notes |
| `/therapist/alert?id=calm` | T09 Client alert |
| `/therapist/notifications` | T10 Notifications |
| `/therapist/account` (tab) | T11 Account |
| `/therapist/profile` | T11a Your profile (edit what families see) |

**Tab bars.** Child: Home · Explore · **Talk** (opens full-screen Talk, not a tab page) · **Get help** (opens full-screen Get help, in the help colour) · You. Parent: Home (with the unread count) · Sessions · **Book (+)** (opens Find a therapist) · Insights · Account. Therapist: Today (with the unread count) · Calendar · **Add time (+)** (opens Add a time) · Clients · Account. A label under every icon. The centre item (Talk / Book) is a bigger 64 dp blue circle that rises above the bar, with a white ring, so the main action stands out.

**Navigation choices:**
- Leaving a flow uses `router.replace(target)`, not `dismissTo`/`dismissAll`: on web those walk back through browser history and can leave the app.
- Both tab navigators use `backBehavior="none"`: on web, returning to a visited tab otherwise calls `history.go(-1)`, which can step out of the page load and reload it.
- Calm mode, How this works (first time) and How are you feeling now block the Android back button and have no back/close, on purpose.

### 9.3 Child flows

- **Check-in:** Today I feel → *Add details* → What's going on? → *Save* → Check-in saved → Back to home / Talk about it. (*Save without details* skips What's going on?)
- **Talk:** empty → type → Send → "Thinking…" → reply → … → companion card → *Open as a checklist* → My task (tick steps → "All done!").
- **Voice:** Talk mic → Speak → Stop → Is this right? → *Send* (back into Talk and sends) / *Edit* / *Record again* / *Cancel*.
- **Calm me (voluntary):** Calm me (filter) → Calm activity → *Start* → Calm steps (Back/Next, Read to me) → How are you feeling now? → calmer: Home · same: Calm me · worse: Get help.
- **Journal:** Journal → *Start writing* (today's idea) → Journal writing → Save → companion reply. Or Journal → topic → prompt → Journal writing.
- **Get help** (from `[GH]` on any screen, or the tab): Call 000 · Your people · Helplines · *Not sure what to do?* chip → Help topic → *Let Jordan know* (not on "Someone is hurting me") / *Calm me* / call rows.
- **You:** Comfort settings → More: My sessions / How this works / About SafeGate.

### 9.4 Parent flows

- **Setup:** Create account → About your child 1 → 2 → 3 → 4 → 5 → Alex's comfort → Link Alex's phone → Parent Home.
- **Returning:** Welcome → I'm a parent → *I already have an account* → Sign in → Parent Home.
- **Alert:** Home → Needs you → Alert → *Read the conversation* · *Call Alex* · *Message Priya* · *I've seen this* · *Call 000* · *Contact emergency services…* → confirm → *Yes, contact them*.
- **Booking:** Find a therapist (filter) → Therapist profile → *Book a session* → Book (week, time, how to meet) → *Book this time* → You're booked → Done (Home) / See sessions. A booking replaces the session everywhere: Parent Home "Coming up", Sessions, child Home row 1, child My sessions (in person shows the clinic instead of Join).
- **Sessions:** Upcoming / Past → Session notes.
- **Chats:** Alex's chats → transcript (read-only) → *Share with Priya*.
- **Insights:** Alex's week → *View more* → Check-ins overview (Day / Week / Month).
- **Alex's day:** switches and the "Things in Alex's day" count decide the child's Home rows, live.
- **Account:** Your child → Alex's comfort (or Link if not linked) · Help lines · How SafeGate works · Privacy · *Sign out* → Welcome.
- **Notifications:** Home bell (or *View all* under Updates) → Notifications (All / Needs you / Sessions) → tap an item → its screen (it's marked read) · *Mark all read* · *Choose what we tell you about* → Account.

### 9.4a Therapist flows

- **In:** Welcome → *I'm a therapist* → Sign in → Today (demo: Alt+T). Account → *Sign out* → Welcome.
- **Today:** Needs attention → Client alert / Write notes / the client's Shared tab · Coming up → Session · open-time chips → change or remove that time · tiles → My hours, Add time off, Clients, Notifications · bell → Notifications.
- **Hours:** My hours → a day's switch or time chip → Day hours (From / Until) → back; length, gap, how you meet, booking window, notice, time off. Every change shows at once on families' Find a therapist and Book.
- **Calendar:** Week | Day, week arrows, day tiles → a booked row → Session · an open row → Add a time (change / remove) · *+ Add time* → Add a time on that day. The raised **+** tab opens Add a time from anywhere.
- **Clients:** search + filters → Client (Overview · Shared · Sessions) → Session → Write notes → *Share with Jordan* (confirm) → back to Session with NOTES SHARED; the parent is told.

### 9.5 The end-to-end demo script (rehearsed 26 Sep 2026, all 13 steps pass on one page load)

1. Splash → Welcome → *I'm a parent or carer* → Create account → About your child 1–5 → Alex's comfort → Link Alex's phone (code ABC 123) → Parent Home: "Nothing needs you right now", the bell shows 2.
2. Account → Sign out → Welcome → *I already have a code* → `ABC123` → How this works → *I understand* → Child Home (no counts or badges anywhere on the child's side).
3. Today I feel → Ok → Add details → School, Noise → Save → Check-in saved.
4. Talk → "I have homework and I don't know where to start" → reply → "Maths" → companion card → *Open as a checklist* → My task → tick two steps.
5. Talk → type `calm` → Calm mode (steps + helplines; Get help still there).
6. Alt+P → Parent Home "Needs you: Alex's app switched to calm steps · Today, <time>", the bell counts the new items, Updates lists them → Alert → *Read the conversation* → back → *I've seen this*.
7. Alt+C → Calm mode now says "Someone who looks after you has seen this and will reach out." → steps → How are you feeling now? → *A bit calmer* → Talk with the after-calm banner.
8. Alt+P → Book (+) → Priya → *Book a session* → More times → **Thursday 15 October, 5:00 pm** → **In person in Parramatta** → You're booked → child Home row 1 and My sessions follow it (My sessions shows the clinic). Book lists only free times, so Alex's own 4:00 pm isn't offered.
9. Parent: Insights → View more; Alex's day → switch Journal on → child Home shows the journal row.
10. Alt+T → therapist Today: Needs attention "Alex's app switched to calm steps" and "Write notes for Alex"; Coming up shows Alex on Thu 15 Oct, 5:00 pm, in person; the bell → Notifications shows "New booking: Alex".
11. Today → *My hours* → switch **Friday** on → From 10:00 am, Until 12:00 pm → *Add Friday hours* → Alt+P → Book → Friday 16 October 10:00 am and 11:00 am are there. Then Home → *Share with Priya* → Share.
12. Alt+T → Needs attention also has "Jordan shared Alex's week" → Clients → Alex → **Shared** (the week's chart and Jordan's summary; the calm alert, "Jordan saw it at …") → **Sessions** → Thursday 8 October (WRITE NOTES) → *Write notes* → a highlight, a few words for Jordan, one thing to try, working notes → *Share with Jordan* → Share.
13. Alt+P → the bell has a new item → Notifications → "Priya shared notes from the Thu 8 Oct session" → Session notes shows exactly the shared part (never the working notes); Sessions → Past shows Thu 8 Oct as NOTES SHARED.

This script is a good acceptance test once the backend is connected: the same story should work across two real devices.

---

## 10. Calm mode: the safety state machine

This is the heart of the product.

```
            [demo: child types "calm" in Talk]          parent taps "I've seen this"
  off  ─────────────────────────────────────►  active  ─────────────────────────────►  seen
   ▲        setCalmMode('active'), calmAt = now   │                                     │
   │        child → Calm mode screen (instant)    │ parent Home: "Needs you" · NEEDS YOU │ parent Home tag: SEEN
   │        AI locked out: no reply is shown      │ child line: "A grown-up who looks    │ child line: "Someone who looks
   │                                              │  after you has been told. They may   │  after you has seen this and
   │                                              │  get in touch."                      │  will reach out."
   │                                              ▼                                      ▼
   │           parent: Contact emergency services → confirm → emergency = { by, at }
   │           child line: "A grown-up who looks after you has asked emergency services to help you.
   │                        You are not in trouble."   (nothing is actually contacted in this frontend)
   │
   └── child finishes the steps → How are you feeling now? → "A bit calmer" → Talk with the after-calm banner
       ("If things get hard again, you can call someone." + Call Kids Helpline + Get help + "SafeGate is not an emergency service.")
```

- The child's truthful line comes from `calmLeadFor(state)` in `src/lib/calmLead.ts`, which now takes the server's calm state; `calmLead(calmMode, emergency)` delegates to it for the child app's local state, so there is still exactly one place the words are written. Emergency wins over seen, seen over active. **It never promises a time.**
- The parent's Alert "What Alex sees now" quotes the exact same `calmLead()` line, so the two sides can never disagree.
- Calm mode has **no back, no close, no tab bar**; Get help stays. It shows the Feet on the floor steps one per card, "Read to me", then the call-someone card and the emergency note. No characters, emoji, chips, red or timers.
- In calm mode the AI is off: the Talk conversation is cut at the moment calm mode started, and the parent's transcript shows a divider "Calm steps started here · <time>" with "Concern: High" and **nothing from the AI after it**.
- "About the same" on How are you feeling now goes back to calm mode; "Worse" goes to Get help.
- **Variant C28 (emergency order):** the same screen with "If you are in danger right now" + Call 000 and the helplines first, steps after (`/calm-mode?order=emergency`, also used automatically once emergency services were requested).
- **Help request (not calm mode):** a help topic's *Let Jordan know* → `requestHelp(topic)` → parent Home "Needs you" shows it → Alert (help-request version) → *I've seen this* (`ackHelp`).

**Backend responsibilities here** (the most important integration). Built on 13 Oct 2026:
1. **Done.** The safety engine classifies each child message before the AI is called; `POST /companion/reply` returns the risk and Talk switches on it.
2. **Done, by fetch not push.** Calm state lives on the server and the child's app reads `GET /companion/calm-state`, which returns only `active` / `seen_by_grown_up` / `emergency_requested` / `started_at`. **Its response has no field for a level, a score or anything the classifier said** (rule 5). Live push is still to come: today the app asks.
3. **Done.** `GET /children/{id}/alerts` gives the parent the time, the concern level (parent only), a plain "what happened" line and who else was told. The conversation is a separate, deliberate step (`GET /children/{id}/conversations`).
4. **Done.** *I've seen this* (`POST .../acknowledge`) and *Contact emergency services* (`POST .../emergency-services`) record who and when, and change the child's line. **SafeGate still contacts nobody.**
5. Still the child app's own job: the calm screen survives a restart from local state, and asks the server which line to show.

**Who may make the child's line say "seen".** Only the child's **own parent**
(`alerts.seen_by_parent_at`). An admin clearing the ops alerts inbox sets a separate
`acknowledged_at` and changes nothing the child sees and nothing the therapist is told
about the family -- an admin is not someone who looks after that child. This was a real
bug: before the split, an admin working through their queue made a child's screen claim
a grown-up who looks after them had seen it.

---

## 11. Every screen: child app

Format: **what it's for** · **what's on it** · **why it's built this way** · **backend** (what real data it needs). `[GH]` = the Get help button.

### C01 · Splash (`app/index.tsx`)
- **For:** a calm first frame while fonts load.
- **On it:** the SafeGate logo (the G mark above the wordmark) alone on white; it fades, soft ripple rings spread while Welcome's background fades in, then Welcome (~2.3 s). No spinner, tagline or progress bar.
- **Why:** the owner asked for subtle, background-level motion (an earlier falling-droplet version was rejected). Reduce-motion: the logo, then Welcome. 3.6 s fail-safe so it can never get stuck.
- **Backend:** in production, route here by session: signed-in child → child Home (or calm mode if active), signed-in parent → parent Home, else Welcome.

### C02 · Welcome (`app/welcome.tsx`)
- **For:** decide who's holding the phone.
- **On it:** small wordmark, `[GH]`, character collage, "Welcome." / "Who is holding this phone?", two big choices: **I'm a kid** ("This phone is mine") → C03, **I'm a parent or carer** ("I look after a child who will use this") → P01; link **I already have a code** → C04; emergency note card with **Call 000**.
- **Why:** one question, two big targets. Get help and 000 exist even before sign-in (rule 1, rule 4).

### C03 · Ask your grown-up first (`app/ask-grown-up.tsx`)
- **For:** a child can't set up an account; the grown-up does.
- **On it:** back, `[GH]`, one centred card with a character: "Ask your grown-up first" / "A grown-up who looks after you sets up your account. Then they give you a code to type in here." · **I have a code** → C04.
- **Why:** the parent owns the account (children never create accounts or passwords).

### C04 · Link my phone (`app/link-phone.tsx`)
- **For:** link the child's phone to the parent's account with a 6-character code.
- **On it:** back, `[GH]`, "Step 1 of 2", "Let's link your phone", six code boxes (one real hidden input underneath, auto-advance, uppercase), note "Your grown-up gets this code when they set up your account. Ask them to read it out.", **Link my phone** (enabled at 6 characters).
- **Wrong code:** calm text with an info icon, no red, no shake: "That code didn't work. Check each letter with your grown-up and try again."
- **Why:** no email or password for the child; a short code a parent can read aloud.
- **Backend:** validate the code, create the child device session, return the child profile + Comfort settings. Demo code `ABC123`.

### C05 · How this works (`app/how-it-works.tsx`)
- **For:** tell the child the truth before they use the app.
- **On it:** three lines with icons: "Your grown-up can read what you write here. They look after you." · "If you say something that means you might not be safe, a grown-up who looks after you will be told, so they can help." · "Some things are easier to say to a person. You can tell your therapist in your session." Emergency note. **I understand** → Home (replace, no way back).
- **Why:** rule 3 (no privacy promise) and checklist conflict 1 (warn in advance that calm mode can happen). First time it can't be skipped (no back/close). Opened again from You it shows a back arrow instead. The third line was reworded on 25 Sep 2026 so it no longer implies the therapist keeps secrets.

### C06 · Home "Your day" (`app/(child)/home.tsx`, tab)
- **For:** a gentle plan for today, not a to-do list.
- **On it:** full-bleed navy hero with a character: "Good morning/afternoon/evening, Alex!" + "Nothing here has to be done. Pick what helps." + a **Chat with AI** pill; `[GH]`. "Your day (5 MIN)" + **Edit** (→ You). A timeline of rows: **session** first ("session with Priya at 4:00 pm", SESSION · date → My sessions), then the rows the parent turned on (check in → Today I feel, calm → Calm me, chat → Talk, journal → Journal, task → My task). A row done today shows a quiet "✓ done".
- **Why:** "Nothing here has to be done" is deliberate: no pressure, no streaks, no counters, no strike-through (rule 7). The parent decides which rows appear (P23) so the child sees few choices. Session always first because it's the anchor of the week.
- **Backend:** next session, the day plan (from P23), done-today flags.

### C07 · Explore (`app/(child)/explore.tsx`, tab)
- **For:** find something that helps, by feeling or thing.
- **On it:** navy hero with a character; search "Search by feeling or thing" (filters tiles by label + keywords); quick chips (School · Home · Friends · Bedtime · Too loud · Busy head); "Based on how you feel" (slow breathing / chat about your day / write one good thing); "Ask your AI companion" tiles (open Talk with the prompt prefilled: Break it into steps, Explain it simply, Tell me a joke, Plan my day → My task, Read it to me, Just chat); "Calm your body" (Breathing, Feet on the floor, Sounds); "Write and check in" (Journal, How do I feel?, Kind words).
- **Why:** everything the child can do, grouped by need, one tap from the tab bar.

### C08–C09 · Talk (`app/talk.tsx`, full screen)
- **For:** talk to the AI companion.
- **On it:** close ✕ (left), "Talk", `[GH]`. Under the header: 👁 "Your grown-up can read what you write here." Empty: "Say anything you like." + "This chat isn't kept on this phone. Your grown-up can still read it." Composer: Ideas (quick ideas chips: *Break it into steps*, *Explain it simply*, *Tell me a joke*; tapping one sends it), Speak (mic → C10), Send.
- **Conversation:** reads like a page, **not chat bubbles**: "AI companion" / "You" captions, companion lines emphasised in navy, the child's lines plain. First send adds the greeting "Hi Alex. What would you like to talk about?". Companion **card** (blue tint, "AI companion" badge) with **Open as a checklist** (→ My task with the card's steps) and **Answer** (focuses the input).
- **Demo replies** (`replyTo()` in `src/data/talk.ts`, DEMO ONLY): picked by simple matching so the demo has variety. *Break it into steps* asks what, then gives a steps card (getting ready for school, tidying a room, homework or bedtime, each with its own checklist); *Explain it simply* asks what, then explains a few topics in short sentences with one example (fractions, why the sky is blue, how plants grow, rain) or says it doesn't have a simple answer and suggests a teacher or grown-up; *Tell me a joke* tells kid-friendly jokes in turn ("Want another one?"). Homework ("I don't know where to start" → "What subject is it?" → the steps card) is demo step 4. Greetings, thanks, feeling words (a reply that offers a calm step or a trusted grown-up), "bored", and a few gentle fallbacks in turn cover the rest.
- **States:** waiting ("Thinking…", Send disabled, no typing dots) · offline (composer replaced: "Talk isn't available right now because there's no connection. You can still:" + Calm me + "Get help — calling works without internet") · after calm mode (a pinned card that can't be dismissed: "If things get hard again, you can call someone." + Call Kids Helpline + Get help + "SafeGate is not an emergency service.").
- **Why:** page-like text is easier to read than bubbles and doesn't mimic a person texting (rule 2). Plain text only: no links, avatars, reactions, camera or photos. The "grown-up can read" line is always visible (rule 3). Failed messages keep the typed text in the box.
- **Backend:** send message → safety engine → (if normal) AI reply; or a mode switch to calm mode / blocked / not sent. Replace the scripted replies (section 14).

### C10 · Speak (`app/speak.tsx`)
- **For:** push-to-talk voice input.
- **On it:** close, "Talk", `[GH]`, "Hold the button, or tap to start", a big record/stop button, "Listening…", a timer; **Type instead** and **Cancel**. While listening, soft rings pulse out from the button.
- **Why:** voice is never the only way (rule 13). The rings are the familiar "it's listening" cue (the one pulse allowed in the child app, rule 10); they stop moving with reduce-motion. No waveform.
- **Backend:** speech-to-text. The demo records nothing and always "hears" "I have homework and I don't know where to start".

### C11 · Is this right? (`app/is-this-right.tsx`)
- **For:** the child checks and fixes what was heard before it's sent.
- **On it:** "Is this right?" + the heard words as **editable** text; **Send** (back to Talk and sends) · **Edit** · **Record again** · **Cancel**. Variant `?unsure=1`: "I want to make sure I heard you right. Is this what you said?" with Yes, send / Edit / Say it again.
- **Why:** never auto-send a transcription (rule 13).

### C12 · Today I feel (`app/feel.tsx`)
- **For:** a quick mood check-in.
- **On it:** back, "Today I feel", `[GH]`. Five moods left to right (**Bad · Not great · Ok · Good · Great**, default Ok) as faces; picking one changes the big word, the face and the band's tint. Feeling chips change with the mood (multi-select). **Add details** → C13 · **Save without details** → C14.
- **Why:** colour never alone (word + face + tint). Plain kid words, no clinical scales. Saving without details keeps it to one tap.
- **Backend:** save check-in (mood, feelings, topics, time); parent sees it.

### C13 · What's going on? (`app/whats-going-on.tsx`)
- **On it:** back, "Step 2 of 2", `[GH]`, mood-tinted band, "What's going on?" / "Pick as many as you like, or none.", tiles (School · Home · Friends · Sleep · Noise · My body · Something changed · I don't know), **Save** → C14.

### C14 · Check-in saved (`app/checkin-saved.tsx`)
- **On it:** `[GH]`, the mood's face, "Thanks for telling me." / "That's all. Nothing else to do." / "Your grown-up can see this check-in." · **Back to home** · **Talk about it**.
- **Why:** confirm the action (silence reads as failure) without celebration; honest about who sees it.

### C15 · Calm me (`app/calm.tsx`)
- **For:** the child's own, voluntary calm-down activities (not calm mode).
- **On it:** back, "Calm me", `[GH]`, "Short steps you can do any time.", filter chips (Slow down · In my body · Busy head · Too loud), activity cards (Feet on the floor 5 steps, Slow breathing 4, Squeeze and let go 6).
- **Why:** no ratings, timers, locks or "premium".
- **Backend:** approved calm activities are content (clinician-approved in the real product).

### C16 · Calm activity (`app/calm-activity.tsx?id=`)
- **On it:** back + title, `[GH]`, "Short steps to feel steady.", hero band ("N STEPS", title, description), "Good for when…" (three lines), "What you'll do" (four small cards, the last always "Read to me"), **Start** → C17.

### C17 · Calm steps (`app/calm-steps.tsx?id=`)
- **On it:** back, `[GH]`, "Step 2 of 5" + dashes, one step per card in large text, **Back** / **Next**, **Read to me**. After the last step → C27 (from calm). Marks calm done for today.
- **Why:** one thing per screen; no timer, countdown or auto-advance; Read to me is always the child's choice (never automatic).
- **Shared parts:** shares `StepPager` with calm mode.

### C18 · Journal (`app/journal.tsx`)
- **On it:** back, "Journal", `[GH]`, "Your grown-up can read what you write here.", navy "Today's idea" panel ("What made you smile today?", **New idea** cycles 4 ideas, **Start writing** → C20), "Explore" topics grid (About me · Happy things · Big feelings · Friends and family · School · Dreams, each "N IDEAS") → C19.

### C19 · Journal topic (`app/journal-topic.tsx?id=`)
- **On it:** header band in the topic colour (back, `[GH]`, "JOURNAL", topic title), a list of prompts with tags (sentence case: "What does worry feel like in your body?") → C20.

### C20 · Journal writing (`app/journal-write.tsx?prompt=`)
- **On it:** close, `[GH]`, "Your grown-up can read what you write here.", the prompt big, the text area; toolbar Ideas · mic · **Save**. After Save: a companion card ("Thank you for writing that. Would you like to add anything else?"; for the smile prompt: "That sounds fun. Who were you playing with?") with **Answer**.
- **Backend:** save entry (parent can read it), AI follow-up question (through the safety engine).

### C21 · My task (`app/my-task.tsx`)
- **For:** one task broken into steps.
- **On it:** back, "My task", `[GH]`, navy task panel with "TODAY'S TASK", the title and progress ("2 of 5 steps" / "done"), "Steps (from your AI companion)" as tick rows, and when all ticked "All done!" / "You did every step." / **Start again**.
- **Which task:** by default "Get ready for school" (5 steps). Opened from a Talk card's *Open as a checklist*, it shows **that card's own steps** ("Start my maths homework": put the sheet and a pencil on the desk · do the first question only · take a short break), and that stays the current task until another card replaces it.
- **Why:** the only place progress is shown (it's one task, not a score). No points, confetti or strike-through. The card→checklist link was changed during the rehearsal: a maths card opening "Get ready for school" looked broken.
- **Backend:** tasks generated by the AI companion (structured steps), tick state.

### C22 · My sessions (`app/my-sessions.tsx`)
- **On it:** back, "My sessions", `[GH]`, "Your next time with your therapist.", the session card (date, "Session with Priya", time · kind; video: disabled **Join** + "Join opens at 3:50 pm"; in person: clinic and address), "Before your session" (Find a quiet spot · Get a drink of water · Think of one thing to talk about), note "Some things are easier to say to a person. You can tell your therapist in your session."
- **Why:** read-only for the child: no calendar, cancel or reschedule (the parent manages bookings).

### C23 · You: Comfort settings (`app/(child)/you.tsx`, tab)
- **On it:** "Comfort settings", `[GH]`, "Change these any time. They work straight away.", hero "MADE FOR ALEX / Your comfort", Reading (Text size, Reading speed, Country, which cycle on tap), "Turn on what helps" (switches), More (My sessions · How this works · About SafeGate).
- **Why:** no Save button (changes apply instantly), no sign-out, no delete on the child side. Value rows cycle instead of numeric inputs (dyscalculia).
- **Shared parts:** shares `ComfortSettings` with P07.

### C24 · About SafeGate (`app/about.tsx`)
- **On it:** back, "About SafeGate", `[GH]`, wordmark + "Version 0.1", emergency note + Call 000, three cards: "What SafeGate is" ("A place to talk, calm down and get help between sessions with your therapist.") · "Who you talk to" ("The AI companion is a computer program, not a person.") · "Who can read it" ("Your grown-up can read what you write here. If you might not be safe, a grown-up who looks after you will be told."), Privacy · Terms links.

### C25 · Get help (`app/get-help.tsx`)
- **For:** the one place for help, from every `[GH]` and the tab.
- **On it:** back, "Get help" (no `[GH]`: this is it), help-tinted. "If you are in danger right now, call 000." + a full-width **Call 000**. "Your people": Jordan / "Your grown-up" (Call, Text) · Priya / "Your therapist" (Message), initials only. "Other people you can talk to": Kids Helpline ("Free, 24 hours, for ages 5 to 25.", 1800 55 1800, Call / Chat) · Lifeline ("Someone to talk to, any time.", 13 11 14, Call / Text / Chat), each "Checked 14 September 2026". "Not sure what to do?" chips → C25a. Footer emergency note.
- **Message Priya** opens a message box: "Your grown-up can read what you write here." (rule 3), a writing box, "Messages aren't for emergencies. Priya reads them between sessions.", *Send* / *Cancel*. An empty send says "Write a few words first." (no red). Sent: "Message sent" with a tick, "Priya reads messages between sessions. If you need help right now, call 000 or a helpline." (no promised time), *Done*. The therapist gets "Alex sent you a message" in their notifications.
- **Why:** amber, not red. No SOS, map, hold-to-call or countdown. Text and Chat are first-class, not fallbacks (some children can't speak on the phone).
- **Backend:** the child's people (parent, therapist) and verified helplines per country (rule 16); the child → therapist message (visible to the parent too, per rule 3).

### C25a · Help topic (`app/help-topic.tsx?id=`)
- **For:** "Not sure what to do?" guidance for four situations: I don't feel safe · Someone is hurting me · I'm scared · Something hurts.
- **On it:** back, "Get help" (no `[GH]`), title, intro, numbered steps, a call-someone card with that topic's contacts in order, **Let Jordan know** (only where allowed) → `requestHelp(topic)` (confirms in place, parent Home shows it under Needs you), **Calm me** where relevant.
- **Why:** **"Someone is hurting me" never offers Let Jordan know and never lists the grown-up as a contact** (rule 11): it offers 000, Kids Helpline, and telling Priya or a teacher. The wording is placeholder pending review (`TODO(safegate)` in `src/data/helpTopics.ts`).

### C26 · Calm mode (`app/calm-mode.tsx`)
See section 10. **On it:** only `[GH]` in the header (no back, close or tab bar), "Let's slow things down together.", the truthful line in a blue-tint card, Feet on the floor steps (Step N of 5, Back/Next, Read to me), the call-someone card and "SafeGate is not an emergency service." It updates live when the parent acts.
- **Why:** the quietest screen in the app: no characters, emoji, chips, red or timers; arrives instantly; announces itself to screen readers.

### C28 · Calm mode, emergency order
Same content with 000 and helplines first, steps after (`?order=emergency`, and automatically once the parent has requested emergency services).

### C27 · How are you feeling now? (`app/feeling-now.tsx?from=calm|calmMode`)
- **On it:** `[GH]` only (no back/close/tab bar), "How are you feeling now?", three big choices with faces: **A bit calmer** · **About the same** · **Worse** (tap sends, no Next). From calm mode it also shows the truthful line and the call-someone card.
- **Routing:** from Calm me: calmer → Home, same → Calm me, worse → Get help. From calm mode: calmer → Talk with the after-calm banner, same → back to calm mode, worse → Get help. Either way "A bit calmer" marks calm done for today.

### C29 · Error (`app/talk-error.tsx?kind=notSent|blocked`)
- **On it:** back, `[GH]`, a gentle icon (not a warning triangle), and either "Your message wasn't sent" / "You can try again, or do something else for now." or "Something didn't come through" / "I couldn't show that safely, so I didn't show it at all. You can try again." · **Try again** · **Calm me** · **Get help**.
- **Why:** rule 15: no "Oops", no error codes, no red. "blocked" is what the child sees when the safety layer withholds an AI reply.
- **Backend:** map every child-facing failure to one of these two.

---

## 12. Every screen: parent area

Parent screens don't carry the child's Get help button; parents reach help lines from Home chips, Account and the Alert. The parent area is allowed richer visuals and motion than the child app (more characters, staggered entrances, drifting backgrounds).

### P00 · Sign in (`app/parent/sign-in.tsx`)
Email + password (prefilled `jordan@example.com` / `password`; any values work in the demo), **Sign in** → Home, link **Create an account**. **Backend:** real auth.

### P01 · Create account (`app/parent/create-account.tsx`)
Setup progress, "Let's set up SafeGate" / "You create the account. Your child never needs a password.", Your name · Email · Password (show/hide), note "Next you'll add your child. Then you'll get a code to type into their phone.", **Create account** → P02, **I already have an account** → P00. **Backend:** create the parent account.

### P02–P06 · About your child 1–5 (`app/parent/about-child.tsx?step=`)
One question per screen, back + "Question N of 5", **Next**:
1. "What should SafeGate call your child?" (name; "A nickname is fine.") + "How old is Alex?" (5 to 8 · 9 to 12 · 13 to 16).
2. "How has Alex been feeling lately?" (single): Mostly calm · Sometimes stressed or wound up · Often worried or upset · Big feelings are hard to handle · I'm not sure how to describe it.
3. "What tends to be hard for Alex?" (multi): Loud or busy places · Changes to routine · School and homework · Friendships · Sleep · Big feelings · Getting started on tasks · Talking to people.
4. "What would help Alex most right now?" (single): Calming down when upset · Breaking tasks into small steps · Someone to talk to between sessions · Getting ready for sessions · Feeling less alone.
5. "How does Alex like to communicate?" (multi): Talking out loud · Typing · Short, simple sentences · Pictures next to words · Having things read aloud.

*Why:* one question per screen keeps setup light for a stressed parent. Answers are plain words, not a clinical intake (rule 2). The name from step 1 is used everywhere. **Backend:** store the child profile; these answers could seed the AI's defaults and the Comfort settings.

### P07 · Alex's comfort (`app/parent/child-comfort.tsx`)
"Set how SafeGate looks and sounds for Alex. Alex can change these too." A live **preview** card rendered exactly as the child sees it, then the same settings as C23 (one shared store). **Next** → P08 in setup, or back when opened from Home/Account. **Backend:** child profile settings, editable by both.

### P08 · Link Alex's phone (`app/parent/link-child.tsx`)
Navy code panel "Alex's code: **ABC 123**" + **New code** + **Copy**, "How to link" (Open SafeGate on Alex's phone · Tap 'I already have a code' · Read this code out to Alex), "Waiting for Alex's phone…" (still text, no spinner), "Alex never needs an email or a password.", **Go to home**. **Backend:** issue a short-lived link code, report when the child links.

### P09 · Parent Home (`app/parent/(tabs)/home.tsx`, tab)
- Full-bleed navy hero ("Good afternoon, Jordan", "Here's Alex's day.", **Find a therapist**), top-right the **bell with the unread count** (→ P26) and the child avatar (→ Account).
- Chips: Sessions · Chats · Journal · Insights · Help lines.
- **Needs you** (live): calm mode → "Alex's app switched to calm steps" · "Today, <time>" · NEEDS YOU (then SEEN) → Alert; a help request → the topic · NEEDS YOU → Alert; otherwise "Nothing needs you right now".
- **Updates** (under Needs you): the 3 newest non-urgent notifications and *View all* → P26; urgent items appear only in Needs you, so nothing shows twice. Empty: "Nothing new about Alex." The Home tab icon carries the same count.
- **Coming up:** the booked session → Sessions.
- **Today with Alex:** a timeline of today's events (calm steps started, checked in + mood, chatted, wrote in the journal), live items replacing demo ones.
- **Quick actions:** Book a session · Read chats · Share with Priya · Alex's day · Comfort settings · Link code.
- *Why:* the parent's first question is "does anything need me?", so Needs you comes first. **Backend:** alerts, next session, today's activity feed.

### P10 · Find a therapist (`app/parent/find-therapist.tsx`)
Filter chips (All · Psychologist · Occupational therapist · Speech pathologist · Counsellor; Counsellor shows an empty state "No counsellors yet"), a card per therapist (initials, "NEXT FREE: MON 12 OCT", name, one-line blurb) → P11. "Next free" is worked out from each therapist's hours and bookings (`src/lib/schedule.ts`): Priya's change live when she edits My hours. **No star ratings, no prices.** **Backend:** therapist directory with availability.

### P11 · Therapist profile (`app/parent/therapist.tsx?id=`)
Navy header with initials and name, intro, "N YEARS WITH KIDS", tagline, "Good fit for" (three lines), "Ways to meet" (Video call · In person or "Video only for now" · Parent check-in · Notes after sessions), **Book a session**. `?preview=1` is the therapist's own "Your profile" (T11): the same page without the Book button.

### P12 · Book + P12b You're booked (`app/parent/book.tsx?id=`)
"Book with Priya", This week | Next week, "Pick a time" (the first 3 free times, **More times** shows the rest; a week with none says so), "How would you like to meet?" (Video call · In person in <clinic>, hidden for video-only therapists), "Alex will see this session on their phone.", **Book this time** → dialog "You're booked" (date, time, therapist, kind; "Alex will see it on their phone."; **Done** → Home, **See sessions**). The booking replaces the session everywhere (parent Home, Sessions, child Home row 1, child My sessions). No payment step (out of scope). **Every therapist's times are worked out from their hours** (weekly hours, session length + gap, time off, one-off times, the booking window and notice) minus their bookings: Priya's hours are edited in the therapist area (T03/T04); Sam's (video only, Wed + Fri mornings) and Mei's (Chatswood, Mon mornings + Thu afternoons) are fixed demo data in `DIRECTORY_HOURS`. A time only offered one way shows only that way. **Backend:** availability, create booking, notify the child's device and the therapist.

### P13 · Sessions (`app/parent/(tabs)/sessions.tsx`, tab)
Next-session panel, **Book another**, Upcoming | Past. Upcoming: the booked session (+ "The join link opens at 3:50 pm." for video) and a later one (Thu 29 Oct, in person). Past (live from the therapist's notes): Thu 8 Oct **NOTES COMING** ("Priya will share notes here.") until Priya shares them, then NOTES SHARED; Tue 6 Oct and Thu 24 Sep NOTES SHARED → P14.

### P14 · Session notes (`app/parent/session-notes.tsx`)
Close, "Notes from Priya", the session's date and kind, highlights, "What Priya shared" paragraph, "Things to try at home" (numbered cards), **Send Priya a note** (demo alert). It shows exactly the part the therapist shared in Write notes (T08), never their working notes (rule 21); a session whose notes aren't shared yet says "Priya will share notes from this session here." **Backend:** the shared part of the therapist's notes.

### P15 · Alert + P16 Contact emergency services (`app/parent/alert.tsx`)
- **The most important parent screen: clear, calm, no alarm red.**
- Close. Title "Alex's app switched to calm steps" · "Today, <time>".
- Facts: **Concern** "High" (a warning pill; **parent only**, rule 5) · **What happened** "Alex wrote something that may mean they are not safe." · **What Alex sees now** "Calm steps and phone numbers for help, with: "<the exact calm-screen line>"" · **Also told** "Priya Shah, Alex's therapist".
- **What you can do now:** Call Alex · Read the conversation (→ live transcript) · Message Priya ("Therapist notified at <time>").
- **I've seen this** (with "Then Alex will see: …" until tapped) → calm mode `seen`, the card confirms "You've marked this as seen."
- Set apart at the bottom: "If Alex is in danger right now, call 000." + **Call 000** + "SafeGate is not an emergency service." + a small text button **Contact emergency services about Alex…** → P16 dialog: "Only do this if Alex is in danger right now. SafeGate will record that you, Jordan Lee, asked for this at <time>. Alex will be told plainly what is happening." / "SafeGate is not an emergency service. You can also call 000 yourself." · **Yes, contact them** (records who/when; nothing is contacted) · **Not now** · **Call 000 instead**.
- **Help-request version:** title names the topic; What happened: "Alex tapped "Let Jordan know" on "<topic>" in Get help."
- *Why:* the parent needs facts and next actions, not alarm. "What Alex sees now" comes from the same function as the child's screen so it can't drift. Emergency contact is deliberately two steps and records who asked (rule 17).
- **Backend:** see section 10.

### P17 · Alex's chats (`app/parent/chats.tsx`)
"Alex knows you can read these.", Day | Week | Month, "Today" (live items from this session) then history by day (Fri 9 Oct: homework talk, calm steps, smile journal; Thu 8 Oct: school talk, calm-place journal) → P18. **Backend:** conversation list.

### P18 · A chat, read-only (`app/parent/transcript.tsx?id=`)
Back, "<Day>, <time>", **Share with Priya**, banner "You're reading Alex's chat. Alex knows you can read it.", the transcript in the Talk layout. Calm version: a divider "Calm steps started here · <time>" with "Concern: High" and nothing from the AI after it. No composer, no Answer button. `?id=live` builds from the current session (`src/lib/liveTranscript.ts`).

### P19 · Insights: Alex's week (`app/parent/(tabs)/insights.tsx`, tab)
"Alex's week" + **View more** (→ P20), an **interactive** mood chart over MON–SUN where the labelled days carry the mood's character and the mood word (no numbers or scores). Tapping a day rings its point and opens a card under the chart with what Alex shared that day: check-in time (or "from a chat" when there was no check-in), mood, the words Alex picked, what it was about, and a short note; tap again to close. Each day is a labelled button ("Wednesday 7 October: Bad. Show what Alex shared"). Then "What Alex shared" summary, small print "This summary is based on what Alex chose to share. It isn't medical advice. Talk to Priya about anything that worries you.", "What helps Alex": "Breathing steps · Ok or better · about 7 in 10 times". *Why:* the child sees no analytics (rule 14); the parent sees them in Alex's words. "About 7 in 10 times" replaced "~70%" because plain words beat percentages (dyscalculia). No scores, no "anxiety" levels, no red. **Backend:** weekly aggregates, per-day details for the chart (`MoodPoint.detail` in `src/data/insights.ts` is the shape), and a summary (AI-generated summaries must follow rule 2).

### P20 · Check-ins overview (`app/parent/checkins.tsx`)
Day | Week (default) | Month. Day shows today's actual check-in if there is one. The same interactive chart (Month taps open a week summary: dates, number of check-ins, what it was about, a note); "Good days" (4 days Ok or better vs 3 harder); "Compared with last week" (+1 day); "What makes Alex happy" (emoji chips); "What makes things hard"; longer "What Alex shared".

### P21 · Alex's journal (`app/parent/journal.tsx`)
"Alex knows you can read these.", today's entries (live) then demo entries by day → P18.

### P22 · Share with Priya (`app/parent/share.tsx`)
A dialog-style card: "Share this week with Priya?" / "Priya will see Alex's check-ins and this summary before Thursday's session. Chats are only shared if you choose them." (the weekday comes from the booked session) · **Share** → the same card turns into "Shared with Priya" · **Not now**. *Why:* sharing with the therapist is always the parent's explicit choice; chats are opt-in. **Backend:** share to the therapist portal.

### P23 · Alex's day (`app/parent/alexs-day.tsx`)
- "Choose what shows on Alex's home screen each day.", a navy plan card ("ABOUT 5 MIN A DAY", plan title and text; **Change** cycles Calm mornings / After school / Wind down).
- Settings: Focus (Calming down / Getting ready / Talking about feelings) · Things in Alex's day (2 / 3 / 4 things).
- "What's in Alex's day" switches: How do I feel? · Breathing · Calm steps · Chat with AI · Journal · Sounds · Kind words · My tasks. Breathing, Sounds and Kind words show "Not on the home screen yet".
- A live preview "On Alex's home today".
- **Rule:** `homeRows(day)` = items that are on and have a Home row, in order, capped at the count. Turning on an item that belongs on Home when the day is full raises the count by one (up to 4) and says "Journal added. Alex's day now has 4 things." (fixed during the rehearsal: before, switching Journal on did nothing when the day was full).
- *Why:* the parent keeps the child's Home short and the same every day (predictability, fewer choices). **Backend:** the day plan belongs to the child profile.

### P24 · Account (`app/parent/(tabs)/account.tsx`, tab)
Navy "PARENT ACCOUNT" card (Jordan Lee, email), Your child (Alex · "Phone linked" / "Not linked yet" → P07 or P08), Alerts (How we reach you: App and text · Also tell: Priya Shah · All notifications), **What we tell you about** (Needs you: "Always on" with a lock, not a switch · Sessions and notes · Tell me each time Alex checks in or writes, off by default · Daily summary around 7:00 pm), Help (Help lines · How SafeGate works · Privacy), **Sign out** → Welcome. In the demo, sign-out only clears who's signed in so the story (bookings, shares) survives switching sides.

### P25 · Help lines (`app/parent/help-lines.tsx`)
000 ("If Alex is in danger right now"), Kids Helpline, Lifeline, each with number, what it's for, Call / Text / Chat and "Checked 14 September 2026"; emergency note. Parentline and Beyond Blue were optional in the spec and are **left out until verified numbers are supplied** (rule 16: numbers are never written from memory).

---

## 12a. Notifications (parent and therapist)

**Where:** parent — the bell + count in the Home hero, the same count on the Home tab, "Updates" on Home, P26. Therapist — the bell + count on Today, the Today tab, "Needs attention", T10. **Never in the child app** (rule 20).

**The count** = unread items + urgent items not yet dealt with (each counted once), "1"…"9", then "9+". Opening the list doesn't clear it; tapping an item, *Mark all read*, or dealing with an alert does ("I've seen this" for the parent, "Noted" for the therapist). Opening a client's Shared tab reads "Jordan shared Alex's week".

**Every item names the child** (the type's character with the child's initial on its corner, and the name in the title), so it works unchanged for a parent with two children or a therapist with many clients.

| Type | Who | Made by | Opens | Urgent | Pushed |
|---|---|---|---|---|---|
| calm | parent, therapist | calm mode starting | P15 / T09 | yes | yes |
| help | parent | "Let Jordan know" in a help topic | P15 | yes | yes |
| emergency | therapist | the parent contacting emergency services | T09 | yes | yes |
| checkin | parent | a check-in | P20 Day | no | only if the parent asks |
| journal | parent | a journal entry | P18 | no | only if the parent asks |
| booking | parent (+ therapist, when it's with them) | a booking | P13 / T07 | no | per settings |
| reminder, week | parent | seeded in the demo (the day before a session; Sunday evening) | P13 / P19 | no | reminder yes |
| notes | parent | the therapist sharing notes | P14 | no | per settings |
| shared | therapist | Share with Priya | T06 Shared | no | per settings |
| notesDue | therapist | a finished session with no notes (seeded: Thu 8 Oct) | T08 | no | no |
| childNote | therapist | the child's message from Get help → Message Priya | T06 | no | yes |
| linked | parent | the child's phone linking (once) | P07 | no | no |

### P26 · Notifications (`app/parent/notifications.tsx`, layout in `src/components/NotificationsScreen.tsx`)
Back, "Notifications", *Mark all read* (only while something is unread). Segmented All · Needs you · Sessions. Urgent items still open are pinned under "Needs you"; the rest in Today / Yesterday / Earlier cards. Unread = bold title + a navy "New" badge (never a colour-only dot). Empty states per filter ("You're all caught up."). Footer: *Choose what we tell you about* → Account. *Why:* one place for everything that happened, without burying urgent things. **Backend:** the notification feed, read state, push delivery per the rules above (the prototype shows no fake phone pop-ups; each item records whether it would be pushed).

---

## 12b. Every screen: therapist area

The therapist area is part of this app: one design system, and one shared store so the live story works (a parent books → the therapist's calendar shows it; the therapist shares notes → the parent is told). **Every screen reuses the parent area's parts** (navy hero, navy panels, raised cards, Sessions cards, Book's tiles, the Alert's facts card); the right column says which screen it copies, so nobody invents a third style. Only Priya signs in; Mia R. and Leo T. are static clients so the list reads like a caseload. Every side shares one demo day, **Sunday 11 October** (Priya doesn't work Sundays).

**Illustrations on the therapist side:** characters are for the child and parent screens. The therapist side uses the therapist's **own photo** (Today's hero, the Account panel, Your profile) and keeps only each **child's own character**, because that's how a child is recognised across the app (client cards, the Client header, notifications, Needs attention). Decorative art (hero characters, the Calendar panel, the sign-in collage, empty-state characters) is left out. Families never see the photos: the parent area keeps initials and characters.

### T00 · Therapist sign in (`app/therapist/sign-in.tsx`)
The parent's sign-in layout (no collage), Priya's details prefilled. No "Create an account": "Therapists join SafeGate by invitation." Welcome has an *I'm a therapist* link under the two choice tiles. **Backend:** therapist auth and registration checks (out of scope here).

### T01 · Today (`app/therapist/(tabs)/today.tsx`, tab)
Copies parent Home's layout, but the hero is **Priya's photo** under a navy overlay that is strongest behind the text and the bell (so white text stays readable on any photo) ("Good morning, Priya", "Sunday 11 October", *My hours*, bell + "PS"), **Needs attention** (urgent alerts first; notes still to write; a family's newly shared week), **Today** ("No sessions today"), **Coming up** (the next 3 bookings as Sessions cards, Alex's live from the store), **Open times this week** (chips → change or remove), quick-action tiles. *Why:* the same "does anything need me?" first question as the parent's Home.

### T02 · Calendar (`app/therapist/(tabs)/calendar.tsx`, tab)
Copies Sessions + Book: a navy "THIS WEEK" panel with the counts, Week | Day, week arrows (+ "Back to this week"), the day strip, then each day as a card of calendar rows (booked · open · away · off, always in words) with *+ Add time*. *Why a list and not a 7-column grid:* at phone width a grid leaves ~40 px per day and breaks at big text sizes; a true grid is for a later tablet/desktop layout. Row labels read like "Thursday 29 October, 4:00 to 4:50 pm. Alex, in person. Open session".

### T03 · My hours (`app/therapist/availability.tsx`) + Day hours (`app/therapist/hours.tsx`)
Copies Alex's day (switch rows, rows that change on tap) and Book (the how-to-meet pictures): weekly hours per day (switching a day on asks for its hours; each range is a chip to change), session length 45 · 50 · 60 min, gap None · 10 · 15 min, video / in person, "Families can book up to 3 weeks ahead", notice, time off (× to remove, *Add time off*), and "What families see" (the live Find a therapist card + how many open times). Changes save as you go. Day hours: From / Until picked from time chips; the sticky bar says "3 sessions of 50 min" and warns about overlaps. *Why chips:* times are picked, never typed (dyscalculia).

### T04 · Add or change a time (`app/therapist/slot.tsx`)
Copies Book: day tiles (with week arrows), *Starts at* chips, length, how you meet (Either way / Video call / In person), *Repeat every <day>* (adds to the weekly hours), a sticky line saying exactly what will be saved. Clashes with a booked session or a day away are blocked with a plain message. The same screen changes or removes an open time, adds time off (From / Until / an optional name), and shows a booked session read-only with *Open session* (moving a family's session needs the family, so it's out of scope).

### T05 · Clients (`app/therapist/(tabs)/clients.tsx`, tab)
Copies Find a therapist: search, filters (All · Session this week · Needs attention), a card per child (initial + character, age band, parent, next session, last shared check-in as a mood word, NEEDS ATTENTION / SHARED THIS WEEK).

### T06 · Client (`app/therapist/client.tsx`)
Copies the therapist profile's navy header (initial + character, "Message Jordan"). **Overview:** goals (editable, "plain words, no scores"), Jordan's "About your child" answers, Comfort settings (read-only, with a lock), current things to try at home. **Shared** (rule 19): the week's interactive chart and Jordan's summary only after Share with Priya; chats only if chosen; calm-step alerts always, with what Jordan did. **Sessions:** upcoming and past (NOTES SHARED / DRAFT / WRITE NOTES).

### T07 · Session (`app/therapist/session.tsx`)
Copies Session notes' header card and the Alert's facts card. Before: "Since the last session" (check-ins shared, alerts, what helped at home: only what was shared) and last time's things to try; *Join video call* (demo) or the clinic address. After: the notes in their two parts, or "No notes yet"; *Write notes* / *Edit notes*.

### T08 · Write session notes (`app/therapist/notes.tsx`)
Session notes as a form, in two clearly separate parts (rule 21): **Shared with Jordan** (JORDAN WILL SEE THIS: up to 3 highlights with a picture, "What I'd like Jordan to know", up to 3 things to try) and **My working notes** (grey, lock: "Only you can see these. Jordan and Alex never see them."). A hint: "Write for Jordan: plain words, no scores." *Share with Jordan* asks first, then tells the parent and clears "Write notes for Alex"; *Save draft* keeps it without sharing. After sharing, the family's part changes only with *Share the changes*.

### T09 · Client alert (`app/therapist/alert.tsx`)
Copies P15 (shared `AlertParts`): Concern: High (allowed for grown-ups only), what happened, what Alex sees now (the same `calmLead()` line), **what Jordan has done** ("Not seen yet" / "Jordan saw this at …" / emergency), *Message Jordan*, *Read the conversation*, and the emergency section set apart. *I've seen this* is the parent's action; the therapist taps **Noted**, which only clears their own list.

### T11a · Your profile (`app/therapist/profile.tsx`)
Therapists join by invitation and details can be missed or change, so they edit what families see: role (chips), years with kids, the line on their card, headline, "About you", "Good fit for" (up to 3, tap the picture to change it), and the clinic (a switch for in person, with name and address; off = "Video only for now"). *Save changes* checks the essentials in plain words, then families see it at once on Find a therapist, the profile and Book (`profileEdits` in the store, merged by `useTherapist()`). *See it as families do* opens the family profile without the Book button and without the character. The photo sits at the top (Change photo is a demo alert); name and email come from the invitation ("contact SafeGate support"). **Backend:** the therapist profile, with the same fields.

### T10 · Notifications (`app/therapist/notifications.tsx`)
The same screen as P26 with the therapist's items (Needs attention · Sessions).

### T11 · Account (`app/therapist/(tabs)/account.tsx`, tab)
Copies parent Account: "PRACTITIONER" panel with Priya's photo (no character), Your practice (Your profile → T11a, My hours, All notifications), What we tell you about (Needs attention always on · New bookings · Families sharing their week · Reminders to write notes), Help, *Sign out* → Welcome.

---

## 13. State: the store

`src/store/app.ts` (Zustand). It is the shape the backend has to fill; each field lists its production source.

| Field | Meaning | Production source |
|---|---|---|
| `childLinked`, `parentSignedIn` | who is signed in (demo flags) | real auth / device sessions |
| `calmMode: 'off' \| 'active' \| 'seen'` | calm-mode state | safety engine + parent actions, pushed live |
| `calmAt` | time calm mode started ("3:42 pm") | server |
| `emergency: { by, at } \| null` | parent asked for emergency services | server |
| `afterCalm` | Talk shows the after-calm banner | derived from calm-mode history |
| `helpRequest`, `helpRequestAt`, `helpSeen` | a "Let Jordan know" request and whether the parent saw it | server |
| `messages: { id, from: 'companion' \| 'me', text, card? }[]` | this Talk conversation | server (never stored on the device) |
| `pendingSpeech` | Is this right? → Talk hand-off | local UI state |
| `taskId`, `taskDone[]` | current My task and its ticks | AI-generated task + server |
| `checkin: { mood, feelings, topics, at } \| null` | today's check-in | server |
| `comfort` | Comfort settings (section 8) | child profile |
| `journal: { prompt, text, at }[]` | journal entries this session | server |
| `child: { name, age, feeling, hard, help, communicate }` | About your child answers | child profile |
| `session` | the next booked session | bookings |
| `sharedWeek` | Share with Priya done | server |
| `day: { plan, focus, count, on }` | Alex's day | child profile |
| `doneToday: { checkin, chat, calm, journal, tasks }` | quiet "done" ticks on Home | server (today's activity) |
| `notifications: Notification[]` | both sides' notifications (`audience: 'parent' \| 'therapist'`, type, title, detail, when, href, urgent, push, read, resolved) | notification service + push |
| `alertPrefs`, `therapistPrefs` | what the parent / therapist is told about | user settings |
| `calmSeenAt` | when the parent tapped I've seen this (the therapist's alert shows it) | server |
| `therapistSignedIn` | demo flag | real auth |
| `availability` | Priya's hours: weekly ranges, length, gap, how she meets, window, notice, time off, one-off times, removed times | availability service (per therapist) |
| `sessionNotes: Record<bookingId, { highlights, shared, tryAtHome, working, sharedAt }>` | session notes; the parent only ever sees the first three | notes service (two permission levels) |
| `goals: Record<clientId, string[]>` | therapist-written goals | client record |
| `profileEdits` | what a therapist changed on their profile (merged over the directory data by `useTherapist()` / `useTherapists()`) | therapist profile |

**Actions:** `linkChild`, `signInParent`, `signOut`, `setCalmMode`, `setAfterCalm`, `markDone`, `addMessage`, `setPendingSpeech`, `openTask`, `toggleStep`, `resetTask`, `setCheckin`, `requestHelp`, `ackHelp`, `setComfort`, `addJournal`, `updateChild`, `requestEmergency`, `bookSession`, `shareWeek`, `setDay`, `toggleDayItem`, `signInTherapist`, `notify`, `markRead`, `markAllRead`, `markReadWhere`, `resolveNotification`, `setAlertPref`, `setTherapistPref`, `setAvailability`, `setDayHours`, `addExtraTime`, `removeOpenTime`, `addTimeOff`, `removeTimeOff`, `saveNotes`, `setGoals`. Real events create notifications inside the actions (calm mode, help, check-in, journal, booking, sharing, notes, linking). Screens call only these, so replacing their bodies with API calls (plus a live subscription for calm mode, alerts and help requests) is the natural integration path.

**Static data** lives in `src/data/`: `people.ts` (Alex, Jordan, Priya), `therapists.ts` (directory, slots), `sessions.ts` (default/later/past sessions, notes), `transcripts.ts` (parent chat history), `calm.ts` (calm activities), `journal.ts` (ideas, topics, prompts, replies), `helpTopics.ts`, `helplines.ts`, `moods.ts`, `insights.ts`, `explore.ts`, `day.ts`, `aboutChild.ts`, `talk.ts` (Talk script, demo triggers, tasks), `faces.ts` (art), `practice.ts` (the therapist side: clients, Priya's seed hours, Sam's and Mei's hours, bookings, past sessions, notes, goals), `notifications.ts` (seeded notifications, the look per type). All dates are anchored to a demo "today" of Sun 11 Oct 2026 (next session Thu 15 Oct) on every side (`DEMO_TODAY` in `src/lib/schedule.ts`).

---

## 14. What is faked, and what the backend replaces

| Where | What it does now | Replace with |
|---|---|---|
| `src/data/talk.ts` `matchTrigger()` + `app/talk.tsx` `send()` (`// DEMO ONLY`) | Typing `calm` / `calm mode` starts calm mode; `offline`, `not sent`, `blocked` show those states. | The safety engine's decision from the server. **Remove the keyword check** (rule 9). |
| `src/data/talk.ts` `replyTo()` (`// DEMO ONLY`, ~1 s "Thinking…" in `app/talk.tsx`) | Scripted replies picked by simple matching (the idea chips, follow-ups, jokes, a few topics). | Real AI replies, only after the safety check. Structured "card" replies (e.g. steps → My task). |
| `src/lib/call.ts` `callNumber()` / `contact()` / `demoOnly()` | Show a "Demo only" alert. | `Linking.openURL('tel:…')`, SMS, chat links, in-app messages to the therapist. Keep these three functions as the only way out. |
| `src/lib/demoSwitch.ts` | Alt+P / Alt+C / Alt+T presenter shortcuts (web). | **Delete** (and its call in `app/_layout.tsx`). |
| `window.__safegate` (end of `src/store/app.ts`) | Exposes the store in dev builds. | Delete, or keep dev-only. |
| `src/store/app.ts` | All state in memory, one device for both sides. | API + live updates; split child and parent into separately authenticated experiences (they can stay in one app with role-based routing, or become two apps). |
| `src/data/*` | Static demo data. | API data. |
| Link code `ABC123` | Always the same. | Short-lived server-issued codes. |
| Sign in / Create account | Accept anything (prefilled). | Real auth. The child never gets an email or password. |
| Speak / Is this right? | Records nothing; always "hears" the same sentence. | Speech-to-text (push-to-talk only). |
| Read to me | `expo-speech` on device (en-AU). | Can stay on device, or a TTS server. |
| Booking and availability | **Real (13 Oct 2026).** Every open time comes from the therapist's own hours on the server, already filtered by their notice period and booking window; booking writes a session with its way of meeting. Still no payment. | — |
| Notifications | Worked out on both sides from real data (alerts, notes shared, bookings, notes due). No push, and no notifications service. | A notification service + push, following rule 20. |
| Therapist area | **Built against the backend (8 Oct 2026).** Real sign-in, caseload, calendar, hours, profile, goals, sessions, notes (rule 21) and alerts. Still missing an endpoint: what a family has *shared* (rule 19), and messaging. | Sharing permissions per family; messaging if it's added later. |
| Therapist notifications | Worked out from alerts, sessions needing notes and bookings. | A notification service + push, following rule 20. |
| Session "Join" | **Real.** A per-participant link from the backend, only inside the session's own window. In-person sessions have no room and say so. | — |
| Read the conversation (therapist) | **Removed.** The backend gives a child's chats to the **parent only**; a therapist reads one only if the family shares it (rule 19). The Alert screen says so instead. | Sharing permissions per family. |
| Share with your therapist, Send them a note, Message them | **Share says it isn't ready** rather than setting a flag: telling a parent their child's week went to their therapist when it did not is worse than "not yet". Messages are still demo alerts. | Sharing permissions per family (rule 19); messaging if it's added later. |
| Contact emergency services | **Records who/when on the server** (`alerts.emergency_requested_at/by`), and the child's line changes. **Still contacts nobody.** | Whatever the real escalation process is; always behind the confirm. |
| Insights, check-in charts, summaries | **Empty, and they say so.** Nothing a child feels is recorded anywhere yet, so these screens show no chart rather than an invented week. | Check-ins (the child app writes, the parent reads), then aggregates; AI summaries must follow rule 2 and stay parent-only. |
| Help topics, calm steps, journal prompts | Placeholder wording, 12 `TODO(safegate)` markers. | Reviewed content. For this MVP the owner accepts the placeholders as is. |

**Things that must stay true after integration:** rules 5, 9, 11, 12 and 16 in section 3 depend on the backend. In short: never send risk levels to the child; decide calm mode on the server; never auto-notify the parent for "Someone is hurting me"; make the child's calm-screen line reflect real parent actions without promising a time; serve only verified, dated help numbers.

---

## 15. Map of references in code comments

Code comments use a few short references. Read them as:

| Comment says | Meaning here |
|---|---|
| "rule N", "product rule N" | Section 3 of this file (same numbering). |
| "checklist N.N.N" | An item of the accessibility checklist; section 8 covers what was applied. |
| Screen IDs (C06, P15…) | Sections 11 and 12. |
| `HANDOFF.md §N` | That section of this file. |

---

## 16. Toolchain gotchas

Learned the hard way; each cost real time.

- **pnpm 12 ignores `.npmrc`** for `node-linker` and build-script approval: `nodeLinker: hoisted` and `allowBuilds:` live in `pnpm-workspace.yaml`. Metro needs the hoisted tree.
- After any dependency change, run `npx expo install --check`. Install native deps with `npx expo install`.
- **Expo SDK 57 removed** `newArchEnabled`, `android.edgeToEdgeEnabled` and root-level `splash` from the config. Splash is the `expo-splash-screen` plugin. Custom ambient types go in `types/*.d.ts` (Expo regenerates `expo-env.d.ts`).
- **expo-router 57 vendors its own bottom tabs.** Don't install `@react-navigation/bottom-tabs`; the custom tab bars in `src/components/TabBars.tsx` use a small local props type. Import `Tabs` from `expo-router/js-tabs`.
- **Tabs on web:** keep `backBehavior="none"` on both tab navigators. Otherwise returning to a visited tab calls `history.go(-1)`, which can step out of the page load, reload it and reset state.
- **Don't use `router.dismissTo` / `dismissAll` on web** to leave a flow; they can walk out through browser history. Use `router.replace(target)`.
- **`StyleSheet.absoluteFillObject`** isn't in RN 0.86's types; use `StyleSheet.absoluteFill`.
- **react-native-svg on web:** an `<Svg>` with only an absolute-fill style renders at 300×150; pass `width="100%" height="100%"`.
- **Shadows:** use `boxShadow` strings (tokens `shadow.bar` / `shadow.lift`); the `shadow*` props are deprecated on web.
- **React Native Web ignores `hitSlop`**: `Tappable` handles web hit areas itself (section 8).
- **Pictures load once, at start-up** (`src/lib/preloadImages.ts`, called from `app/_layout.tsx`; the first screen waits for them, capped at 3 s). Without it every screen showed its characters 1–2 s after the page on a phone in development, because each image was fetched only when its screen opened. **Every bundled image must be listed in `src/data/faces.ts`** (`FACES` or `ART`) to be preloaded. On web the preloader marks React Native Web's image cache itself instead of using `Image.prefetch`, which waits for `image.decode()` and browsers can hold that back.
- **Routes live in `app/` at the repo root** (not `src/app/`). App code is imported with the `@/` alias (`@/components/…` → `src/`).
- **Face art** in `assets/faces/` has transparent backgrounds; keep it that way if you replace any (an opaque backdrop shows as a grey box on tinted circles). Welcome composes its collage from these faces.

---

## 17. Known gaps and open items

- **Placeholder copy** for help topics, calm steps and journal prompts (12 `TODO(safegate)` markers) hasn't been reviewed by a clinician. Accepted as is for this MVP.
- **Parentline and Beyond Blue** aren't listed: add them only with verified numbers and a "Checked" date.
- **Comfort settings stored but not yet wired:** Simple words, Speak to SafeGate, Show pictures with words, Fewer choices, Sounds (section 8).
- **Not tested:** a real screen reader (VoiceOver/TalkBack), a real phone build, and the phone's own text size at 200%. Everything was verified in the browser at phone size.
- **Helplines are Australia only** (Country has one option).
- **Offline variant** of How are you feeling now ("I'll check in with you when we're connected again.") is in the spec but depends on real connectivity.
- **Parent Home "Today with Alex"** falls back to demo items when nothing happened in the session.
- Journal "optional richer version" for the parent (entry counts, top feelings) wasn't built.
- **Therapist area:** only Priya signs in; Sam and Mei exist as directory entries with fixed hours. No in-app messaging (Message / Send a note are demo alerts). Moving or cancelling a booked session isn't built (it needs the family's agreement). Chats are never shared individually yet (the Shared tab says "No chats shared"). The calendar is a phone layout; a desktop/tablet grid is future work.
- **Parent setup answers** show as "Not answered yet" on the therapist's Client page if the demo skips setup (e.g. jumping straight in with Alt+P).

---

## 18. Decision log

Decisions made while building, with the reason, so nobody "fixes" them back.

| Date (2026) | Decision | Why |
|---|---|---|
| 24 Sep | Help colour is **amber** from the illustration palette, not red. | Red raises arousal and the reds failed contrast; amber is warm, distinct and on-brand. |
| 24 Sep | No logo mark; the wordmark (Poetsen One, navy) is the logo. | Confirmed by the owner. *Replaced 26 Sep: see below.* |
| 24 Sep | Red badges and red illustrations dropped; orange-red faces never used for feelings or errors. | Rule 15 and contrast. |
| 24 Sep | `textMuted` darkened to `#6A6F72` (and to `#5E6366` on 26 Sep). | The original grey fails contrast on grey cards. |
| 24 Sep | "Great" mood uses sunny yellow. | Keeps it distinct from the Get help amber. |
| 25 Sep | Visual sizes stay small (48 px buttons); hit areas grow to 56. | Keep the design tidy without breaking rule 8. |
| 25 Sep | Every screen gets a branded `Backdrop`; parent/login screens richer, child screens calmer. | The owner rejected plain white "AI-default" screens. |
| 25 Sep | Close ✕ moves to the header's left on child screens. | Get help always owns the top-right. |
| 25 Sep | Splash: wordmark → fade → soft ripple → Welcome. | Owner's direction; a falling-droplet version was rejected as wrong. |
| 25 Sep | Motion tiers enforced through one `useMotion()`; child motion follows the Movement switch. | Rule 10; the owner asked for the toggle to be genuinely verified. |
| 25 Sep | P19 says "about 7 in 10 times" instead of "~70%". | Plain words over percentages (dyscalculia). |
| 25 Sep | Alex's day: switching on a Home item when the day is full raises the count (max 4) and says so. | Otherwise the switch silently did nothing on the child's Home. |
| 25 Sep | Sign out keeps the demo story (bookings, shares); only who's signed in resets. | Lets the demo switch sides without losing state. |
| 25 Sep | Tab navigators use `backBehavior="none"`. | Tab switches on web could reload the page (found in the rehearsal). |
| 25 Sep | The Talk card's *Open as a checklist* opens that card's own steps. | A maths card opening "Get ready for school" looked broken. |
| 25 Sep | Booking step in the script uses **In person**. | The default session already matched the scripted slot, so nothing visibly changed. |
| 25 Sep | Parent Alert's "What Alex sees now" quotes `calmLead()`. | The parent and child screens can never disagree. |
| 25 Sep | Finishing calm mode ("A bit calmer") marks the child's calm row done. | Alex did do the calm steps. |
| 25 Sep | Web hit layer in `Tappable`; header titles wrap to 2 lines; contrast fixes on tints (`onTint`, `textSecondary`); screen transitions and dialogs follow motion tiers. | Accessibility pass. |
| 25 Sep | After-calm banner in Talk shows "SafeGate is not an emergency service." | Rule 4 (it offers a helpline call). |
| 25 Sep | "Some things are easier to say to a person. You can tell your therapist in your session." replaces "If you want to tell someone something private…". | The old line could read as a promise that the therapist keeps secrets (rule 3). |
| 25 Sep | "This chat isn't kept on this phone. Your grown-up can still read it." replaces "What you say here isn't saved on this phone." | "Isn't saved" could be read as "nobody sees it". |
| 25 Sep | Demo dates anchored to Sun 11 Oct 2026; next session Thu 15 Oct. | The old dates were a 2025 calendar and put the "upcoming" session in the past. |
| 26 Sep | Visibility pass: child backgrounds never fade to white; fields get a 3:1 edge (`fieldBorder`); white cards a hairline ring; chips white with an edge; `textMuted` → `#5E6366`; text buttons navy; outline buttons white-filled; the strongest parent glow softened. | White cards and fields looked edgeless on the child screens, and grey/blue text fell under 4.5:1 on the gradients. |
| 26 Sep | The centre tab (Talk / Book) is a bigger raised circle. | The main action should stand out from the other tabs. |
| 26 Sep | Speak shows pulsing rings while listening (still with reduce-motion). | Owner's call: the familiar listening cue; the one exception to "no pulsing" in the child app. |
| 26 Sep | Journal prompts in sentence case ("What makes you feel calm?"). | Lowercase prompts looked inconsistent next to the rest of the app. |
| 26 Sep | Mood charts are interactive (tap a day or week for details). | A static chart told parents little; the details are in Alex's words, never scores. |
| 26 Sep | All pictures preload at start-up; the mood chart draws on its first frame (estimated width, then measured). | Characters appeared 1–2 s after each screen on the phone. Verified: every picture on all 31 picture screens is drawn the moment the screen appears. |
| 26 Sep | Screen-reader labels drop doubled punctuation ("…steps.. Open"), in `Tappable`. | Screen readers read it out oddly. |
| 26 Sep | Notifications: a bell with an unread count on the parent Home hero **and** the Home tab; "Updates" under Needs you; a Notifications screen. Urgent items only in Needs you on Home. | The owner wanted parents to see at a glance that something is new, without burying urgent things. |
| 26 Sep | Check-ins and journal entries are quiet updates (listed, counted, a daily summary), not a push each time. Urgent items are always pushed. | A push for every check-in is noisy and feels like surveillance (rule 20). |
| 26 Sep | The therapist area lives in this app, reached from Welcome (demo: Alt+T). | One design system and one store make the live story work across the three sides. |
| 26 Sep | Every new screen copies an existing one's parts (listed in section 12b). | The owner's rule: new screens must not look different from the rest of the app. |
| 26 Sep | One demo day (Sun 11 Oct) on every side, so the therapist's Today has "No sessions today" and a Coming up list. | A therapist "today" on a different day broke the live story. |
| 26 Sep | A past session with notes still to write (Thu 8 Oct) was added; Alex's later session moved to Thu 29 Oct. | There was nothing for the demo's "Write notes" step, and Tue 27 Oct fell inside Priya's time off. |
| 26 Sep | The calendar's week is a list of day cards with a day strip, not a 7-column grid. | A grid doesn't fit a phone at big text sizes. |
| 26 Sep | Every therapist's open times are worked out from their hours (Sam and Mei too), and a booking counts against the therapist it's with. | The owner asked that every therapist works in the demo, not only Priya. |
| 26 Sep | Book lists only free times, so the demo's booking step picks Thu 15 Oct 5:00 pm in person. | Alex's own booked time isn't offered as free. |
| 26 Sep | The seeded "Jordan shared Alex's week" was dropped; nothing is shared with the therapist until Jordan shares it in the demo. | Rule 19. |
| 26 Sep | The therapist side uses the therapist's own photo (Today's hero under a navy overlay, Account, Your profile) and no decorative characters; each child keeps their own character. Families still see initials. | Owner's call: illustrations are for the child and parent screens. |
| 26 Sep | Therapists edit their own profile (Your profile); families see the changes at once. Name and email stay as invited. | Invitations can miss details; the name also links bookings and notes. |
| 26 Sep | Therapist photos are shipped as small optimised copies and preload with every other picture. | The originals were 0.9–1.6 MB each; no screen should wait for a photo. |
| 26 Sep | The real SafeGate logo (wordmark + G mark, from the brand artwork) replaces the typed wordmark everywhere, including the app icon, splash and favicon; Poetsen One is no longer loaded. | The owner supplied the logo for full branding. |
| 26 Sep | Talk's idea chips send straight away and each has its own reply; replies are matched to what was written instead of a fixed order. | Every message used to get "What subject is it?" first; the demo needed variety. |
| 26 Sep | Dealing with an alert ("I've seen this", "Noted") also marks its notification read; opening a client's Shared tab reads "Jordan shared …". | Found in the rehearsal: the count stayed up after the parent had acted. |

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Companion / AI companion | The AI the child talks to. Never "therapist", never a person. |
| Therapist | The human professional (psychologist, occupational therapist, speech pathologist, counsellor). |
| Grown-up | How the child app refers to the parent or carer. |
| Calm mode | What the child's app switches to when something serious comes up: scripted calm steps + helplines, no chat, no way back until the check-in. Decided by the safety engine. |
| Calm me | The child's own, voluntary calm-down activities (not calm mode). |
| Check-in | "Today I feel": a mood + feelings + what's going on. |
| Link code | 6 characters the parent reads out; the child types it to link their phone. |
| Help lines | 000, Kids Helpline, Lifeline (Australia). |
| `[GH]` | The Get help button in the header of every child screen. |
| Needs you | The parent Home section for alerts and help requests. |
| Truthful line | The calm-screen sentence that tells the child what grown-ups have actually done (`calmLead()`). |
| Comfort settings | The child's accessibility profile (text size, colours, motion, voice…). |
