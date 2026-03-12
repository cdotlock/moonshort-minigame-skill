# MiniGame Roadmap

## Goal
Extract a reusable H5 mini-game framework from existing examples, then support AI-driven batch generation while keeping host compatibility stable across a standalone repository.

## Milestones

- [x] M1: Initialize standalone framework root
- [x] M2: Define stable settlement contract (`rating/score/attribute/modifier`)
- [x] M3: Provide reusable Phaser H5 template with bridge integration
- [x] M4: Publish agent generation rules and directory conventions
- [x] M5: Add current two games as example implementations
- [x] M6: Expand settlement to five tiers (`S/A/B/C/D`)
- [x] M7: Add first generated game under `games/`
- [x] M8: Add host-side integration reference for Cocos WebView
- [x] M9: Add automated payload validation check
- [ ] M10: Run host-side integration test in Cocos WebView

## Development Log

### 2026-03-12
- Re-started from scratch as requested.
- Created a dedicated framework space, separate from existing `game/` examples.
- Standardized settlement contract around current live fields:
  - `rating`, `score`, `attribute`, `modifier`
- Added schema validation file to reduce drift during batch generation.
- Added reusable H5 Phaser template with:
  - URL param parsing (`attribute`, `primaryColor`)
  - unified `notifyGameComplete` bridge logic
  - final CTA-triggered settlement send

### 2026-03-12 (Standalone Upgrade)
- Promoted the provided UI/UX prompt into the canonical design guide:
  - `standards/design-guide.md`
- Added a compact compatibility layer:
  - `standards/framework-constraints.md`
- Added two example games from the original moonshort repo:
  - `examples/platform-runner/index.html`
  - `examples/merge-2048/index.html`
- Switched framework contract from four tiers to five tiers:
  - `S / A / B / C / D`
- Locked modifier mapping to:
  - `+2 / +1 / 0 / -1 / -2`
- Promoted the former `minigame/` workspace to repository root.
- Switched `origin` to:
  - `https://github.com/cdotlock/moonshort-minigame-skill`
- Added host integration assets:
  - `host/cocos-settlement-handler.ts`
  - `host/cocos-webview-integration.md`
- Added local payload validator:
  - `scripts/validate-settlement.js`

## Next Work Items

1. Build one production mini-game in `games/<game_id>/index.html` using template.
2. Run a real host-side integration test in Cocos WebView.
3. Add CI check for required settlement fields on generated HTML games.

## Current Sprint (2026-03-12)

### Target
- Deliver full requested game pack under `games/` with unified settlement panel and stable bridge payload contract.
- Finish end-to-end run checks for every generated game (load -> playable -> settlement -> Continue payload).

### Progress Checklist
- [x] Upgrade `qte-challenge` with explicit non-clickable blank windows between cues
- [x] Deliver extra QTE variants:
  - [x] `qte-direction-switch`
  - [x] `qte-hold-release`
  - [x] `qte-sequence-recall`
  - [x] `qte-boss-parry`
- [x] Deliver requested non-QTE games:
  - [x] `falling-rhythm`
  - [x] `whack-a-mole`
  - [x] `stardew-fishing`
  - [x] `flappy-bird`
  - [x] `survive-30-seconds`
  - [x] `parking-rush`
  - [x] `slot-machine`
  - [x] `red-light-green-light`
  - [x] `quiz-gauntlet`
  - [x] `merge-2048`
  - [x] `memory-flip`
  - [x] `rapid-memory`
  - [x] `arithmetic-rush`
- [x] End-to-end verification for all generated games completed

### 2026-03-12 (QTE Expansion + Full Game Pack Delivery)
- Upgraded `qte-challenge` with explicit non-clickable blank windows between cue windows.
- Delivered four additional QTE variants:
  - `qte-direction-switch`
  - `qte-hold-release`
  - `qte-sequence-recall`
  - `qte-boss-parry`
- Delivered requested non-QTE games:
  - `falling-rhythm`
  - `whack-a-mole`
  - `stardew-fishing`
  - `flappy-bird`
  - `survive-30-seconds`
  - `parking-rush`
  - `slot-machine`
  - `red-light-green-light`
  - `quiz-gauntlet`
  - `merge-2048`
  - `memory-flip`
  - `rapid-memory`
  - `arithmetic-rush`
- Completed full end-to-end validation pass for all generated games:
  - load success
  - settlement scene reachability
  - final Continue trigger
  - payload core fields (`rating`, `score`, `attribute`, `modifier`)
  - fixed modifier mapping (`S/A/B/C/D -> +2/+1/0/-1/-2`)

## Next Expansion (2026-03-12)

### Target
- Add 20 more simple one-minute mini-games under `games/`.
- Re-optimize UI across all generated games to avoid visible overlap and keep layouts readable on the fixed mobile canvas.
- Re-run end-to-end verification across the full pack after UI polish.

### Expansion Checklist
- [ ] Deliver new games:
  - [x] `color-match`
  - [x] `target-tap`
  - [x] `lane-dash`
  - [x] `stack-drop`
  - [x] `shell-shuffle`
  - [x] `spotlight-seek`
  - [x] `dial-safe`
  - [x] `jump-hurdle`
  - [x] `balloon-pop`
  - [x] `odd-one-out`
  - [x] `code-breaker`
  - [x] `basket-catch`
  - [x] `gate-picker`
  - [x] `power-swing`
  - [x] `tile-trace`
  - [x] `shape-match`
  - [x] `meteor-dodge`
  - [x] `pulse-keeper`
  - [x] `path-picker`
  - [x] `reactor-cooler`
