# Boren optional contracts

User explicitly requested continuing with the final 3% allowance. Finish the three already-designed optional errands: provisions in the marsh, a missing traveler's identity, and an archive tool. Keep them independent of Rowan/Maera/Iria and Varek's repeating bounties. One contract at a time; each requires a distinct reusable world object and a nearby Boren turn-in. No EXP required or awarded. Rewards: healing supplies, mana supplies, and a fixed defensive accessory suitable for every class.

Store contract ID/progress in the existing optional progress JSON, with defaults for old saves. Boren's dialog offers both contract service and shop access. Show the active errand when talking to Boren; main campaign tracking keeps its focus. Verify ordered objectives, main/bounty independence, regional range validation, save projection, full reconnect recovery and one-time rewards. Run appropriate regression suites, types/build, and scoped review before reporting.

Completed. Full suite 699 passing tests; all three TypeScript checks and production build passed. Real room tests cover the three turn-ins, reconnect mid-errand, no duplicated finale reward, rejected remote NPC interaction and unchanged main/bounty progress. Shared tests verify each objective's navigation and rewards. Dialog test verifies shop action remains separate and does not leak to other NPCs. Scoped independent review found no important issues.

Browser verified Boren's two actions, accepting the first errand and the secondary tracker alongside the main campaign. No console errors. Remaining tuning: complete five-class/group playthroughs and economic pacing; no claim of those sessions being completed.
