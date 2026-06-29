# Feature Specification: Tab-Independent Song Loading & Paste-a-Link

**Feature Branch**: `002-token-paste-link`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "Make Suno token access and lyrics retrieval work even when the active tab is NOT a Suno page, and re-enable dropping/pasting a Suno song URL directly into the popup (the feature existed in the UI before but never functioned — make it actually work this time)."

## Overview

Today the extension only works when the user's **active browser tab is a Suno song page**. Opening the popup on any other tab shows a dead "no song detected" state, even though the user is signed in to Suno and the credentials needed to fetch a song already exist in the browser.

This feature removes that limitation. A user will be able to:

1. **Paste or drop a Suno song link** into the popup from any tab and load that song.
2. Have the extension **pick up a Suno song that is already open in another (non-active) tab**.
3. Get **clear, recoverable feedback** when their Suno session has gone stale and cannot be used.

The headline user-visible change is the return of the paste-a-link control (previously present in the UI but non-functional). The enabling change is decoupling credential access, song identification, and song retrieval from the active tab.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load a song by pasting its link, from any tab (Priority: P1)

A signed-in Suno user is browsing somewhere else (email, docs, a different site). They copy a Suno song URL, open the extension popup, paste (or drop) the link, and the song's lyrics and assets load — without ever switching to a Suno tab.

**Why this priority**: This is the core value of the feature and a self-contained MVP. It delivers the "works from anywhere" promise and inherently requires the tab-independent credential + retrieval architecture, so shipping it proves the whole approach.

**Independent Test**: With a non-Suno tab active and the user signed in to Suno in the same browser, paste a valid Suno song link into the popup and confirm the correct song loads (lyrics + available assets). Fully testable on its own.

**Acceptance Scenarios**:

1. **Given** the active tab is not a Suno page and the user is signed in to Suno, **When** the user pastes a valid Suno song link into the popup's link input, **Then** the extension loads that song's lyrics and available assets.
2. **Given** the user is on any tab, **When** they drag-and-drop a valid Suno song link onto the popup's link control, **Then** the song loads the same as pasting.
3. **Given** the user pastes a string that is not a valid Suno song link, **When** the extension processes it, **Then** it shows a clear, specific message that the link is not a recognized Suno song link and does not enter a broken state.
4. **Given** a valid link is loaded, **When** the user reopens the popup later, **Then** the extension does not silently reuse a stale result without confirming the session is still valid (no misleading "loaded" state backed by expired credentials).

---

### User Story 2 - Use a Suno song already open in another tab (Priority: P2)

A user has a Suno song playing or open in a background tab (or a different window) and is actively working in a non-Suno tab. They open the popup and the extension offers/loads that already-open song without requiring them to paste a link or switch tabs.

**Why this priority**: A strong convenience that removes the most common reason to paste a link, but it depends on the same architecture as P1 and is not required for the MVP.

**Independent Test**: Open a Suno song in a background tab, switch to a non-Suno tab, open the popup, and confirm the extension surfaces that song (auto-loads it or offers it for one-click load).

**Acceptance Scenarios**:

1. **Given** exactly one Suno song tab is open (not active) and no link has been pasted, **When** the user opens the popup, **Then** the extension identifies that song and makes it loadable without the user switching tabs.
2. **Given** the active tab IS a Suno song page, **When** the user opens the popup, **Then** the existing zero-input auto-load behavior is preserved (this feature does not regress it).
3. **Given** more than one Suno song tab is open, **When** the user opens the popup with no pasted link, **Then** the extension resolves which song to use predictably (see precedence in Assumptions) and never loads an ambiguous/wrong song silently.

---

### User Story 3 - Recover gracefully when the session is stale (Priority: P3)

A user opens the popup but their Suno session credentials have expired and there is no live Suno session available to refresh them. Instead of a confusing failure, the extension tells them the session needs refreshing and gives them a one-click way to fix it.

**Why this priority**: Correctness and trust for the edge where credentials cannot be obtained. Important, but only reachable after the primary flows exist.

