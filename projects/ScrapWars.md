# SCRAP WARS

**Genre:** PvP vehicle-builder / clan wars / physics combat
**Audience:** 13–25, mobile-first
**Status:** Concept
**Monetization:** rewarded ads (opt-in only) + cosmetic donations

## Concept

Post-collapse world. No factories produce parts anymore — the only way to get a reactor, a cannon or an armor plate is to **take someone else's**. The player owns a workshop on a scrapyard, builds war machines from scavenged parts, raids convoys and rival bases, and fights in clan wars.

## Core Loop

```
Build machine -> raid (manual combat, 60-120s) -> loot (parts, coins)
-> upgrade machine/base -> harder targets -> repeat
```

Session target: 3–5 minutes.

## Machines

Three chassis classes (rock-paper-scissors):

| Chassis | Style | Weakness |
|---|---|---|
| Mech | Balanced, melee + ranged | slow |
| Car | Speed, ram, dodge | medium armor |
| Copter | Strikes from above, immune to melee | fragile, fears AA |

Assembly slots: frame -> drive -> weapons (light/heavy/melee) -> armor plates -> modules (shield, cooling, targeting) -> core reactor (**energy budget** limits the build — the real skill).

## Combat

**Manual control.** Side-view 2D physics (Hills of Steel-style): throttle/brake + tilt + fire. The enemy is a real player's build piloted by AI (async ghost — no netcode, no lag, no cheaters). Victims get a **revenge button** — the grudge loop works both ways.

Optional real-time 1v1 duel mode is endgame content, not MVP.

## Raids — the main dish

- **Convoys (PvE):** NPC caravans hauling parts between dead factories. Story chapters across the sector map.
- **Enemy bases (PvP):** drive into a real player's yard — break walls, kill turrets, fight their guard machine (ghost AI + preset tactics), reach the warehouse, steal resources, get out alive.
- Raid stars (CoC-style): warehouse destroyed / guard killed / full clear.
- Raid tickets = energy (5 max, regen, +1–2 per rewarded ad).

Anti-frustration rules: ~10–15% steal cap of unprotected resources, safe storage, 8–12h shield after being wrecked, matchmaking by base power.

## Base — the Workshop

- Assembly bay — machine slots
- Safe storage — protects resources from raids
- Lab — tech tree (moves, part modifiers)
- Radar — finds fat raid targets
- Turrets/fence — defense rating
- Clan market — part trading with clanmates

## Clans & Wars

- Clan = **Sector Gang** (up to 30). Tag on every machine.
- **Clan Titan:** the gang collectively builds a giant robot — everyone donates parts, upgrades nodes. Weekly titan-vs-titan battle the whole clan watches.
- **Sector wars:** map of zones, weekly cycle — member raids score points, captured sector buffs everyone's loot. Seasonal reset.
- **Rallies (сборы):** scheduled mass-assaults — bonus for mass online at a set hour. The core retention engine.
- **Weekend wars: fully manual real-time battles** — the only real-time PvP mode, limited to weekends to keep server load and hype concentrated.
- Chat: template phrases + emotes (cheap moderation).

## Monetization

**Rewarded ads (button-initiated only):** x2 raid loot, +1 raid ticket, -50% build/repair timer, shop reroll, second chance on defeat. Cap ~5–6 views/day.

**Donations (flex only, never power):** paint jobs, decals, muzzle effects, win animations, trash-talk emotes, nameplate on machine, profile frames, supporter title. Cheap seasonal pass with cosmetics (later).

**Never sell power** — the audience smells p2w and clan balance dies.

## Economy

- Coins — upgrades/buildings (faucet: battles/raids)
- Scrap/parts — machine assembly (faucet: loot, disassembly)
- Blueprints — rare, unlock part types (faucet: bosses, wars, season end)
- Sinks: post-battle repairs, disassembly, base upgrades

## MVP Scope

~20 parts, one chassis (car), assembly + manual fights vs ghosts, convoy raids, coins/scrap, 3 ad placements, basic skins. Then: PvP base raids, replays/sharing. Then: clans, titan, sector wars. Then: seasons.

## Risks

- **Game feel** — if the machine handles like soap, nothing saves it. Physics prototype first.
- **Build balance** — one meta-build kills the game. Sim thousands of build-vs-build fights before release.
- **Distribution** — low ARPDAU means paid UA never pays off; viral clips of physics fights are the growth channel.

## Metrics

D1 > 35%, D7 > 15%, ad opt-in > 40% DAU, clan join rate, replay share rate.

## Tech Notes

Shares ~60% of tech with VOID SALVAGE: parts system, physics engine, storage/workshop, raid structure. Prototype in HTML5 Canvas (see `void-salvage/prototype`), production engine TBD (Godot 4 candidate).
