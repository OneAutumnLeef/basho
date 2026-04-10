# Basho Implementation Plan (Live Tracker)

## USP
Basho turns a travel vibe into a feasible, time-aware outing plan in under a minute, then auto-fixes weak stops with better nearby alternatives.

## Target Outcome
- Differentiate on planning intelligence, not map rendering.
- Keep the map-first feel, but make the plan engine the moat.
- Deliver this flow: choose vibe -> add stops -> see schedule quality -> one-tap fixes -> share.

## Progress Snapshot (Updated: 2026-04-09)
- Phase 0 status: DONE
- Phase 1 status: DONE
- Phase 2 status: DONE
- Phase 3 status: IN PROGRESS
- Phase 4 status: IN PROGRESS
- Phase 5 status: IN PROGRESS
- Phase 6 status: IN PROGRESS

## Completed Work Log

### 2026-04-09 - Sprint 1 (Phase 0 + Phase 1)

#### Phase 0: Product Contract and Copy - DONE
- Finalized USP messaging.
- Updated copy in:
	- src/components/LandingPage.tsx
	- src/components/PlacesSidebar.tsx
	- README.md
- Added the explicit promise in copy: under 60 seconds.

Definition of done check:
- [x] USP appears in landing, sidebar, and README hero.
- [x] Messaging is consistent across app and repo docs.

#### Phase 1: Time-Aware Planner Core - DONE
- Extended planner types in src/types/places.ts:
	- dwell minutes per stop
	- planner settings (city, vibe, start time, pace)
	- warning codes
	- score breakdown
	- shared route/leg models
- Added planner engine in src/lib/planner.ts:
	- schedule building
	- warning generation
	- score computation (feasibility, pacing, efficiency, variety, overall)
- Upgraded route hook in src/hooks/useRoute.ts:
	- fixed-order and optimized-order modes
	- leg-level distance/duration metadata
	- waypoint order output
- Wired planner state and orchestration in src/pages/Index.tsx:
	- planner settings state
	- route mode state
	- derive schedule from bucket + route
	- apply optimized order to bucket
- Upgraded Trip Bucket UI in src/components/TripBucket.tsx:
	- per-stop duration control
	- arrival/departure chips
	- warning badges
	- plan quality panel
	- route mode toggle

Definition of done check:
- [x] Reorder and duration changes recompute plan in real time.
- [x] User sees plan score and warning categories.

#### Validation Completed
- [x] Unit tests passed (including new planner tests in src/test/planner.test.ts).
- [x] Production build passed.
- [x] Targeted lint on touched files passed.

### 2026-04-09 - Sprint 2 (Phase 2 + Phase 3 Part 1)

#### Phase 2: Contextual Discovery and Vibe Layer - DONE
- Upgraded discovery context model in src/types/places.ts with time window support.
- Updated discovery hooks:
	- src/hooks/useTrendingPlaces.ts now consumes city, vibe, and time window.
	- src/hooks/usePlaceSearch.ts now consumes context-aware query composition.
	- both hooks now cache by contextual query keys.
- Added discovery controls in src/components/PlacesSidebar.tsx:
	- city input
	- vibe selector
	- time-window selector
- Wired context through src/pages/Index.tsx so changing controls refreshes recommendations/search scope.

Definition of done check:
- [x] Different vibes produce different recommendation queries and category biasing.
- [x] Context changes trigger fresh cached result sets via context-aware query keys.

#### Phase 3: Auto-Fix Engine - IN PROGRESS
- Added auto-fix suggestion model in src/types/places.ts.
- Implemented heuristic replacement engine in src/lib/planner.ts:
	- detects problematic stops via warning codes
	- ranks alternative places using route proximity, vibe/category fit, and rating
	- returns reason text, confidence, and estimated score delta
- Wired suggestion generation and apply-replacement flow in src/pages/Index.tsx.
- Added one-tap replacement UI in src/components/TripBucket.tsx.
- Extended tests in src/test/planner.test.ts to cover auto-fix generation.

Definition of done check:
- [x] User can replace weak stops without manually searching.
- [ ] Verify score improvement consistency with broader integration/E2E coverage.

#### Validation Completed
- [x] Unit tests passed after Sprint 2 changes.
- [x] Production build passed after Sprint 2 changes.

