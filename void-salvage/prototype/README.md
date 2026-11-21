# VOID SALVAGE — prototype v0.3

Game-feel prototype. No dependencies, no build step.

## Run

Open `index.html` in any browser (or serve the folder — sprite loading needs no server, but `python -m http.server` works too).

## What's in it

- **Block-grid shipyard:** your ship is a grid of square blocks — HULL / ENGINE / GUN. You start with a junk rustbucket: a couple of hull plates, one engine, one sad little gun. Scrap budget limits the build; blocks must touch.
- **Fleet selection:** pick up to **2 wingmen** from the roster (SCOUT / GUNSHIP / BULWARK) before launch — transports are limited, choose who comes.
- **Squad orders:** click your own ship to select it (shift = add to selection), then click empty space = move order, click an enemy = attack order. Orders go to every selected ship; `A` selects the whole fleet. Unordered wingmen form up on the flagship.
- **Pause** (Space or button) — single player only. Clan wars will have no pause: the war itself just runs slowly.
- **Blender-rendered sprites** (`assets/*.png`): parts are top-down Eevee renders generated in Blender via the local MCP bridge (`blender-mcp` addon on localhost:9876). Turrets are two-layer: static base + barrel that rotates to track its target.
- **Clean geometric visuals** (Creeper World direction, NOT pixel art): dark field, faint world grid, thin outlines.
- **Per-block damage:** bullets knock out individual blocks — lose engines and you drift, lose all guns and you're toothless, lose every block and you're dead.
- Slower combat pace, bullet tracers, engine exhaust per engine block.

## Controls

| Input | Action |
|---|---|
| LMB on own ship | select it (Shift = add/remove) |
| LMB on empty space | move order for all selected ships |
| LMB on enemy | attack order for all selected ships |
| A or ALL button | select whole fleet |
| Space or PAUSE button | pause / resume |
| P or AUTOPILOT button | AI flies the fleet |
| R | back to shipyard (rebuild) |

## Loop

Assemble flagship -> pick wingmen -> LAUNCH -> kill the 6 turrets -> destroy the core -> R -> rebuild -> try again.

## Not in this prototype (by design)

Loot/parts drops, scrap economy, campaign map, more block types (missiles, shields, hangar), landing phase. See `projects/VoidSalvage.md`.
