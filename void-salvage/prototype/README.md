# VOID SALVAGE — prototype v0.1

Physics/game-feel prototype. No dependencies, no build step.

## Run

Open `index.html` in any browser.

## What's in it

- Flagship with inertial (Newton-lite) flight: no brakes — rotate and burn to stop
- Cannons, enemy fighters, a station ringed by 6 destructible turrets
- Shielded core: turrets must die before the core takes damage
- One AI wingman that follows you and fights
- **Autopilot toggle (P or on-screen button):** hands the whole armada to AI — the manual/AI control scheme from the design doc, in playable form
- Destruction particles, engine trails, parallax starfield

## Controls

| Key | Action |
|---|---|
| W / Up | thrust |
| A / D or Left / Right | rotate |
| S / Down | brake (dampen velocity) |
| Space | fire |
| P or button | autopilot on/off |
| R | restart |

## Goal

Kill the 6 turrets, then destroy the station core.

## Not in this prototype (by design)

Ship assembly, loot, campaign map, landing phase, more ship classes — those come after the flight feel is validated. See `projects/VoidSalvage.md`.