### 2026-04-09 - Sprint 3 (Phase 4 + Phase 5 Part 1 + UI Fixes)

#### Critical UI Fixes - DONE
- Fixed left sidebar scroll behavior in src/components/PlacesSidebar.tsx by correcting flex overflow constraints.
- Fixed right trip sidebar clipping/hiding issues in src/components/TripBucket.tsx by adding proper min-height and scroll constraints.
- Fixed hidden remove controls for trip stops in src/components/TripBucket.tsx by making remove action always visible.

Definition of done check:
- [x] Left sidebar is scrollable.
- [x] Trip sidebar list remains scrollable with many stops.
- [x] Remove action is visibly accessible.

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Added new Sprint 3 migration in supabase/migrations/02_trip_collab_and_share.sql:
	- trips
	- trip_items with snapshot fields
	- trip_votes
	- trip_suggestion_audit
	- RLS policies and update trigger
- Added persistence hook in src/hooks/useTripPersistence.ts:
	- save trip (cloud with local fallback)
	- load trip (cloud with local fallback)
	- trip library query for saved plans
- Added trip models in src/types/trips.ts.
- Wired trip save/load controls into src/components/TripBucket.tsx and src/pages/Index.tsx.

Definition of done check:
- [x] Saved trip restores full schedule metadata in app flow.
- [ ] Group voting UX and aggregation still pending.

#### Phase 5: Shareable Plan Card - IN PROGRESS
- Added share payload and encoding utilities in src/lib/trip-share.ts.
- Added share dialog UI in src/components/TripShareDialog.tsx with:
	- itinerary card view
	- score/vibe metadata
	- map preview image
	- copy-link action
- Wired share flow in src/pages/Index.tsx:
	- generate share link from current plan
	- decode shared plan from URL token
	- import shared itinerary into current workspace state

Definition of done check:
- [x] Canonical share output generation works.
- [x] Shared viewer can understand itinerary in read-only card and import plan.

#### Validation Completed
- [x] Unit tests passed after Sprint 3 batch.
- [x] Production build passed after Sprint 3 batch.
- [x] Targeted lint on modified files passed.

### 2026-04-09 - Sprint 3 (Phase 3 Hardening + Phase 4 Part 2)

#### Phase 3: Auto-Fix Engine Hardening - IN PROGRESS
- Added additional edge-case coverage in src/test/planner.test.ts:
	- no-warning scenario returns no suggestions
	- deduped-empty candidate pool returns no suggestions
- Added share utility tests in src/test/trip-share.test.ts to stabilize encode/decode behavior.

Definition of done check:
- [x] Replacement feature remains stable under edge conditions.
- [ ] Score-improvement behavior still needs integration/E2E measurement in live UI loop.

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Added collaboration vote hook in src/hooks/useTripVotes.ts with:
	- cloud votes for persisted/shared trips
	- local vote fallback for local trips
	- toggle vote behavior and aggregated summaries
- Wired voting controls/score in src/components/TripBucket.tsx (per stop upvote/downvote + aggregate score).
- Wired voting flow in src/pages/Index.tsx using active trip context.
- Added suggestion-audit write path in src/hooks/useTripPersistence.ts.
- Wired accepted replacement audit logging in src/pages/Index.tsx.

Definition of done check:
- [x] Group vote UI and aggregation are available in-app.
- [ ] End-to-end permission behavior and shared multi-user verification still pending.

#### Validation Completed
- [x] Unit tests passed after this sprint increment.
- [x] Production build passed after this sprint increment.
- [x] Targeted lint on modified files passed.

### 2026-04-09 - Sprint 3 UI Polish (Share + Trip Details)

#### Share Dialog UI Fixes - DONE
- Replaced fragile external map preview image with deterministic in-app SVG route preview in src/components/TripShareDialog.tsx.
- Improved share dialog resilience and readability with scroll-safe modal body.
- Removed name/address truncation in itinerary cards so shared stop details are fully readable.

#### Trip Sidebar Detail Readability - DONE
- Updated stop card text rendering in src/components/TripBucket.tsx to support multiline place names and addresses.
- Removed forced truncation to keep full place details visible in right sidebar cards.

