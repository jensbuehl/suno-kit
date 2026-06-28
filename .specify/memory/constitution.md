<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — Principle IV materially expanded with a permitted "phased
  accessibility rollout" path. No principle removed or redefined; WCAG 2.1 AA remains the
  mandatory target and shipping with no accessibility (or no tracked follow-up) is still
  prohibited. Resolves the /speckit-analyze C1 conflict for feature 001 without diluting
  the principle.

Modified principles:
  - IV. State-of-the-Art, Accessible UX — added the phased-rollout allowance + tracking
    requirement; clarified AA as the ultimate-must standard.
Added sections: None
Removed sections: None

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check is a dynamic gate; phased
     a11y is tracked via the existing Complexity Tracking table. No change needed.
  ✅ .specify/templates/spec-template.md — no principle-specific accessibility section. No change.
  ✅ .specify/templates/tasks-template.md — no principle-specific task types. No change.

Follow-up TODOs: None
-->

# SUNO Copilot Constitution

## Core Principles

### I. Simplicity & Minimalism

Every change MUST favor the simplest solution that satisfies the requirement.
Build only what a current, explicit requirement demands (YAGNI) — no speculative
abstractions, options, or layers added "for later". Prefer fewer moving parts: a
plain function over a class, a direct call over an event bus, a flat structure over
a deep hierarchy. Any added complexity (new dependency, new abstraction, new
configuration surface) MUST be justified against a simpler rejected alternative in
the plan's Complexity Tracking table.

**Rationale**: SUNO Copilot is a focused browser extension. Minimal surface area
keeps the extension fast, auditable, easy to review for permissions/security, and
cheap to change as the UX evolves.

### II. Reuse Before Building

Before writing new code, you MUST search for an existing function, module, token,
or pattern that already does the job and reuse or extend it. Duplicated logic is a
defect: shared behavior MUST live in one place and be imported. New utilities are
introduced only when no existing one fits and the need is real. Third-party
dependencies are a last resort, justified only when they replace materially more
code than they add and carry acceptable maintenance/security cost.

**Rationale**: One implementation per concept means one place to fix bugs, one
place to test, and no drift between copies — directly reinforcing simplicity.

### III. Single Source of Truth for Design Tokens

All UI and UX tokens — colors, spacing, typography, radii, shadows, motion/timing,
z-index, and breakpoints — MUST be defined exactly once in a single canonical token
source and consumed by reference everywhere. Hard-coded literal style values
(e.g. raw hex colors, pixel magic numbers) in components, inline styles, or ad-hoc
CSS are prohibited. Any visual change MUST be made by editing or adding a token, not
by overriding values locally. The same applies to copy/strings, which MUST flow
through the existing i18n source rather than being inlined.

**Rationale**: A single token source guarantees visual consistency, makes
theming/dark-mode and rebranding a one-edit operation, and prevents the silent UI
drift that accumulates when values are copy-pasted.

### IV. State-of-the-Art, Accessible UX

User-facing surfaces MUST follow current best-practice, easy-to-use UX: clear and
predictable interactions, sensible defaults, immediate feedback for every action,
graceful loading/empty/error states, and no dead ends. Accessibility is mandatory,
not optional: **WCAG 2.1 AA is the standard every user-facing surface MUST ultimately
meet** — keyboard operability, visible focus, sufficient contrast, and appropriate
semantics/ARIA. The interface MUST stay minimal: expose only what the user needs now,
progressively disclose the rest.

**Phased accessibility rollout (permitted).** A feature MAY ship with a *minimal
accessibility baseline* — at minimum, full keyboard operability and visible focus for
all primary actions — provided the remaining WCAG 2.1 AA work (complete ARIA/semantics,
contrast audit, and reduced-motion handling) is recorded as an explicit, tracked
follow-up in the feature's plan (e.g. the Complexity Tracking table and/or a dedicated
accessibility checklist). Phasing affects only timing, never the destination: shipping
with **no** accessibility, or with no tracked follow-up toward AA, is prohibited.

**Rationale**: The extension's value is a frictionless assistant experience.
Best-practice, accessible UX maximizes adoption and trust while keeping the surface
small enough to maintain. Allowing a tracked, phased path to AA lets a feature ship
incrementally without ever abandoning the accessibility commitment.

## Additional Constraints: UI/UX Token Governance

- The canonical token source is the project's designated design-token module/file;
  it is the only place new tokens are added and the only place existing values change.
- Components consume tokens by name/reference only. A code review MUST reject any new
  literal style value that bypasses a token.
- Token names MUST describe role/intent (e.g. `color.surface.muted`), not raw values
  (e.g. `gray200`), so the underlying value can change without renaming usages.
- User-visible text MUST resolve through the i18n source — no inline strings.

## Development Workflow

- Features follow the Spec Kit flow: specify → clarify (as needed) → plan → tasks →
  implement, with the Constitution Check gate in the plan passing before design and
  re-checked after.
- Each pull request / change MUST demonstrate compliance with all four principles;
  reviewers MUST verify reuse (no duplication), token usage (no literals), and basic
  accessibility before approval.
- When a feature uses the phased accessibility rollout (Principle IV), the plan MUST
  record the deferred WCAG 2.1 AA items as an explicit, tracked follow-up; reviewers
  MUST confirm that follow-up exists rather than treating the deferral as complete.
- Justified exceptions to a principle MUST be recorded in the plan's Complexity
  Tracking table with the simpler alternative and why it was rejected. Unjustified
  violations block merge.

## Governance

This constitution supersedes other practices where they conflict. Amendments are
made by editing this file via the `/speckit-constitution` workflow, which MUST
update the version, the amendment date, and the Sync Impact Report, and MUST
propagate any consequent changes to dependent templates.

Versioning follows semantic versioning:
- **MAJOR**: Backward-incompatible governance changes or removal/redefinition of a
  principle.
- **MINOR**: A new principle or section is added, or guidance is materially expanded.
- **PATCH**: Clarifications, wording, and non-semantic refinements.

Compliance is enforced at review time: every plan and pull request is checked
against these principles, and complexity must be justified rather than assumed.

**Version**: 1.1.0 | **Ratified**: 2026-06-28 | **Last Amended**: 2026-06-28