**Independent Test**: Force a stale-credential condition with no usable Suno session, attempt to load a song, and confirm the user sees a clear recovery path (e.g., a reconnect action) rather than a silent or generic error.

**Acceptance Scenarios**:

1. **Given** the stored Suno credentials are expired and no live Suno session can refresh them, **When** the user attempts to load a song, **Then** the extension shows a clear "session expired / reconnect" message with an actionable recovery step.
2. **Given** a Suno session is available somewhere in the browser, **When** credentials are stale, **Then** the extension obtains fresh credentials from that session and completes the load without surfacing an error to the user.
3. **Given** the user follows the offered recovery step (e.g., opening/refreshing Suno) and returns, **When** they retry, **Then** the load succeeds.

---

### Edge Cases

- **Not signed in**: User has never signed in to Suno in this browser → no credentials exist → clear "sign in to Suno" guidance, not a generic failure.
- **Wrong kind of Suno URL**: Link is a Suno profile, playlist, or home URL rather than a single song → specific "that's not a song link" message.
- **Malformed / partial link**: Trailing query params, share-tracking suffixes, http vs https, or a bare song id pasted → the extension should still resolve the song where the id is unambiguous, otherwise reject clearly.
- **Empty / non-link paste**: Clipboard is empty or contains unrelated text → no-op with a gentle hint, no error state.
- **Song not accessible to this user**: Valid song link but the signed-in account cannot access it → clear "can't access this song" message distinct from an auth error.
- **Multiple Suno tabs open**: Precedence must be deterministic (see Assumptions).
- **Conflicting inputs**: A link is pasted AND the active tab is a Suno song → the explicitly pasted link wins.
- **Stale credentials, no live session**: Covered by US3 — graceful reconnect, never a silent hang.
- **Offline / network failure**: Distinguish "you're offline / Suno unreachable" from "session expired".
- **Popup closed mid-load**: Reopening should restart cleanly rather than show a half-loaded state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The popup MUST open into a usable state on **any** active tab, never a dead "no song detected" end state when the user could still paste a link or has a Suno session available.
- **FR-002**: The popup MUST provide a control to supply a Suno song link, supporting at minimum **paste** (button and/or input) and **drag-and-drop** of a link.
- **FR-003**: The extension MUST validate a supplied link as a Suno **song** link and extract the song identifier, rejecting non-song Suno URLs and non-Suno URLs with a specific message.
- **FR-004**: The extension MUST obtain the Suno credentials needed to retrieve a song **without requiring the active tab to be a Suno page** (i.e., from the browser's existing signed-in Suno session, available regardless of which tab is active).
- **FR-005**: The extension MUST retrieve the song's lyrics and available assets **without depending on a content script running in the active tab**.
- **FR-006**: When no link is supplied, the extension MUST be able to identify a target song from a Suno song tab that is open but **not** active, in addition to the existing case where the active tab is a Suno song page.
- **FR-007**: The extension MUST preserve the existing zero-input behavior: when the active tab is a Suno song page, the song auto-loads on popup open.
- **FR-008**: The extension MUST resolve input precedence deterministically when multiple sources are present (explicit pasted link > active Suno tab > another open Suno tab) and MUST never load an ambiguous or wrong song silently.
- **FR-009**: When credentials are stale, the extension MUST attempt to obtain fresh credentials from an available live Suno session before failing.
- **FR-010**: When fresh credentials cannot be obtained, the extension MUST present a clear, actionable recovery path (reconnect/sign-in/open Suno) and MUST NOT fail silently or with a generic error.
- **FR-011**: The extension MUST distinguish, in user-facing messaging, between: invalid/unsupported link, not signed in, session expired, song not accessible, and network/offline — each with a specific message.
- **FR-012**: The extension MUST NOT persist the user's Suno credentials beyond what is needed to perform a request; credentials MUST be read from their live source rather than cached as a stored copy, and MUST never be written to logs or exported artifacts (e.g., downloaded files, ZIP manifests).
- **FR-013**: All new user-facing text MUST flow through the existing localized string source, and all new UI MUST be operable by keyboard with visible focus (minimal accessibility baseline).
- **FR-014**: The feature MUST NOT broaden the extension's requested permissions beyond what current capabilities already grant, unless a new capability strictly requires it (any such need must be surfaced during planning).

### Key Entities *(include if feature involves data)*

- **Suno Session Credential**: The signed-in user's Suno authentication, used to authorize song retrieval. Lives in the browser's existing session; tab-independent; may become stale and require refreshing from a live session. Sensitive — never persisted long-term or logged.
- **Song Reference**: A pointer to a single Suno song, derived from a pasted/dropped link, an active Suno tab, or another open Suno tab. Resolves to a song identifier used for retrieval.
- **Song Result**: The loaded song's lyrics and available assets (audio, cover, video) presented in the popup, identical in shape to what the popup shows today.
- **Load Source**: Where the current song reference came from (pasted link, active tab, background tab) — drives precedence and messaging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can load a Suno song's lyrics from a **non-Suno active tab** by pasting its link in **3 actions or fewer** (open popup → paste → load) and see the song within a few seconds.
- **SC-002**: **100%** of valid Suno song links paste-loaded by a signed-in user resolve to the correct song or produce a specific, accurate error (never a generic or silent failure).
- **SC-003**: Opening the popup on a non-Suno tab presents a **usable input/affordance** (paste a link, or an offered open-Suno-tab song) in **100%** of cases — the dead "no song detected" end state no longer occurs when an action is possible.
- **SC-004**: When credentials are stale, the user is given a working recovery path that lets them complete the load on retry in **100%** of test cases; there are **zero** silent hangs.
- **SC-005**: Every distinguishable failure mode (invalid link, not signed in, session expired, song inaccessible, offline) maps to a **distinct, specific** user-facing message in **100%** of cases.
- **SC-006**: The existing active-Suno-tab auto-load flow continues to work with **no regression** (zero-input load still succeeds).
- **SC-007**: Suno credentials never appear in any user-visible output, downloaded file, exported package, or persisted store.

## Assumptions

- **Credential source is tab-independent and already available**: The signed-in Suno session that authorizes retrieval can be read regardless of the active tab, using capabilities the extension already holds. No new sign-in mechanism is built.
- **No long-lived credential cache**: Credentials are read from their live source per request rather than stored, both for correctness (they expire quickly) and to honor the project's single-source-of-truth principle. The only thing that may be remembered across popup opens is the user's chosen behavior/source preference, not the credential itself.
- **Freshness without a live session is out of scope to force**: If credentials are stale and **no** live Suno session exists to refresh them, the extension does not attempt brittle, undocumented refresh mechanisms; it routes the user to a graceful reconnect path (US3). Minting fresh credentials is only attempted when a live Suno session is available.
- **Input precedence**: explicit pasted/dropped link > active Suno song tab > a single other open Suno song tab. If multiple background Suno song tabs are open and no link is pasted, the extension asks the user / offers a choice rather than guessing.
- **Scope = single songs**: Only individual Suno **song** links are supported (not playlists, profiles, or search pages). A bare song identifier may be accepted if unambiguous.
- **Reuses existing presentation**: Once a song is identified and retrieved, it is shown using the popup's existing loaded-song views and download actions; this feature changes *how a song is sourced*, not how it is displayed.
- **Re-introduces prior UI intent**: The paste-a-link control envisioned in the earlier popup design (a ghost link control in the top bar) is reinstated and made functional; existing styling tokens/structure are reused rather than re-invented.
- **Sign-in prerequisite**: The user must have signed in to Suno in the same browser at least once; the extension does not handle Suno authentication itself.

## Dependencies

- The user's existing Suno sign-in within the same browser profile.
- The extension's existing capabilities for reading the signed-in session and reaching Suno's services (no expansion expected per FR-014).
- The existing popup loaded-song presentation and download flows, reused unchanged.
