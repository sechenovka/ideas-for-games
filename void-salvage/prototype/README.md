# VOID SALVAGE — prototype v0.4

Game-feel prototype. No dependencies, no build step.

## Run

Open `index.html` in any browser (or serve the folder — sprite loading needs no server, but `python -m http.server` works too).

## What's in it

- **Block-grid shipyard:** your ship is a grid of square blocks — HULL / ENGINE / GUN. You start with a junk rustbucket: a couple of hull plates, one engine, one sad little gun. Scrap budget limits the build; blocks must touch.
- **Fleet selection:** pick up to **2 wingmen** from the roster (SCOUT / GUNSHIP / BULWARK) before launch — transports are limited, choose who comes.
- **Squad orders:** only the flagship starts selected — click your own ship to select it (shift = add), then click empty space = move order, click an enemy = attack order. Orders go to every selected ship; `A` selects the whole fleet. Unordered wingmen form up on the flagship.
- **Orbital combat:** attackers circle their target at gun range instead of ramming it; enemies do the same. Ships brake on arrival instead of drifting past orders forever.
- **Salvage drops:** destroyed blocks fall off as collectible debris — fly over them to bank scrap; salvaged scrap permanently raises your next build budget.
- **Reinforcements:** dropping the station's turret shield spawns a response wing.
- **Pause** (Space or button) — single player only. Clan wars will have no pause: the war itself just runs slowly.
- **Blender-rendered sprites** (`assets/*.png`): parts are top-down Eevee renders generated in Blender via the local MCP bridge (`blender-mcp` addon on localhost:9876). Turrets are two-layer: static base + barrel that rotates to track its target.
- **Clean geometric visuals** (Creeper World direction, NOT pixel art): dark field, faint world grid, thin outlines.
- **Per-block damage:** bullets knock out individual blocks — lose engines and you drift, lose all guns and you're toothless, lose every block and you're dead.
- Slower combat pace, bullet tracers, engine exhaust per engine block.
- **Asteroid field:** destructible cover between you and the station — break rocks for salvage.
- **Planetary phase (press L after destroying the station):** top-down tile world in the Terraria/Creeper World spirit — diggable dirt/rock, ore + fuel veins, caverns. Your lander digs, mines, fights guard drones and base turrets, and cracks the lootable core. Enemy walls and your own walls are destructible; build WALL (4 ore) and TURRET (12 ore) to fortify.

## Controls (space)

| Input | Action |
|---|---|
| LMB on own ship | select it (Shift = add/remove) |
| LMB on empty space | move order for all selected ships |
| LMB on enemy | attack order for all selected ships |
| RMB drag / wheel | pan camera / zoom |
| F | re-center on flagship |
| A or ALL button | select whole fleet |
| Space or PAUSE button | pause / resume |
| P or AUTOPILOT button | AI flies the fleet |
| L (after win) | land on the planet |
| R | back to shipyard (rebuild) |

## Controls (planet)

| Input | Action |
|---|---|
| LMB on open ground | move the lander |
| LMB on solid tile (close) | dig it out |
| LMB on enemy | lock target (auto-fire) |
| 1 / 2 or buttons | build WALL / TURRET (ore) |
| RMB drag / wheel | pan / zoom |
| Space | pause |
| R | back to shipyard |

## Loop

Assemble flagship -> pick wingmen -> LAUNCH -> kill the 6 turrets -> destroy the core -> L: land -> dig/mine/raid the ground base -> R -> rebuild with salvaged scrap -> again.

## Not in this prototype (by design)

Campaign map, more block types (missiles, shields, hangar), ground-vehicle part variety (wheels/tracks for the lander), real factory production on the base. See `projects/VoidSalvage.md`.