#### Validation Completed
- [x] Unit tests passed after UI polish changes.
- [x] Production build passed after UI polish changes.
- [x] Targeted lint on changed UI files passed.

### 2026-04-09 - Sprint 3 Collaboration Increment (Permissions + Insights)

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Added vote-permission state handling in src/hooks/useTripVotes.ts.
- Added clear vote-disabled messaging for unauthenticated/shared contexts.
- Added per-trip collaboration insights panel in src/components/TripBucket.tsx:
	- top voted stop
	- lowest scored stop
	- total vote volume
- Wired vote insight computation and guarded vote interactions in src/pages/Index.tsx.

Definition of done check:
- [x] Vote UX is available with permission-aware behavior and messaging.
- [ ] Multi-user permission behavior still needs explicit shared-account QA verification.

#### Validation Completed
- [x] Unit tests passed after collaboration increment.
- [x] Production build passed after collaboration increment.
- [x] Targeted lint on modified collaboration files passed.

### 2026-04-09 - External Verification Input Review

#### Checklist Evidence Confirmed
- Environment variables are present in env.local.
- Supabase tables exist:
	- trips
	- trip_items
	- trip_votes
	- trip_suggestion_audit
- RLS policies for trip collaboration tables are present.
- Quota headroom reported:
	- Places API ~50% remaining
	- Maps JS API ~100% remaining
- Signed-in cloud persistence is now verified from external run:
	- trips rows are created and updated
	- trip_items rows are persisted for multi-stop plans
	- is_shared updates are reflected in DB query results
- Share link generation is verified for saved plans.

#### Current Verification Blockers
- Multi-account vote-permission QA remains pending and is intentionally deferred until hosted deployment testing.

#### New Runtime Issues Observed from External Logs
- Google PlacesService is legacy/deprecation-track for new customers.
- google.maps.Marker is deprecated in favor of AdvancedMarkerElement.
- Landing video source returned 404 in one run.
- "Share Ready" badge in the share dialog can be misread as disabled state and should be clarified in follow-up UX polish.

#### Action Follow-up Added
- [x] Add explicit in-app sign-in call-to-action near save/collab controls.
- [x] Add clear auth controls; save destination label was later hidden by product UX preference.
- Add migration task for PlacesService/Marker deprecations to modern API path.
- [x] Add resilient landing media fallback when remote video fails.
- Defer owner/collaborator/anonymous vote-permission QA matrix to hosted environment test pass.

### 2026-04-09 - Sprint 4 Local Hardening (Auth + Share Clarity + Planner Quality)

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Added explicit account controls in trip panel:
	- Sign in / Sign out CTA near save and collaboration controls
	- Account identity display for active session

#### Phase 5: Shareable Plan Card - IN PROGRESS
- Clarified share modal status badge from ambiguous "Share Ready" to clear "Link Ready" visual state.

### 2026-04-09 - Sprint 5 UX Alignment (Notes + Dedupe + Guidance)

#### Saved Places Quality - DONE
- Fixed duplicate save behavior by reusing canonical place rows when available.
- Added defensive dedupe in saved-places retrieval for legacy duplicate location records.

#### Place Notes - DONE
- Made "Leave a Note" functional in place detail modal:
	- inline note editor
	- save and cancel actions
	- note persistence via saved-place record

#### Share UX Simplification - DONE
- Removed PDF/PNG export actions from share modal.
- Removed passive "Link Ready" status pill.
- Kept focused actions:
	- copy link
	- close
	- import (shared-link mode)
- Updated link generation to use canonical app base URL so hosted links are stable in production.

#### Trip Help Onboarding - DONE
- Added new "?" help trigger under the trip button.
- Added a styled in-app guide dialog with clear, beginner-friendly usage steps.
- Added a 20-second quick-start animation with step-by-step highlight and replay.

#### Validation Completed
- [x] Unit tests passed (11 tests).
- [x] Production build passed.
- [x] Targeted lint passed on modified files.

### 2026-04-09 - Sprint 6 Responsive Layout Pass (Mobile + Tablet + Desktop)

#### App Shell Responsiveness - DONE
- Added mobile-aware layout orchestration in main page:
	- dynamic sidebar visibility on mobile
	- dedicated mobile explorer toggle
	- coordinated sidebar/trip-bucket behavior to avoid overlap
