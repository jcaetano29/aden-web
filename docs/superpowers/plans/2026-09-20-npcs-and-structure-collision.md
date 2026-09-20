# NPCs and structure collision implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement and review each independently testable task.

**Goal:** Distinct animated NPCs and solid world structures respected by movement.
**Architecture:** Shared structure footprints drive scene geometry and server navigation. Existing animated character assets provide personalized service NPCs.
**Tech Stack:** TypeScript, Three.js, Colyseus, Vitest.
**Spec:** ../specs/2026-09-20-npcs-and-structure-collision-design.md

## Constraints
- Preserve NPC IDs and interactions, paths, gates and map transitions.
- No new external assets or vertical physics.
- Server-authoritative movement; displacement skills cannot cross walls.

## Task 1: NPC appearance
- [x] Inspect rigs, clips and service NPC interfaces; verify a representative model in the browser.
- [x] Add shared NpcAppearance wrapper around CharacterFactory.create with per-role accessories, materials and animation.
- [x] Replace primitive bodies in Npc, Merchant and ServiceNpc; pass the loaded factory from main. Preserve interaction roots and indicators.
- [x] Verify material isolation, role identity, animation and readability; build and inspect a local preview.

## Task 2: Structure definitions and collision geometry
- [x] Extract positions, dimensions and rotations of solid town and dungeon structures to shared data consumed by renderers.
- [x] Add point, segment, nearest-walkable and route queries for inflated 2D footprints.
- [x] Test thin walls, rotated buildings, open gates, enclosed targets and routes around corners; run failing tests before implementation.

## Task 3: Movement integration
- [x] Route server players and mobs around shared obstacles; cache routes outside replicated state and validate every segment.
- [x] Clip dash displacement, validate spawn/respawn/teleport and handle saved positions inside solids.
- [x] Apply shared queries to ambient walkers; verify access to service NPCs.
- [x] Run focused regression tests then full relevant suites and builds. Inspect visual NPCs and structure alignment.

## Task 4: Review
- [x] Review changes for correctness, collision bypasses and unintended behavior changes.
- [x] Resolve findings, rerun affected checks, report remaining limitations honestly.

## Verification record

- Full Vitest suite: 66 files, 419 tests passed.
- Client, shared and server TypeScript checks passed; server uses repository rootDir for workspace imports.
- Production Vite build passed; existing large-bundle warning remains.
- Independent navigation and structure reviews completed. Fixed retarget loss and atomic rejection of blocked charges with regressions.
- NPC appearance inspected front/rear and from game camera; local world preview validates authored structures and safe routes.
- Three older combat fixtures moved from outside their map / inside the fountain onto valid ground; combat assertions preserved.
- Shared collision footprint includes major architecture. Vegetation and small decorative props remain nonblocking by design.
- No commit, push or deployment performed for this change.
