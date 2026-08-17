# Etapa 4b-2 — Tienda + pociones (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o executing-plans, task-by-task. Steps con checkbox (`- [ ]`).

**Goal:** Cerrar el loop económico. El oro que se gana con misiones/loot ahora **sirve para algo**: un **Mercader** en el pueblo vende **Pociones de Vida**; y las pociones **se pueden usar para curarse** (tecla `q` o clic en el inventario). Todo server-autoritativo.

**Architecture:** Config pura en `shared` (precio de tienda + cuánto cura la poción + protocolo `useItem`/`buyItem`). El server valida y aplica (gastar oro→agregar ítem; usar ítem→curar+descontar). El cliente agrega el NPC Mercader (reusa el patrón de `Npc.ts`), un panel de tienda, y el disparo de uso de poción; solo manda intención.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

## Global Constraints

- ESM, `strict: true`. TDD en lo puro (precio/curación/validación si se extrae). Server autoritativo: comprar/usar 100% server.
- Nuevos mensajes cliente→servidor: `buyItem {itemTemplateId, qty}` y `useItem {itemTemplateId}`. Sin más.
- Oro es la moneda (E4b-1, `player.gold`). Comprar descuenta `gold` y agrega al inventario (usa el helper `addToInventory`/mismo path que el pickup). Usar poción cura HP y descuenta 1 del inventario (borra la entrada si queda en 0).
- Gate de cercanía al pueblo (r≤4 de TOWN) para comprar (igual que interactNpc). Usar poción NO requiere cercanía (se usa en combate).
- No romper etapas previas.

---

## File Structure

```
shared/src/items.ts       (MODIFICAR) ItemTemplate.heal?: number (health_potion.heal=60); SHOP_PRICES + getShopPrice(id); SHOP_STOCK (ids a la venta)
shared/src/protocol.ts    (MODIFICAR) MessageType.UseItem/BuyItem; interfaces UseItemMessage{itemTemplateId} / BuyItemMessage{itemTemplateId, qty?}
shared/src/items.test.ts  (MODIFICAR/NUEVO) getShopPrice, heal de poción, SHOP_STOCK

server/src/rooms/GameRoom.ts (MODIFICAR) handler buyItem (gate pueblo + gold check → gold-=, addToInventory) ; handler useItem (tiene poción + no muerto + hp<maxHp → cura hasta maxHp, decrementa qty, borra si 0). Reusar el helper de stack de inventario existente.

client/src/render/Merchant.ts (NUEVO) NPC Mercader en el pueblo (reusa patrón de Npc.ts: mesh + nameplate "Mercader" + indicador "$"); expone object para raycast.
client/src/render/ShopPanel.ts (NUEVO) panel DOM (oculto por defecto) con el stock (nombre + precio + botón Comprar) y el oro actual; onBuy(itemTemplateId).
client/src/input/InputController.ts (MODIFICAR) raycast al Merchant (además del quest NPC) → onInteractMerchant (abre tienda).
client/src/render/InventoryPanel.ts (MODIFICAR) ítems consumibles clickeables → onUseItem(itemTemplateId).
client/src/net/NetworkClient.ts (MODIFICAR) sendBuyItem(id, qty) / sendUseItem(id).
client/src/main.ts (MODIFICAR) instanciar Merchant + ShopPanel; wire buy/use; tecla `q` → usar health_potion; refrescar oro en el panel de tienda.
```

---

### Task 1: Shared — config de tienda + curación + protocolo (puro, TDD)
**Files:** Modify `shared/src/items.ts`, `shared/src/protocol.ts`, `shared/src/index.ts`; test en `shared/src/items.test.ts`.
- `ItemTemplate` gana `heal?: number`. `health_potion.heal = 60`.
- `SHOP_PRICES: Record<string, number>` = { health_potion: 15 }. `getShopPrice(id): number` (lanza si no está a la venta). `SHOP_STOCK: string[]` = ["health_potion"].
- Protocolo: `MessageType.UseItem="useItem"`, `MessageType.BuyItem="buyItem"`; `interface UseItemMessage { itemTemplateId: string }`, `interface BuyItemMessage { itemTemplateId: string; qty?: number }`.
- [ ] Test RED (getShopPrice ok/throw, health_potion.heal===60, SHOP_STOCK incluye health_potion) → implementar → GREEN (`npm test --workspace @aden/shared`). Preservar MessageType existentes (incl. InteractNpc).
- [ ] Commit `feat(shared): config de tienda (precios) + curacion de pocion + protocolo useItem/buyItem`.