- Switched main viewport container to dynamic viewport height handling for mobile browsers.

#### Panel And Modal Responsiveness - DONE
- Updated trip bucket panel to use responsive inset sizing and spacing scales.
- Updated place detail modal with viewport-safe width/height and scroll handling.
- Updated share and guide dialogs with viewport-safe modal widths/heights.

#### Touch UX Responsiveness - DONE
- Made place action buttons visible by default on small screens so touch users can always add/save places.

#### Validation Completed
- [x] Unit tests passed (11 tests).
- [x] Production build passed.
- [x] Targeted lint passed on modified responsive files.

#### Phase 3: Auto-Fix Engine Hardening - IN PROGRESS
- Added integration-style test coverage for score movement after applying top auto-fix and re-routing.

#### Landing Reliability Hardening - DONE
- Added resilient fallbacks for landing media when aerial or brush videos fail to load.

#### Validation Completed
- [x] Unit tests passed (11 tests).
- [x] Production build passed.

### 2026-04-09 - Sprint 6 Friends Pinning Enablement

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Added new migration in supabase/migrations/03_friends_pins.sql:
	- user_profiles mirror table synced from auth users
	- friendships table with request/accept/reject states
	- RLS policies for participant-safe access
	- triggers for profile sync and updated_at handling
- Added friends data hook in src/hooks/useFriends.ts:
	- accepted friends list
	- incoming/outgoing friend requests
	- friend-pinned places query via accepted connections
	- send/accept/decline friend request mutations
- Wired friends view in src/pages/Index.tsx:
	- friends tab now renders real friend pins (no placeholder)
	- friend request actions connected with user-facing toasts
- Enhanced src/components/PlacesSidebar.tsx with Friends network controls:
	- add friend by email
	- incoming request accept/decline actions
	- outgoing pending request list
	- friends-specific list counters and empty states

Definition of done check:
- [x] Friends tab can render accepted-friend saved places.
- [x] Friend request flow exists in UI (send, accept, decline).
- [ ] Hosted multi-account smoke test still needed to validate account-to-account behavior end to end.

#### Validation Completed
- [x] Production build passed after friends feature wiring.

### 2026-04-10 - Sprint 6 Places API Burn Reduction (Phase 0 + Phase 1)

#### Phase 6: Verification, Hardening, and Cost Controls - IN PROGRESS
- Added shared client-side Places traffic control layer in src/lib/places-traffic-control.ts:
	- daily request caps for search and trending (env-overridable)
	- endpoint cooldown guards to reduce burst traffic
	- in-flight dedupe to avoid duplicate concurrent requests
	- persistent cached result store with TTL and pruning
	- global kill switch support via VITE_DISABLE_LIVE_PLACES
- Hardened src/hooks/usePlaceSearch.ts:
	- raised min query threshold to 4 chars
	- normalized query keying and persistent cache reuse
	- graceful fallback to Photon when Google path is throttled/capped/unavailable
	- disabled focus/reconnect/mount auto-refetch for this high-burn path
- Hardened src/hooks/useTrendingPlaces.ts:
	- added optional enabled gate to avoid unnecessary fetches
	- added persistent cache + in-flight dedupe + cooldown + quota checks
	- graceful fallback path retained for continuity
- Updated src/pages/Index.tsx orchestration:
	- increased search debounce to reduce keystroke request frequency
	- added debounced discovery context so city typing does not spam context-bound queries
	- gated trending fetches to public browsing / planner-needed states
- Updated search UX copy in src/components/PlacesSidebar.tsx to reflect 4+ char behavior.

Definition of done check:
- [x] Live keystroke API burn is reduced through debounce, min-length, cooldown, and dedupe controls.
- [x] Trending fetches are gated and cached to avoid unnecessary repeated calls.
- [x] Shared server-side cache/proxy layer implemented for stronger multi-user dedupe and centralized rate limiting.

### 2026-04-10 - Sprint 6 Places API Burn Reduction (Phase 2)

#### Phase 6: Verification, Hardening, and Cost Controls - IN PROGRESS
- Added server-side quota/cache schema in supabase/migrations/04_places_proxy_cache.sql:
	- shared cache table for proxied Places responses
	- centralized per-day rate counters (client + global)
	- request log table for operational visibility
	- atomic counter RPC function (`bump_places_rate_limit`)
