# Enemy level difficulty — implementation plan

Goal: make enemy level meaningful, preserve the easy start and strengthen later bosses within the remaining usage budget.
Spec: ../specs/2026-09-23-campana-y-dificultad-design.md
Execution: inline, authorized by the user's request to implement as much as possible now.

Constraints: preserve existing working changes, XP curve, accounts and inventory. PvE rules must cover direct damage, poison, reflection and control without altering PvP. Keep levels fixed and visible before combat.

- [x] Shared: add `enemyDifficulty.ts`, explicit template levels and rank. `pvePower(playerLevel, enemyLevel)` returns outgoing and incoming factors. A six-level gap blocks attacks/control (including damage-over-time), with a clear skull warning. Test thresholds, monotonicity, every template and campaign reachability.
- [x] Server: synchronize level/rank at spawn; apply factors to all PvE paths in GameRoom, including hazards. Reset health and debuffs when a hostile encounter leashes. Test actual room connections and attempts with low-level high-stat characters.
- [x] Client: display level/rank/threat above mobs and in the boss header. Update color when the local player levels. Test DOM presentation and serialized data.
- [x] Encounters: move the level-7 forest beast away from the required Alpha route. Raise later boss health/attack and give Nihil a fixed-position, avoidable area attack with faster cadence below half health. Test geometry, cadence and the unchanged opening.
- [x] Verification: run all tests, three TypeScript checks and client production build. Independent review of touched combat paths. Document delivered features and the campaign expansion still outstanding.

Ruling: keep this checkout and create a feature branch because the user's in-progress trade/appearance changes are required baseline; creating a clean worktree would omit them. Do not commit mixed pre-existing code changes.
Ruling: implement a deterministic overwhelming-level rule instead of an unbounded numeric reduction: a gap of six levels cannot be bypassed by infinite kiting or fixed poison. The UI must explicitly explain this restriction. At five levels below, preparation can still matter.
Review focus: DoT bypass, reflected damage, control locking, stale UI at level-up, dungeon resets and quest gates.

Verification: 682 tests green, all three TypeScript checks and production build passed. Fresh review found ranged Nihil could avoid engagement; regression observed RED then fixed GREEN. Preserved poison attribution after caster departure and tested actual ranged retaliation. Campaign expansion progressed to the separately documented Veil prologue. See docs/campaign-delivery-2026-09-23.md for scope and outstanding work.