- [x] UI polish pass across all generated games completed
- [x] Full end-to-end verification re-run across all generated games completed

### 2026-03-12 (Expansion Progress)
- Completed all 20 new games with real gameplay loops:
  - `color-match`
  - `target-tap`
  - `lane-dash`
  - `stack-drop`
  - `shell-shuffle`
  - `spotlight-seek`
  - `dial-safe`
  - `jump-hurdle`
  - `balloon-pop`
  - `odd-one-out`
  - `code-breaker`
  - `basket-catch`
  - `gate-picker`
  - `power-swing`
  - `tile-trace`
  - `shape-match`
  - `meteor-dodge`
  - `pulse-keeper`
  - `path-picker`
  - `reactor-cooler`
- Switched the new choice / tap layouts to a safer non-overlapping panel structure:
  - header + stats
  - larger centered play card
  - dedicated status/combo band below the action area
- Reworked older high-risk layouts that previously overlapped:
  - `arithmetic-rush`
  - `quiz-gauntlet`
  - `rapid-memory`
  - `whack-a-mole`
  - other legacy HUDs with status/combo text crossing into play areas
- Re-ran runtime settlement checks across the full 38-game pack:
  - 37 games validated through a generic `ResultScene` CTA flow
  - `merge-2048` validated through its `RatingScene` CTA flow
  - all payloads matched `rating / score / attribute / modifier`

## 50-Game Expansion (2026-03-12)

### Target
- Expand the pack from 38 to 50 distinct mini-games.
- Keep every game understandable within a few seconds and completable within one minute.
- Preserve the current unified UI quality bar and settlement compatibility.
- Re-run full parse and settlement verification across all 50 games after delivery.

### Expansion Checklist
- [x] Deliver new games:
  - [x] `snake-sprint`
  - [x] `breakout-blitz`
  - [x] `mini-golf-putt`
  - [x] `word-scramble`
  - [x] `maze-escape`
  - [x] `conveyor-sort`
  - [x] `cannon-aim`
  - [x] `orbit-avoid`
  - [x] `bomb-defuse`
  - [x] `goalie-guard`
  - [x] `traffic-control`
  - [x] `balance-beam`
- [x] UI pass across the full 50-game pack completed
- [x] Full parse and end-to-end settlement verification completed

### 2026-03-12 (50-Game Expansion Progress)
- Started the final expansion from 38 to 50 games.
- Locked the new game list to twelve distinct mechanics:
  - `snake-sprint`
  - `breakout-blitz`
  - `mini-golf-putt`
  - `word-scramble`
  - `maze-escape`
  - `conveyor-sort`
  - `cannon-aim`
  - `orbit-avoid`
  - `bomb-defuse`
  - `goalie-guard`
  - `traffic-control`
  - `balance-beam`
- Delivered and syntax-checked:
  - `snake-sprint`
  - `breakout-blitz`
  - `word-scramble`
  - `maze-escape`
  - `cannon-aim`
  - `orbit-avoid`
  - `conveyor-sort`
  - `bomb-defuse`
  - `goalie-guard`
  - `balance-beam`
  - `mini-golf-putt`
  - `traffic-control`
- Reached 50 total games under `games/`.
- Completed a focused UI pass on the new high-risk layouts and nudged overlapping status/combo bands below the play cards where needed:
  - `bomb-defuse`
  - `conveyor-sort`
  - `goalie-guard`
  - `mini-golf-putt`
  - `traffic-control`
- Re-ran parse validation across all 50 games:
  - 50 / 50 script blocks compiled successfully
- Re-ran browser settlement validation across the full pack:
  - 49 games validated through the generic `ResultScene` CTA flow
  - `merge-2048` validated separately through its `RatingScene` CTA flow
  - all payloads matched `rating / score / attribute / modifier`
  - all modifier values matched `S / A / B / C / D -> +2 / +1 / 0 / -1 / -2`
- Delivery and validation are tracked live in this section.

## Skill Stability Pass (2026-03-13)

### Target
- Merge the repository agent rules into `SKILL.md` without changing the core skill contract.
- Make roadmap logging mandatory before and after every task.
- Fill `list.md` with the current game inventory: name, mechanic, directory.
- Fold in recent implementation and verification lessons to improve stability.
- Sync the documentation update to GitHub after verification.

### Checklist
- [x] Add mandatory roadmap logging rules to `SKILL.md`
- [x] Merge `agent.md` guidance into `SKILL.md`
- [x] Expand `list.md` with full game inventory
- [x] Verify updated docs for consistency
- [x] Sync changes to GitHub

### 2026-03-13 (Progress)
- Started the skill stability pass requested by the user.
- Merged the former agent constraints into `SKILL.md` and kept `agent.md` as a backward-compatible pointer.
- Added explicit mandatory rules for:
  - roadmap logging before and after every substantive task
  - list maintenance whenever game inventory changes
  - per-game manual delivery over blind bulk generation
- Expanded `list.md` into a full 50-game inventory with name, gameplay summary, and directory path.
- Updated `README.md` so the repository now points to `SKILL.md` as the single primary operating guide.
- Verified document consistency:
  - non-empty document check passed
  - `list.md` inventory count matches the 50 shipped game directories exactly
- Synced the repository to GitHub:
  - pushed `main` to `origin`
  - current sync commit: `a598d5a`