- Added Supabase Edge Function proxy in supabase/functions/places-proxy/index.ts:
	- proxy-first Places search/trending backed by Google Places API (server key)
	- shared cache with TTL + stale-cache fallback path
	- centralized per-client and global daily guardrails
	- request outcome logging for cache hits/rate-limit/upstream failures
- Added frontend proxy client helper in src/lib/places-proxy-client.ts.
- Rewired discovery hooks to proxy-first flow:
	- src/hooks/usePlaceSearch.ts now calls Edge Function before Photon fallback
	- src/hooks/useTrendingPlaces.ts now calls Edge Function before Photon fallback
	- existing client-side dedupe/cooldown/cache controls remain in place as a first-layer shield
- Updated README.md with deployment steps and secret/env guidance for proxy operation.

Definition of done check:
- [x] Search and trending requests route through a shared server-side cache/proxy path.
- [x] Centralized rate-limiting is enforced at the proxy layer.
- [x] Client retains graceful fallback behavior when proxy/upstream paths fail.

### 2026-04-10 - Sprint 6 Places API Burn Reduction (Phase 3)

#### Phase 6: Verification, Hardening, and Cost Controls - IN PROGRESS
- Hardened proxy media handling in supabase/functions/places-proxy/index.ts:
	- removed server key from generated Google media URLs
	- now returns photo references via `mediaLinks` for client-side URL resolution
- Hardened frontend proxy client in src/lib/places-proxy-client.ts:
	- sanitizes Google media URLs from proxy payloads
	- reconstructs media URLs using client-safe `VITE_GOOGLE_MAPS_API_KEY`
	- avoids rendering broken Google media URLs when no client key exists
- Updated README.md with explicit proxy secret-handling and Places API (New) requirements.

Definition of done check:
- [x] Server-side Places key is no longer exposed in proxy response image URLs.
- [x] Place cards and detail imagery continue to resolve via client-safe media URL construction.

### 2026-04-10 - Sprint 7 Collaboration Pulse Enhancement (Phase 4 Part 1)

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Enhanced vote analytics in src/hooks/useTripVotes.ts:
	- now pulls `created_at` for vote events
	- computes 24-hour activity trend (last vs previous window)
	- exposes activity metrics alongside vote summaries
- Added reusable vote insight utility in src/lib/vote-insights.ts:
	- computes top and lowest scored stops
	- computes most controversial stop (balanced up/down split)
	- suggests unvoted stops for collaborator prompts
- Enhanced collaboration panel in src/components/TripBucket.tsx:
	- added 24h trend tile (rising/cooling/steady)
	- added most controversial stop card
	- added "no votes yet" suggestion prompt
- Wired insight utility usage in src/pages/Index.tsx.
- Added test coverage in src/test/vote-insights.test.ts for trend and insight computation logic.

Definition of done check:
- [x] Collaboration pulse shows trend, controversial stop, and unvoted-stop prompts.
- [x] Vote activity and insight logic is unit-tested.

### 2026-04-10 - Sprint 7 Collaboration Guardrails (Phase 4 Part 2)

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Hardened cloud trip persistence in src/hooks/useTripPersistence.ts:
	- added optimistic concurrency guard using `updated_at` match on trip updates
	- introduced conflict error path when stale clients attempt overwrite
	- save responses now include `updatedAt` to maintain client-side save baseline
- Wired conflict-safe save handling in src/pages/Index.tsx:
	- tracks current trip `updatedAt` baseline
	- passes expected timestamp on save
	- shows explicit conflict toast on stale save attempts
- Hardened vote permission handling in src/hooks/useTripVotes.ts:
	- permission query now verifies trip accessibility, not just auth session
	- vote mutations now block with explicit error when trip access is missing
	- surfaced clearer disabled reason for inaccessible trips
- Added hosted verification checklist in docs/collaboration-qa-matrix.md:
	- multi-user vote permission scenarios (owner/collaborator/outsider/anonymous/local)
	- concurrent-save conflict scenarios and expected outcomes

Definition of done check:
- [x] Concurrent stale cloud saves are detected and blocked before overwrite.
- [x] Vote permission UX and mutation path both enforce trip accessibility checks.
- [ ] Hosted multi-account QA execution still pending.

