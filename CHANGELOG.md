# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Renamed the extension to **SUNO Copilot**.
- Hardened the manifest: removed the unused `tabs` permission and the
  `web_accessible_resources` block that exposed the popup to all sites.
- Rewrote the content script's token-discovery and lyrics-fetch logic from
  transpiled generator output to native `async/await`, and removed dead bundler
  runtime and unused helpers.
- Deduplicated the popup: collapsed the MP3/cover/video download functions into a
  single `downloadMedia()` helper and the repeated lyric-cleaning logic in
  `convertLrc()` into shared helpers.
- Added project tooling: ESLint (flat config), Prettier, `.editorconfig`, and
  `.gitignore`.

### Fixed

- Popup now injects the content script on demand (`chrome.scripting`) when it is
  not yet present, so the first open after (re)loading the extension no longer
  shows "Receiving end does not exist" and no page refresh is required.

### Removed

- Removed the bundled icon set from the manifest (temporary).

## [1.1.1]

- Token path detection and UI improvements (baseline before this cleanup).
