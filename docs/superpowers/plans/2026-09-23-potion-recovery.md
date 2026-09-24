# Potion recovery

Finish the approved difficulty design within the remaining account allowance: separate shared eight-second recovery for HP and MP potions, enforced by the server across item variants and reconnects. Keep a process-wide account expiry registry (bounded by eight seconds of recent use), restore remaining time on join and sync it to the HUD. Only a successful use consumes an item or starts recovery. Other consumables are unaffected. Q selects a usable HP potion appropriate to missing life, including greater/catalog variants.

Verify with fake-clock registry tests, real room messages rejecting alternate sizes without consumption, MP independence, expiry, full-resource rejection and reconnect retention. Existing item, room and UI suites, TypeScript and production build must remain green. No new persistence schema; a server process restart clears these short-lived recovery timers.

Completed and independently reviewed with no important findings. Red tests observed for the previously missing timers and successful second-size consumption; now registry, room/reconnect, selection and HUD tests pass. Full suite: 695 tests. TypeScript and production build pass. Process-local expiry scope is documented in the delivery report.
