# VOID SALVAGE

**Genre:** Space fleet builder / offline campaign / base raids
**Audience:** 13–25, mobile-first
**Status:** Prototype in development (`void-salvage/prototype/`)
**Monetization:** rewarded ads (opt-in) + cosmetic donations + one-time Premium (removes ads)
**Art direction:** clean geometric 2D in the spirit of Creeper World — dark field, faint world grid, flat colored shapes, thin outlines. NOT pixel art.

## Concept

Same "Big Breakdown" universe as SCRAP WARS, but in space. Scavenger fleets drift between dead stations and planets, stripping anything valuable. The player is a captain of a rusted ship who builds a war fleet from nothing.

**Hybrid model:** offline campaign (no server needed) + optional online weekend wars.

## Core Loop

```
Assemble ships -> fly a mission -> battle (manual flagship + AI wingmen)
-> salvage loot -> shipyard: repair, build, upgrade -> next sector
```

## Control Scheme (decided)

- **Mouse orders, no WASD.** Click empty space = move order; click an enemy = target lock, guns auto-aim and fire. RTS-lite: the player commands, the ship executes.
- **Autopilot button:** hands the entire armada to AI (commander/spectator mode). Toggleable mid-battle.

## Fleet

**Block-grid assembly.** Every ship is literally built from square blocks on a grid — hull plates, engines, guns, and later rocket pods, beams, shield gens, hangar cells, reactors. Blocks must touch; damage is per-block (lose engines = drift, lose guns = toothless).

- **Starting ship is a junker:** a couple of hull plates, one engine, one basic gun. Progression = more scrap, more block types, bigger grid.
- Ship classes emerge from builds, not presets: fast fragile builds, heavy volley builds, **transports** (landing bay blocks) for planetary drops.
- Reactor/energy-budget equivalent: scrap cost per block + mass vs engine count.

## Combat

2D space with inertia: thrust moves you, ships drift — steering is handled by ship AI following your orders. Player issues orders to the flagship and wingmen (or hands everything to autopilot).

- Pre-battle tactics: escort formation, per-ship orders
- A disabled ship drifts — tow it home or lose it (hardcore mode)

## Campaign

Sector map, branching missions:

- Story chapters: small scavenger -> feared raider
- Mission types: debris field cleanup, convoy escort, point defense, elite hunt, station assault, **planetary landing**
- Faction reputation: rob traders -> prices and patrols rise; help them -> discounts and allied reinforcements
- Free flight between missions — farming, random events ("distress signal — pirate trap?")

## Base Raids — two-phase assault

1. **Space phase:** approach the station/orbital base — destroy turrets, hangars, shield generators, fight off patrol. Chunks of the station tear off and drift.
2. **Landing phase:** suppress AA -> launch the transport, it docks/lands on the planet -> short ground phase: your landing vehicle (SCRAP WARS machine mechanics) drives through the base, blows up warehouses and loads loot while the fleet covers from above.

**Bases don't capture themselves** — the planetary phase is mandatory for a full clear. Full warehouse sack = full hold of loot; early retreat = what you grabbed.

## Clans & Weekend Wars (online layer)

- Campaign stays fully offline; the online layer is optional and account-based.
- **Weekend wars: fully manual real-time battles**, weekends only — fleet vs fleet, clan vs clan. Same machines/ships the player built in campaign.
- Keeps the offline game cheap to run: servers live mostly on weekends, hype concentrates into an event.

## Progression

- Loot = parts from wrecks and stations, blueprints from bosses
- **Shipyard** (flying home): docks, debris recycler, lab, storage — base-like upgrade, offline
- Crew: pilots with perks, veterans level with missions

## Monetization

- **Rewarded ads (button-initiated):** x2 mission loot, instant repair, blueprint reroll, "second chance" when flagship is disabled
- **Donations:** hull skins, fleet paint jobs, engine effects, "Admiral" title, supporter emblem
- **Premium (offline-friendly):** one-time purchase, removes ads forever — converts better than cosmetics in offline games

## MVP Scope

1. **Physics prototype** (HTML5 Canvas, `prototype/`): block-grid shipyard, mouse orders, AI wingman, **autopilot toggle** — validate game feel
2. Core build: more block types, 3 mission types, salvage/loot loop, shipyard lite
3. Campaign chapters, factions, base raids with landing phase
4. Online weekend wars (last — needs servers)

## Risks

- **Inertial controls** are harder to make feel good than car physics — prototype decides
- **Content cost:** campaign = missions + writing. Mitigation: mission generator + 10–15 hand-made story missions
- **Offline = no social retention loop** — compensated by story, meta-progression, daily generated contracts
- **Weekend wars adds server scope** — keep it out of MVP

## Metrics

D1 > 35%, D7 > 15%, ad opt-in > 40% DAU, campaign chapter completion curve, Premium conversion.

## Tech Notes

Shares ~60% of tech with SCRAP WARS (parts system, physics, workshop/shipyard, raids). Prototype: HTML5 Canvas + hand-rolled physics (`prototype/`). Production engine TBD — Godot 4 is the candidate (free, exports to mobile).
