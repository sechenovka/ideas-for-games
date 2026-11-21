# VOID SALVAGE — prototype v0.2

Game-feel prototype. No dependencies, no build step.

## Run

Open `index.html` in any browser.

## What's in it

- **Block-grid shipyard:** your ship is a grid of square blocks — HULL / ENGINE / GUN. You start with a junk rustbucket: a couple of hull plates, one engine, one sad little gun. Scrap budget limits the build; blocks must touch.
- **Clean geometric visuals** (Creeper World direction, NOT pixel art): dark field, faint world grid, flat colored shapes, thin outlines.
- **Mouse-order controls:** click empty space = fly there; click an enemy = lock target, your guns auto-aim and fire. No WASD.
- **Per-block damage:** bullets knock out individual blocks — lose engines and you drift, lose all guns and you're toothless, lose every block and you're dead.
- AI wingman, enemy fighters (also block-built), station with 6 destructible turrets + shielded core.
- **Autopilot toggle (P or on-screen button):** hands the armada to AI — the manual/AI scheme from the design doc.

## Controls

| Input | Action |
|---|---|
| LMB on empty space | move order |
| LMB on enemy | lock target (guns auto-fire) |
| P or button | autopilot on/off |
| R | back to shipyard (rebuild) |

## Loop

Assemble ship -> LAUNCH -> kill the 6 turrets -> destroy the core -> R -> rebuild -> try again.

## Not in this prototype (by design)

Loot/parts drops, scrap economy, campaign map, more block types, landing phase. See `projects/VoidSalvage.md`.