### Task 2: Server — handlers buyItem + useItem
**Files:** Modify `server/src/rooms/GameRoom.ts`.
- **buyItem**: `p=players.get(sid)`; si `p.dead` return; gate cercanía pueblo (r≤4, como interactNpc); `qty=max(1, msg.qty??1)`; `price=getShopPrice(id)*qty` (try/catch si id no está a la venta → return); si `p.gold>=price` → `p.gold-=price`, agregar `qty` al inventario (mismo path/stack que el auto-pickup de materiales). Si no alcanza, no-op.
- **useItem**: `p=players.get(sid)`; si `p.dead` return; `t=getItem(id)`; si `t.type!=="consumable"` o `!t.heal` return; buscar la entrada de inventario; si qty≥1 y `p.hp<p.maxHp` → `p.hp=min(p.maxHp, p.hp+t.heal)`, decrementar qty (borrar entrada si 0). Si hp==maxHp o no tiene, no-op.
- [ ] `npx tsc` + `npm test --workspace @aden/server` (existentes verdes). Boot OK.
- [ ] Commit `feat(server): comprar en el mercader y usar pociones para curar`.

### Task 3: Client — Mercader, panel de tienda, uso de poción
**Files:** Create `client/src/render/Merchant.ts`, `client/src/render/ShopPanel.ts`; Modify `InputController.ts`, `InventoryPanel.ts`, `NetworkClient.ts`, `main.ts`.
- `Merchant.ts`: NPC en el pueblo (posición distinta al Anciano, p.ej. offset +3 en x), nameplate "Mercader" + indicador "$" (dorado). Expone `object`.
- `ShopPanel.ts`: panel fijo (oculto), lista `SHOP_STOCK` con `getItem(id).name` + `getShopPrice(id)` + botón "Comprar"; muestra el oro; `toggle()/open()/close()`; callback `onBuy(id)`. `updateGold(g)`.
- `InputController`: raycast al Merchant (antes que mobs/suelo, junto al quest NPC) → `onInteractMerchant()`.
- `InventoryPanel`: ítems `consumable` con botón/click "Usar" → `onUseItem(id)`.
- `NetworkClient`: `sendBuyItem(id, qty=1)`, `sendUseItem(id)`.
- `main.ts`: instanciar Merchant + ShopPanel; `onInteractMerchant` = abrir tienda (si estás cerca; si no, toast "acercate al Mercader"); `onBuy` = `net.sendBuyItem(id)` + toast; tecla `q` → `net.sendUseItem("health_potion")` (+ toast si no tenés/está a full, en base al estado local); refrescar `shopPanel.updateGold(self.gold)` en el loop.
- [ ] `npx tsc -p client/tsconfig.json` + `npm run build --workspace @aden/client`.
- [ ] Commit `feat(client): mercader, panel de tienda y uso de pociones (tecla q / inventario)`.

### Task 4: Verificación (controller)
- [ ] E2E (script/colyseus.js o test de integración @colyseus/testing): (a) comprar — con gold suficiente, `buyItem` baja el oro por el precio y agrega la poción al inventario; sin gold, no-op. (b) usar — con poción y hp<maxHp, `useItem` sube hp (hasta maxHp) y baja la poción; a full hp, no-op. Documentar PASS/FAIL.
- [ ] Boot del cliente sin errores; Mercader + tienda renderizan (visual lo confirma el usuario).

---

## Self-Review
- **Oro sirve:** Tasks 1–3 (comprar pociones con gold).
- **Pociones usables:** Tasks 2–3 (heal + descuento; tecla q / inventario).
- **Server autoritativo:** comprar/usar 100% server; cliente manda intención.
- **Fuera de alcance:** vender ítems al mercader; más stock (equipo/armas); clases/skills (E5); deploy (E4c).
