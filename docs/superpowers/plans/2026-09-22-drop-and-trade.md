# Drop and trade implementation plan

**Goal:** Drop inventory items onto public ground and exchange items and gold between nearby players.

**Architecture:** Reuse ground loot for drops. A server-only TradeSystem owns invitations, versioned offers and confirmations; only participants receive its snapshots. Inventory stays unchanged until a synchronous, fully validated exchange. Reuse the existing inventory, item identities, persistence and visual theme.

**Constraints:** No new dependencies or inventory slot limit. Spanish UI. Preserve equipment instance IDs and options. Only bag items can be transferred. Never automatically pick up one's own discarded items; explicit pickup remains possible. No currency drop button. Trade requires living, loaded players within 5 units in the same map; one session each, 30-second invitation and 2-minute trade timeout. Maximum 20 item entries, 10,000 units per entry. Offer edits clear both confirmations; confirmation includes session ID and offer revision. Expiry, distance, death and disconnect cancel without moving assets. Invalid or stale requests cannot transfer assets.

**UI:** Existing dark green panels, parchment text, gold accents and Cinzel/Crimson typography. Inventory gets quantity + drop confirmation. A Trade button beside Party opens nearby players; accepted trades show parallel offers, editable own items/gold, saved offer status, confirm and cancel. On narrow screens the offers stack. Pending edits disable confirmation.

## Tasks

- [x] Write and run failing server tests for dropping stacks, preserving instances, pickup exclusion and invalid quantities.
- [x] Implement drop protocol, server validation, room handler and inventory controls.
- [x] Write and run failing trade tests for handshake, exchange, stale revisions, changed resources, invalid inputs and cancellation.
- [x] Implement TradeSystem and room lifecycle/protocol integration.
- [x] Write client tests, then add network state and responsive TradePanel with inventory quantities and mutual confirmation.
- [x] Exercise two real Colyseus clients, cancellation/disconnect and persistence; run all tests, TypeScript and production build. Inspect browser layout and document controls and limits.

## Review and verification

Review expanded persistence work to atomic batch upserts, ordered writes with failed-row retention, canonical account locks across rooms, and keeping empty rooms alive until failed departure saves succeed. Regression tests cover these failure paths. Existing auth tests now disconnect the original session before testing login; the party persistence-delay test exercises the new batch API. UI review added full item option inspection and preservation of typing during delayed save acknowledgements.

Final suite: 187 shared + 245 server + 228 client = 660 passing. TypeScript passes in all three packages; Vite production build passes with its existing large-bundle warning. Two actual browser players completed item-for-gold trade and inventory drop; no page errors and no mobile panel overflow. Documentation: `docs/drop-and-trade.md`. No deployment or external database changes.
