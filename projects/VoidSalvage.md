# VOID SALVAGE

**Genre:** Space fleet builder / offline campaign / base raids
**Audience:** 13–25, mobile-first
**Status:** Prototype in development (`void-salvage/prototype/`)
**Monetization:** rewarded ads (opt-in) + cosmetic donations + one-time Premium (removes ads)

## Concept

Same "Big Breakdown" universe as SCRAP WARS, but in space. Scavenger fleets drift between dead stations and planets, stripping anything valuable. The player is a captain of a rusted ship who builds a war fleet from nothing.

**Hybrid model:** offline campaign (no server needed) + optional online weekend wars.

## Core Loop

```
Assemble ships -> fly a mission -> battle (manual flagship + AI wingmen)
-> salvage loot -> shipyard: repair, build, upgrade -> next sector
```

## Control Scheme (decided)

- **Manual mode (default):** the player personally controls the armada — pilots the flagship, issues orders to wingmen (attack / cover me / focus station), can switch direct control to any ship.
- **Autopilot button:** player presses it -> AI takes over the entire armada including the flagship (commander/spectator mode). Toggleable at any moment in battle.

## Fleet

Every ship is built from parts — same system as SCRAP WARS machines:

- Hull -> engine -> weapon slots (cannons, rocket pods, beams, torpedoes) -> armor/shields -> modules (radar, repair, hangar)
- Classes: **fighter** (fast, fragile), **corvette** (balanced), **frigate** (heavy, volley), **transport** (landing troops + loot hold)
- Reactor **energy budget** constrains the build.

## Combat

2D space with Newton-lite inertia physics: thrust moves you, no brakes — you rotate and burn to stop. Player controls the flagship (or any ship, or nothing on autopilot); wingmen fly their builds under AI and follow orders.

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

1. **Physics prototype** (HTML5 Canvas, `prototype/`): inertial ship, shooting, enemy station with turrets, one AI wingman, **autopilot toggle** — validate game feel
2. Core build: ship assembly (~20 parts), 3 mission types, salvage/loot loop, shipyard lite
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
