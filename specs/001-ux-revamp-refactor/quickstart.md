# Quickstart — Build, load & verify (001)

How to build the extension, load it, and validate the popup revamp. Manual verification
covers the DOM/view behavior that unit tests intentionally don't.

---

## Build & load

```bash
npm install          # ensure deps (adds fflate for the ZIP feature)
npm run check        # typecheck + lint + unit tests
npm run build        # esbuild → dist/  (or: npm run watch)
```

Load in the browser:
1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select the `dist/` folder.
3. Open a song page at `https://suno.com/song/...`, then click the extension icon.
   After editing source, re-run the build and hit **Reload** on the extension card; reload
   the Suno tab if the content script needs re-injection.

---

## Acceptance walkthrough (per user story)

### US1 — Lyrics (MVP)
- [ ] On a song page, the popup opens to **Loaded** with a source card (cover, title,
      artist; duration/model if available) and the **Lyrics** tab active.
- [ ] **Timestamps** toggle adds/removes the `[mm:ss.xx]` prefix in the lyrics box and in
      **Copy lyrics** output.
- [ ] **Clean** and the **Aa/A/a** case segment change the rendered text (stackable).
- [ ] **Copy lyrics** copies the currently formatted text.
- [ ] **`.lrc`** downloads a **timed** file even when Timestamps is off.
- [ ] Footer shows the connected status.

### US2 — Tabs & per-asset downloads
- [ ] **Audio** tab: a clickable waveform fills to the real playback position; play/pause
      works; `current / total` updates; clicking a bar seeks; end resets to paused.
- [ ] **Download MP3** saves the file (sourced from `mediaUrls.audio`, not a CDN guess).
- [ ] **Cover** tab previews artwork + **Download cover**.
- [ ] **Video** tab previews the visualizer + **Download video**; disabled if unreachable.
- [ ] An asset with no URL is disabled (tab/button), not error-prone.

### US3 — Download all as ZIP
- [ ] The ZIP button on the source card opens the package panel.
- [ ] Toggling items updates the label `Download ZIP · {n} files · ~{size}`; at 0 it shows
      "Select at least 1 file" and is disabled.
- [ ] Download yields **one** `.zip` containing exactly the checked, fetchable assets
      (lyrics as a raw timed `.lrc`).
- [ ] If one asset fails to fetch, it's **skipped** and the rest still archive.

### US4 — Token error & manual fallback
- [ ] With a failing/absent token, the popup shows the **error** state with **Reconnect**.
- [ ] Reconnect retries (shows Loading) and recovers when possible.
- [ ] "Choose token source manually" expands a `<select>` of discovered options; **Retry
      with this source** reloads via that path.
- [ ] The token picker never appears in the normal loaded UI; footer shows not-connected.

### US5 — Paste a song link
- [ ] The top-bar paste toggle reveals an input + **Load**; the empty state has the same.
- [ ] Pasting a valid Suno URL + Load loads that song.
- [ ] Pasting garbage shows the inline `bad_link` error; no crash.

### Polish / cross-cutting
- [ ] Every control shows a visible focus ring; primary actions are keyboard-operable
      (tabs, Copy, `.lrc`, downloads, ZIP, Load, Reconnect); Esc/tab order sane (§9).
- [ ] No raw hex/px literals in components (tokens only); no inline user strings (i18n).
- [ ] Long title/artist ellipsize; dark theme only (no theme picker).

---

## QA matrix (edge coverage)

| Scenario | Expected |
| --- | --- |
| Signed out / no token | Error state + manual fallback |
| Non-song tab | Empty state |
| Missing cover or video | That asset disabled; others work; ZIP skips it |
| No `mediaUrls.audio` | Audio tab + Download MP3 + ZIP audio disabled |
| Very long title/artist | Ellipsis, no overflow |
| ZIP with none selected | Button disabled, "Select at least 1 file" |
| ZIP with one asset 404 | Archive still delivers the rest |
| Audio: play/pause/seek/end | Position truthful; end resets to paused |
| Paste valid / invalid URL | Loads song / inline `bad_link` |
