# Marismas: first playable slice

Authorized by the approved campaign direction and the request to use the remaining budget. Implement the spec's first playable slice: Rowan → Maera → two caravan clues → raiders → guardian → reward. Add Boren's supply shop, fixed enemy levels, regional NPC validation, map navigation and presentation. Preserve the existing twelve quests and saved `campaign_complete`; Rowan explicitly starts the new expedition without repeating Nihil's rewards.

Ruling: ship one complete regional prologue before the Monastery. Represent ordered clues as separate quests so existing authoritative, persisted questId/progress can safely track them without a save migration. The Monastery was subsequently implemented in its own plan; optional contracts remain future work.

Checks: room integration for old completion, regional proximity, wrong receiver, distinct clues, repeated rewards and persistence projection; navigation and content integrity; client guidance; full suites, TypeScript and build. Reuse existing animated models with distinct appearances; no external assets required.

Completed: five quests, two NPCs, map/nav/presentation/music, shop and delivery validation. Fresh scoped review found no important defects; its coverage observation was addressed by exercising actual room combat for raider and guardian quest credit. At this milestone, 682 tests, TypeScript and production build passed. Browser verified Maera dialogue, reward and next marker. Subsequent Monastery and potion work is recorded separately; full five-class balance runs remain pending.