### 2026-04-10 - Sprint 7 Restore Points (Phase 4 Part 3)

#### Phase 4: Persistence and Collaboration - IN PROGRESS
- Added trip version migration in supabase/migrations/05_trip_versions.sql:
	- `trip_versions` table with snapshot JSON payloads
	- RLS policies for owner writes and shared/owner reads
- Extended src/hooks/useTripPersistence.ts:
	- records restore-point snapshots on every successful save (cloud + local)
	- exposes version history query for active trip
	- adds restore mutation for selected version snapshots
- Extended src/types/trips.ts with restore-point contracts.
- Wired restore controls in UI:
	- src/components/TripBucket.tsx now includes restore-point selector + restore action
	- src/pages/Index.tsx now tracks selected restore point and applies restored snapshots to planner state

Definition of done check:
- [x] Save operations produce restorable snapshots for local and cloud trip flows.
- [x] Users can restore a selected snapshot from Trip Bucket UI.
- [ ] Hosted restore workflow QA still pending.

## Active Plan (Upcoming)

### Phase 3: Auto-Fix Engine
- Add UI E2E coverage for replacement acceptance and score movement in live flow.
- Tune ranking thresholds using real user runs and route variance cases.
- Add fallback candidate sourcing when current context has sparse options.
- Add telemetry hooks for replacement accepted/rejected and score deltas.

Definition of done:
- [x] User can resolve warnings without manual re-search.
- [ ] Plan score improves after accepted replacement in most cases.
- [ ] Replacement confidence correlates with score delta in observed sessions.

### Phase 4: Persistence and Collaboration
- Complete shared multi-user permission verification for voting after hosted deployment.
- Add version history and restore points for saved trips: DONE (snapshot history + restore control).
- Vote insights panel enhancements: DONE
	- most controversial stop
	- vote trend over time
	- no-vote suggestions for collaborators
- Add conflict handling for concurrent edits from multiple users: DONE (optimistic concurrency + stale-save guard).

Definition of done:
- [x] Saved trip restores with full schedule metadata.
- [x] Vote insights panel exists in trip sidebar.
- [x] Auth CTA is visible in trip UI.
- [x] Concurrent editing stale-save conflicts are blocked in cloud save path.
- [x] Version history restore points available in trip sidebar workflow.
- [ ] Group voting respects permissions and works end to end.
- [ ] Hosted QA confirms permission matrix and conflict scenarios across multiple accounts.

### Phase 5: Shareable Plan Card
- Add optional read-only shared route rendering mode outside editor state.
- Add copy-safe short-link support if URL length becomes too long.
- Add visual fallback when preview map cannot render.

Definition of done:
- [x] Canonical share output works.
- [x] Shared viewer can understand itinerary without edit mode.
- [x] Share dialog is streamlined to copy-link/import workflow.

### Phase 6: Verification, Release Hardening, and Launch Readiness
- Run full regression matrix:
	- discovery
	- route generation
	- auto-fix
	- voting
	- save/load
	- share/import
- Add minimum E2E suite in CI for critical happy paths:
	- create trip -> optimize -> save -> reload
	- apply replacement -> verify score movement
	- vote flow with permission gates
	- share link -> read-only open -> import
- Validate performance and reliability thresholds:
	- first load and route recompute responsiveness
	- large trip bucket behavior
	- API fallback behavior (Google/Supabase interruptions)
- Final deployment hardening:
	- environment variable audit
	- Supabase migration/apply verification
	- auth redirect and share-link routing sanity checks

Definition of done:
- [ ] Critical E2E flows pass in CI.
- [ ] No P0/P1 defects remain open.
- [ ] Multi-user collaboration behavior is verified and documented.
- [ ] Release checklist is signed off.

## Challenges and Issues Found
- Repository-wide lint debt exists outside the new planner changes (pre-existing).
- Bundle size warning appears during production build (large chunk warning).
- Some map/search hooks still rely on broad typing and should be tightened gradually.
- Auto-fix quality depends on currently available candidate pool (context-limited).
- Time-window behavior is query-guided but not yet backed by explicit opening-hours constraints.
- Dev startup may fail if port 3000 is already in use (environment-level conflict, not app compile issue).
- Vote permissions in true multi-user cloud scenarios are implemented but still need explicit QA verification.

