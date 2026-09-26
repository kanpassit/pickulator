# Pickulator

The AI-powered way your group decides where to eat. Someone starts a round, everyone taps in their top picks (mood, budget, dealbreakers) without seeing anyone else's answers, and Pickulator either finds a real, currently-open restaurant that fits everyone or falls back to a fair ranked-vote tally.

Live at **[pickulator.com](https://pickulator.com)**. Repo: `kanpassit/pickulator`. Deployed on Vercel, database on Neon (Postgres).

This document is written for a developer — or a future Claude session — opening this codebase cold. It covers what the app does, how it's built, the data model, the identity/auth model (the trickiest part of this codebase), every API route, every screen, environment setup, and the deploy workflow.

## Table of contents

- [Tech stack](#tech-stack)
- [How a round works, end to end](#how-a-round-works-end-to-end)
- [Identity model: guests, accounts, and links](#identity-model-guests-accounts-and-links)
- [Auth: sessions without a session table](#auth-sessions-without-a-session-table)
- [Data model](#data-model)
- [The AI pick](#the-ai-pick)
- [Screens](#screens)
- [API routes](#api-routes)
- [Cross-cutting infrastructure](#cross-cutting-infrastructure)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Deploy workflow](#deploy-workflow)
- [Known gaps / not yet built](#known-gaps--not-yet-built)
- [Project history](#project-history)

## Tech stack

- **Next.js 16** (App Router, Turbopack build), **React 19**, TypeScript.
- **Prisma 6** ORM over **Postgres**, hosted on **Neon** (one pooled connection string for the app, one direct/unpooled connection string for migrations — both required, see [Environment variables](#environment-variables)).
- **No session store, no Redis, no queue.** Auth is a signed cookie (see [Auth](#auth-sessions-without-a-session-table)); rate limiting is a Postgres table (see [Cross-cutting infrastructure](#cross-cutting-infrastructure)).
- **Resend** for transactional email (password reset), called directly via its REST API — no `resend` npm package is installed (see note in [Local development](#local-development) about why).
- **Anthropic API** (Claude) for the AI restaurant pick, with the `web_search_20250305` server tool so picks are grounded in a real, current search rather than invented.
- **Google Analytics 4**, hand-rolled with `next/script` (no `@next/third-parties` package — same reason as Resend).
- Hosted on **Vercel**, production domain `pickulator.com` (aliases also cover `www.pickulator.com` and `pickulator.vercel.app`).

## How a round works, end to end

1. A signed-in user picks a group (or creates one) and starts a round: occasion type (brunch/lunch/dinner/coffee/drinks/late), day, optional time, optional location + max travel distance. → `POST /api/occasions`.
2. Every member of the group answers privately: top 3 cuisine/restaurant-type picks (ranked), an optional vibe, an optional budget, and any dealbreakers to rule out. Nobody can see anyone else's answer while the round is open. → `POST /api/occasions/[id]/answers`.
3. A "waiting" screen shows who's answered (not what they answered), polling every 4 seconds.
4. The host closes the round any time — either after everyone's answered, or early with "decide with what we have". → `POST /api/occasions/[id]/close`.
5. Closing triggers the pick: if a location was set, Pickulator asks Claude (with web search) for a real, currently-open restaurant that satisfies the group's combined preferences and dietary needs; if that's unavailable/fails/not configured, or no location was set, it falls back to a deterministic weighted tally of everyone's ranked picks (1st choice = 3 points, 2nd = 2, 3rd = 1). See [The AI pick](#the-ai-pick).
6. Everyone sees the result, with the reasoning behind it and (for AI picks) a link to the source.
7. Afterward, anyone can leave a one-tap check-in ("we went here" / "somewhere else" / "we didn't go", plus a rating) — this feeds `avoidRepeats` on future rounds and the account's dining history.

A group can also be joined by people who never sign up at all — see the next section.

## Identity model: guests, accounts, and links

This is the part of the codebase most worth understanding before changing anything. There are two ways to be "someone" in a group:

- **A registered user** — a real `User` row, with an email/password, that can log in from any device.
- **A guest** — just a `GroupMember` row with `userId: null`. No account, no password, nothing to log into. A guest is recognized purely by a long-lived (1-year) httpOnly cookie scoped to that one group: `pk_g_<groupId>` (`src/lib/identity.ts`, `setGuestCookie`). A guest has **no identity that spans groups** — the same person in two different groups they were never linked to shows up as two unrelated `GroupMember` rows.

This is deliberate: whoever *starts* a group needs an account, but everyone else can vote via a link with zero signup friction. Every piece of round activity (answers, feedback, custom cuisine options) hangs off `GroupMember.id`, never `User.id` directly — so a guest who votes today and signs up later can, in principle, carry that history forward by having their `GroupMember.userId` set, without losing anything.

**Two invite link shapes**, both served by `src/app/j/[token]/page.tsx` → `GET /api/join/[token]`:

- **Group link** (`token === Group.id`) — the normal, current shape. One link per group. Landing on it shows a "which one are you" picker of existing (unclaimed) member slots, or lets you add yourself as a new one.
- **Personal link** (`token === GroupMember.linkToken`, a 9-byte random token) — a legacy per-person shape, still supported. Identity is already known from the token, no picker needed.

**Resolving "who is making this request"** (`resolveMemberId()` in `src/lib/identity.ts`) tries, in order:
1. An explicit `linkToken` in the request body (a personal link, or a group link + chosen member).
2. If signed in: the caller's own membership in that group (looked up by `userId`).
3. The guest cookie for that group, if one exists.

Note step 2 happens *before* step 3 — a signed-in user's guest cookie for a group they're also a real member of is never consulted; their account identity always wins.

**Claiming a spot while signed in.** `POST /api/join/[token]/claim` is where a person actually claims a member slot on a group link. If the caller is signed in and the slot they're claiming has no `userId` yet, the claim links that `GroupMember` to their account (`userId` gets set) instead of falling back to an anonymous guest cookie — this makes the group immediately show up on their own "Your Groups" home screen. Skipped only if they're already a member of that group some other way. This is a relatively recent fix — see [Project history](#project-history) — a signed-in user claiming a spot used to always be treated as a disconnected anonymous guest.

**Host-initiated linking is separate and opt-in.** A host can send a "link this guest to their real account" request from the invite screen (`POST /api/groups/[id]/members/[memberId]/link-request`) — this is *not* automatic; it creates a `pendingLink*` state on the `GroupMember` row that the target user must explicitly accept (`GET/POST /api/pending-links`, `/api/pending-links/[memberId]/accept|decline`) before the link takes effect. This is the mechanism for "I know this guest's account, let's connect them" without impersonating anyone.

**Friendship is a separate, User-to-User-only graph** (`Friendship` model — see [Data model](#data-model)) independent of any group. Guests have no `User` row and so can't be "friended" directly; `pendingLink*` is the guest-side equivalent.

## Auth: sessions without a session table

`src/lib/session.ts` + `src/lib/auth.ts`.

There is no server-side session table. A session is an HMAC-SHA256-signed, base64url-encoded token stored in an httpOnly cookie (`pk_session`, 90-day max age), carrying `{ uid, tv, exp }` — user id, token version, expiry. `getCurrentUser()` verifies the signature, checks `exp`, then checks that the token's `tv` matches the user's current `User.tokenVersion` in the database (a missing `tv` in an old pre-`tokenVersion` token is treated as `0`, for backward compatibility).

**Signing out everywhere** (used by password reset) is just `tokenVersion += 1` — every previously-issued token, on every device, instantly stops validating, with no rows to delete anywhere.

Signup and login both set the cookie directly; there's no email verification step.

## Data model

Full schema: `prisma/schema.prisma` (the source file has extensive doc comments on every model explaining *why*, worth reading directly for anything not covered here).

- **User** — email + password hash, name, `tokenVersion` (see above), dietary restrictions (array) + free-text notes, preferred travel mode. These preferences apply automatically to every round the user is in.
- **Group** — a name and a host (`hostUserId`). The host is the only account required to exist before anything else can happen.
- **GroupMember** — the identity row described above: nullable `userId` (null = guest), `displayName`/`initial`/`tintColor` (guests get a generated identity), role (HOST/MEMBER), `linkToken` (personal invite link) + `linkCreatedAt`/`linkOpenedAt`, and the `pendingLink*` fields for host-initiated account linking.
- **Occasion** — one round: type, day, optional time slot, optional location + max distance, `avoidRepeats`, status (OPEN/CLOSED), close mode (all-answered / time-based / manual), who created it.
- **Answer** — one member's hidden answer to one occasion: ranked picks (array), vibe, budget, dealbreakers (array), location mode. Unique per `(occasionId, memberId)`.
- **CustomOption** — a cuisine/restaurant-type option a group added themselves, permanent for that group going forward.
- **Result** — the computed outcome of a closed occasion: chosen name, a `chosenMeta` JSON blob (shape differs for an AI pick vs. a heuristic pick — see [The AI pick](#the-ai-pick)), `alsoConsidered` JSON, and optional veto fields.
- **Feedback** — the post-visit one-tap check-in: choice (went/elsewhere/didn't go), rating, notes. Unique per `(occasionId, memberId)`.
- **Notification** — a generic bell-icon inbox. Deliberately uses plain string ids (`actorUserId`, `groupId`, `relatedId`) rather than foreign keys, so new notification kinds never need a migration.
- **Friendship** — directional (`requesterId` → `addresseeId`), PENDING/ACCEPTED, unique per pair. A request into someone who already has one pending toward you auto-resolves to ACCEPTED instead of leaving two rows.
- **ResetToken** — single-use password-reset token (32 random bytes — higher entropy than a `GroupMember.linkToken`'s 9 bytes, since this one grants account takeover if leaked).
- **RateLimitHit** — the whole rate-limiting mechanism: `(bucket, key, windowStart)` unique triple with a `count`. See [Cross-cutting infrastructure](#cross-cutting-infrastructure).

## The AI pick

`src/lib/aiPick.ts`, `getAiRestaurantPick()`.

When a round closes with a location set, Pickulator calls the Anthropic API (model from `ANTHROPIC_MODEL`, defaulting to `claude-sonnet-5`) with the `web_search_20250305` tool plus a custom `propose_pick` tool, feeding it every member's ranked picks, vibe, budget, dealbreakers, and dietary restrictions. The model must ground its answer in an actual web search — **it never invents a restaurant**; if it can't find a real, verified, currently-relevant match, `getAiRestaurantPick()` returns `null` and the caller falls back to the same deterministic heuristic used when there's no location at all.

**The heuristic fallback** is a straightforward weighted tally: each member's 1st choice = 3 points, 2nd = 2, 3rd = 1, summed across the group, highest total wins (ties broken by how many people included it at all — "breadth"). This is also what runs directly whenever no location is set, or the AI call errors, or the daily AI quota (10 AI picks per host per UTC day, enforced through the same `RateLimitHit` table) is exceeded — closing a round never hard-fails because of the AI path.

The two outcomes carry different metadata (`Result.chosenMeta`): an AI pick includes address, price range, cuisine, a source URL, and (if available) a rating/review count; a heuristic pick includes the vote breadth and first-place count instead. `src/app/result/page.tsx` renders both shapes.

## Screens

All routes are plain Next.js App Router pages under `src/app/`. Most of the multi-step "start a round" flow threads state through query params rather than a client store, so any step can be linked to directly (including from a personal invite link, via `?token=`).

- **`/` (home)** — signed-in landing: your groups, any open rounds needing your answer, recent picks, pending account-link requests to accept/decline, and (if you arrived only as a guest somewhere) your guest-only groups.
- **`/login`, `/signup`** — standard email/password forms.
- **`/forgot-password`** — request a reset link; always shows the same generic "if an account exists…" confirmation regardless of whether the email matched anyone.
- **`/reset-password?token=`** — validates the token before showing the form; saving signs the user out everywhere else and back in on this device.
- **`/account`** — display name, dietary needs (checkboxes + free-text notes) and preferred travel mode, applied automatically to every future round; log out.
- **`/groups`** — list/create/delete groups you host or belong to.
- **`/invite?groupId=`** — the host's screen for a group: the shareable group link, adding people by name or email, resetting an individual's personal link, and sending/cancelling host-initiated account-link requests.
- **`/friends`** — add a friend by email, accept/decline/cancel requests, and (for a guest who shares a group with you and whom you host) send them an account-link request from here too.
- **`/start`** — "which group is this round for" picker (skipped automatically if you only have one group).
- **`/occasion?groupId=`** — configure a new round: type, day, time, location, distance, avoid-repeats.
- **`/question?occasionId=&token=`** — pick your top 3 cuisine/restaurant options (built-ins from `src/lib/cuisineOptions.ts` plus any group `CustomOption`s; you can add and, if you added it, delete a custom option here).
- **`/vibe?...`**, **`/budget?...`**, **`/dealbreakers?...`** — the rest of the answer flow; all optional, all carry the accumulated query-string state forward (`QuestionProgress` component shows step X of 4 with a back link).
- **`/waiting?occasionId=&token=`** — polls every 4s for who's answered; the host sees a "decide with what we have" button.
- **`/result?occasionId=&token=`** — the pick, the reasoning, "also considered" runners-up, and a link into feedback.
- **`/feedback?occasionId=&token=`** — the post-visit one-tap check-in.
- **`/j/[token]`** — the invite-link landing page (`JoinPageClient.tsx`). Handles both link shapes, shows a member picker for a group link, and (this session's fix) shows an explicit "you're in" confirmation instead of a silent redirect home when there's no round currently open to answer.

Shared components: `src/components/BottomNav.tsx` (the four-tab nav: Home/Groups/Friends/Account), `src/components/NotificationBell.tsx` (the notification inbox dropdown), `src/app/_components/QuestionProgress.tsx` (the step header used across the answer flow), `src/app/_components/GoogleAnalyticsPageView.tsx` (fires a GA pageview on every client-side route change, since `gtag.js` only sees the first full load automatically).

## API routes

All under `src/app/api/`. Every route that reads/writes an occasion, answer, or member accepts either an authenticated session or a `linkToken`/guest cookie, resolved via `resolveMemberId()` (see [Identity model](#identity-model-guests-accounts-and-links)) — there is no route that trusts a bare id in the URL without checking it belongs to the caller.

**Auth** — `src/app/api/auth/`
- `POST /signup`, `POST /login`, `POST /logout`
- `GET /me`, `PATCH /me` — current user profile; PATCH updates name/dietary/travel mode.
- `POST /forgot-password`, `GET /forgot-password?token=` (validity check), `POST /reset-password`

**Groups** — `src/app/api/groups/`
- `GET /` (only groups you host or belong to), `POST /` (create, you become host + first member)
- `GET /[id]`, `DELETE /[id]`
- `POST /[id]/members` (host adds a person by name or email)
- `POST /[id]/members/[memberId]/reset-link` (host invalidates and regenerates that member's personal link)
- `POST /[id]/members/[memberId]/link-request`, `DELETE /[id]/members/[memberId]/link-request` (host-initiated account linking, opt-in on the target's side — see [Identity model](#identity-model-guests-accounts-and-links))
- `GET /guest-groups` — groups you're only in as a guest (no account link), for the home screen's separate guest section.

**Joining** — `src/app/api/join/[token]/`
- `GET /` — resolves either link shape, marks `linkOpenedAt` on first open (a real person opened it — deliberately **not** touched by the share-card metadata lookup in `src/app/j/[token]/page.tsx`, so a link-preview crawler doesn't falsely mark a link "opened").
- `POST /claim` — claims a member slot; links to the caller's account if signed in and the slot is unclaimed (see [Identity model](#identity-model-guests-accounts-and-links)); sets a guest cookie otherwise.

**Occasions** — `src/app/api/occasions/`
- `GET /`, `POST /` (create a round)
- `GET /[id]` (access-checked via `resolveMemberId()`), `DELETE /[id]`
- `POST /[id]/answers` (submit your hidden answer)
- `POST /[id]/close` (host closes the round, triggers the pick)
- `GET/POST /[id]/custom-options`, `DELETE /custom-options/[id]` (a member can delete a custom option only if they're the one who added it)
- `POST /[id]/feedback`

**Friends** — `src/app/api/friends/`
- `GET /`, `POST /` (request by email, auto-accepts if the reverse request already existed)
- `POST /[id]/accept`, `POST /[id]/decline`, `DELETE /[id]` (cancel an outgoing request / remove a friend)

**Pending account links** — `src/app/api/pending-links/`
- `GET /` — links awaiting *your* decision
- `POST /[memberId]/accept`, `POST /[memberId]/decline`

**Notifications** — `src/app/api/notifications/`
- `GET /`, `POST /[id]/read`, `POST /read-all`

## Cross-cutting infrastructure

- **Rate limiting** (`src/lib/rateLimit.ts`) — a single `RateLimitHit` Postgres table, fixed-size time-bucketed counters (not a true sliding window). `rateLimited(bucket, key, { max, windowMs })` fails open on any error (a DB hiccup never blocks a real request) and opportunistically prunes old rows on ~2% of calls rather than running a cron job. Applied to: login, signup, forgot-password, invite-link lookup/claim, and the AI-pick daily quota (10/host/UTC day).
- **Notifications** (`src/lib/notify.ts`) — `notifyBestEffort()` never throws and only ever notifies registered users (a guest has nothing to log into to see a notification); it also never notifies the actor about their own action.
- **Email** (`src/lib/mail.ts`) — a single `sendEmail()` calling the Resend REST API directly (`https://api.resend.com/emails`), no npm package. Distinguishes "not configured" (no `RESEND_API_KEY` — logs that a send was skipped, but deliberately **never** logs the actual reset URL/token) from "send failed" (Resend rejected/errored). Currently used only for password-reset emails, sent from `no-reply@pickulator.com`.
- **Tokens** (`src/lib/tokens.ts`) — `generateLinkToken()` (9 random bytes, for `GroupMember.linkToken`), `generateResetToken()` (32 random bytes, for `ResetToken` — much higher entropy since it grants account takeover if leaked), plus the tint/initial generator for guest avatars (`TINTS`, a 6-color rotation).
- **Analytics** — GA4 property "Pickulator Web" (`G-4FD4X607Z7`, under the KatchingStacks Analytics account; kept its measurement ID from when the app was named "KanPassIt", which doesn't change on a rename). Loaded via two `next/script` tags in `src/app/layout.tsx`; `GoogleAnalyticsPageView.tsx` fires a pageview on every client-side route change since `gtag.js` only sees the first full page load automatically.
- **Social link previews** — `generateMetadata` in `src/app/j/[token]/page.tsx` personalizes the Open Graph/Twitter card for an invite link (shows the actual group name, e.g. "The Regulars wants your vote"), falling back to the generic site card if the token doesn't resolve. Metadata for a given page segment doesn't deep-merge with the root layout's, so the image/card fields are repeated there rather than inherited.

## Environment variables

Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon Postgres connection string (used by the app at runtime). |
| `DATABASE_URL_UNPOOLED` | Direct/unpooled Neon connection string (used by Prisma for migrations/`db push`). |
| `SESSION_SECRET` | HMAC signing key for the `pk_session` cookie. Rotating it invalidates every existing session. |

Optional (the app degrades gracefully without them — see the relevant section above for the exact fallback):

| Variable | Purpose | Without it |
|---|---|---|
| `RESEND_API_KEY` | Sends password-reset emails via Resend. | `sendEmail()` logs a "not configured" notice (never the token) and returns; use `npm run password:reset -- <email> <new-password>` as an admin fallback. |
| `ANTHROPIC_API_KEY` | Powers the AI restaurant pick. | Every round close uses the deterministic heuristic tally instead. |
| `ANTHROPIC_MODEL` | Overrides the Claude model used for the AI pick. | Defaults to `claude-sonnet-5`. |

`NODE_ENV` is set automatically by Next.js/Vercel and never needs to be configured by hand.

The GA4 measurement id (`G-4FD4X607Z7`) is hardcoded in `src/app/layout.tsx`, not an env var — measurement ids are meant to be public since they're embedded client-side in every pageview.

## Local development

```bash
npm install
npm run dev
```

The build script (`npm run build`) runs `prisma db push --skip-generate && next build` — schema changes are pushed straight to the connected Postgres database rather than using Prisma's migration files, so there is no `prisma/migrations` directory to keep in sync.

**A note on adding dependencies from a Windows-mounted network drive**: if your working copy lives on a network-mounted drive (as this repo's canonical dev machine does, via a Windows share), `npm install <package>` can fail in two ways worth knowing about: `ENOSPC` if the npm cache partition is full (point `--cache` elsewhere), and `EACCES: ... rename ...` on packages that use `node_modules/.package-name-<hash>` atomic-rename installs (a known quirk of npm's install strategy over certain network filesystems, not a project-specific bug). If you hit this, either run `npm install` from a genuinely local disk, or avoid adding the dependency and hand-roll the functionality with already-installed packages and platform built-ins — this is why GA4 and Resend are both integrated via raw `next/script`/`fetch` rather than their official npm packages in this codebase.

## Deploy workflow

Production is Vercel, tracking the `main` branch, with `pickulator.com` as the primary alias. The established workflow for shipping a change:

1. Branch off `main`: `git checkout -b claude/<feature-name>`.
2. Make the change, commit, push the branch.
3. Vercel builds a preview deployment for the branch automatically — verify it (curl, or click through it) before merging anything.
4. Merge to `main` with `--no-ff` and push — this triggers the production deployment.
5. Verify production directly (pickulator.com), then delete the branch (local and remote).

There is no CI test suite; verification is manual (preview build succeeding + a real click-through) plus a clean `next build`/`tsc` compile, which is where most schema or type errors surface.

## Known gaps / not yet built

Carried forward from project history (see below) plus this doc's own review — kept here so gaps stay visible rather than discovered by surprise:

- The public group-invite link uses `Group.id` (a Prisma cuid) as the join token, rather than a dedicated random one — a conscious tradeoff, with the invite endpoint's rate limiting as the compensating control.
- No email verification on signup.
- No "resend the email" cooldown UI on forgot-password beyond the blanket per-IP rate limit.
- No pending-request count badge on the Friends tab in `BottomNav` — the badge logic doesn't exist yet for any tab.
- No friend picker inside the group-invite flow — inviting someone by email doesn't check your friends list first.
- No trip/date-range sub-scoping of a group (a single group is always just "the group"; explored as a future direction, not built).
- No tiers or billing — the AI-pick daily quota is the only cost control.
- A guest with zero group memberships has no path to being "claimed" into a real account the way a guest who's actually in a group does (host-initiated `pendingLink*`) — this only matters if/when Pickulator grows a contacts-without-groups concept.

## Project history

Durable narrative decisions and shipped-feature write-ups live in this app's claude.ai Project ("AI Dinner Decider"), not in this repo — they capture *why*, design tradeoffs considered, and what was explicitly deferred, in more depth than a commit message. Notable ones as of this writing:

- `app-name-decision.md` — how the app ended up named Pickulator (domain/trademark search history).
- `kalqsplit-feature-review.md` — a review of a sibling app's (KalQSplit) group/identity architecture for patterns worth borrowing; several of its high-priority recommendations (guest/account identity model, host-initiated linking, generic notification table) were already independently built here by the time this review happened.
- `pickulator-security-and-friends-shipped.md` — an IDOR fix on the occasion-detail endpoint, rate limiting, the AI daily quota, and the standalone friend graph.
- `pickulator-forgot-password-shipped.md` — the forgot/reset-password flow, the `tokenVersion` sign-out-everywhere mechanism, and Resend email setup.
- `pickulator-branding-shipped.md` — visual branding pass, including per-invite-link social share cards.
- `pickulator-google-analytics-shipped.md` — GA4 setup, including the SPA-navigation pageview workaround.
- `pickulator-join-confirmation-fix.md` — fixed a silent redirect-to-home with no confirmation when claiming a spot in a group with no round currently open.
- `pickulator-signed-in-join-linking.md` — fixed signed-in users claiming an invite-link spot always being treated as disconnected guests, invisible from their own home screen.