## Challenge and Issue Resolution Plan
- Lint debt outside sprint scope:
	- Plan: targeted cleanup only on touched files during feature work, then dedicated lint sweep in hardening.
	- Exit criteria: repo lint error count reduced to agreed threshold.
- Large bundle warning:
	- Plan: code-splitting for share dialog and non-critical panels, evaluate manualChunks.
	- Exit criteria: main bundle warning removed or justified with documented tradeoff.
- Broad typing in map/search hooks:
	- Plan: introduce explicit API response types and parser guards.
	- Exit criteria: no implicit any in touched map/search modules.
- Auto-fix candidate quality limits:
	- Plan: enrich candidate pool with nearby/category-expanded queries and fallback tiers.
	- Exit criteria: measurable improvement in accepted suggestion quality.
- Time-window without opening-hours truth:
	- Plan: add availability-aware filtering when opening_hours data is present; show uncertainty badge when absent.
	- Exit criteria: user can distinguish hard availability vs heuristic recommendation.
- Port 3000 conflicts:
	- Plan: add documented alternate port startup command and dev script note.
	- Exit criteria: local start instructions include conflict-safe path.
- Multi-user vote verification gap:
	- Plan: run shared-account QA matrix with owner/member/anonymous permutations.
	- Exit criteria: permission matrix validated and stored in checklist.

## Postponed / Deferred Tasks
- Full repo lint cleanup (deferred; not required for planner sprint acceptance).
- Bundle splitting/performance optimization for large chunk warning (deferred to hardening sprint).
- Integration and E2E scenarios for contextual discovery + auto-fix flow (deferred to Sprint 2 hardening pass).
- Open-now and closing-time aware recommendation filtering (deferred to later Sprint 3 hardening or API expansion).
- Collaboration vote UX and permission hardening (deferred to remaining Sprint 3 work).
- Share export variants (image/pdf) and richer viewer mode (deferred to Sprint 3 hardening).
- Live multi-user vote QA pass (deferred until hosted environment multi-account test window).

## Deferred and Postponed Backlog Plan
- Keep deferred items in this order for execution:
	1) Multi-user vote QA
	2) Auto-fix E2E score verification
	3) Share export variants
	4) Bundle splitting
	5) Repo-wide lint sweep
- Promote a deferred item into active sprint only when:
	- blocker for release, or
	- high user-facing pain, or
	- dependency unblocked externally.
- Every deferred item must carry:
	- owner
	- trigger
	- target sprint
	- measurable completion check.

Multi-user vote QA deferred trigger:
- Hosted deployment is live with stable auth callback and shared-session testing support.

## External Actions Needed From You (for Full Verification)
- Provide or confirm a shared test environment setup:
	- one owner account
	- at least two collaborator accounts
	- one anonymous/incognito test path
- Confirm Supabase project access for migration and policy verification:
	- ability to apply and inspect supabase/migrations/02_trip_collab_and_share.sql
	- access to RLS policy view/logs
- Confirm production-like env variables are set for test runs:
	- VITE_SUPABASE_URL
	- VITE_SUPABASE_ANON_KEY
	- VITE_GOOGLE_MAPS_API_KEY
- Run multi-user manual QA scenario set (or provide team member support):
	- save a shared trip as owner
	- vote from collaborator accounts
	- verify permission denial for unauthorized users
	- verify vote aggregates update as expected
- Confirm external API quota headroom for repeated discovery/route tests.
- For local dev verification:
	- free port 3000 or approve alternate port workflow during tests.

## Quality Gates
- [x] Build passes for implemented sprint scope.
- [x] Core planner tests are stable.
- [ ] Planner E2E happy path in CI.
- [ ] Multi-user collaboration QA matrix completed.
- [ ] Release hardening checklist completed.

## Delivery Sequence
- Sprint 1: Phase 0 and Phase 1 (completed)
- Sprint 2: Phase 2 and Phase 3
- Sprint 3: Phase 4 and Phase 5 plus hardening

## How To Keep This File Updated
After each implementation batch, update:
- Progress Snapshot statuses.
- Completed Work Log with date and file list touched.
- Challenges and Postponed sections for new blockers/debt.
- Quality Gates checklist based on latest validation runs.
