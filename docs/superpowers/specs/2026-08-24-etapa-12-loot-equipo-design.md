# Etapa 12 — Loot & Equipo (gear con rareza)

## Problema / objetivo

Tras rediseñar el mundo (E11), la palanca de mayor impacto para hacerlo "adictivo"
es el **gear con rareza**: la cinta de correr de "una kill más". Convierte cada
enemigo en un tirón de recompensa ("¿me cayó algo mejor?"), le da sentido a las 5
zonas (loot mejor cuanto más profundo) y engancha con los trofeos que ya dropeaban.

## Diseño

**Gear = ItemTemplates de `type:"equipment"`** con `slot` (weapon/armor/accessory),
`rarity` (common→legendary, 5 tiers coloreados) y `bonuses` de stats planos
(pAtk/pDef/maxHp/maxMp). Modelo **template-based** (catálogo fijo, sin rolls por
instancia) → encaja con el inventario MapSchema existente sin estado por-instancia.

- `shared/src/equipment.ts` (nuevo): tipos EquipSlot/Rarity, EQUIP_SLOTS, SLOT_LABELS,
  RARITY_COLORS/LABELS, `isEquipment`/`getEquipSlot`/`getRarity`, y `equipmentBonuses(equipped)`
  (suma pura de bonuses, ignora slots vacíos e ids inválidos).
- Catálogo (items.ts): 14 piezas escaladas por zona — común (Bosque) → poco común →
  raro (Ruinas/mini-jefe) → épico (Yermo) → legendario (Rey Nihil). La **corona del
  jefe** (`skull_crown`) pasó de material a **accesorio legendario equipable** (el gran
  trofeo). Drops de equipo agregados a DROP_TABLES con chances bajas (raras = emoción);
  el mini-jefe y el jefe sueltan raros/legendarios casi garantizados. La tienda vende 2
  comunes (primera mejora garantizada con oro).

**Equipar** = mover el ítem del inventario a un slot; los bonuses se **suman a los
stats base de clase/nivel**. Server: `PlayerState.equipment` (MapSchema slot→itemId,
sincronizado), handlers `equipItem`/`unequipItem` (validan tipo/slot/posesión, hacen
swap devolviendo el anterior al inventario), y `recomputeStats(p)` = base + bonuses,
llamado tras equipar/desequipar, al cargar el save y **tras subir de nivel** (gainExp
resetea a la base, hay que re-aplicar el gear). Persistencia: columna jsonb `equipment`
(migración `add_equipment_column` aplicada), CharacterSave.equipment round-trip.

**UI**: `InventoryPanel` reescrito (tecla `i`) = paperdoll de 3 slots (equipado +
"Quitar") + stats efectivos (⚔/🛡) + lista de inventario con nombres de equipo
coloreados por rareza y botón "Equipar"/"Usar" según tipo (signature-guard anti-redibujo
por frame). El **loot de equipo brilla con el color de su rareza en el piso** (un
legendario canta desde lejos).

## Fuera de alcance (futuro)

- Gear visible en el modelo 3D (los KayKit no traen attach points simples).
- Stat rolls aleatorios por instancia / afijos (requiere estado por-instancia).
- Sets, sockets, upgrade/enchant.

## Verificación

246 tests (126 shared + 74 server + 46 client; nuevos: equipment.test, InventoryPanel.test,
4 E2E de equipo: equipar sube stat / desequipar restaura / swap devuelve el viejo / level-up
conserva el bonus). tsc estricto limpio 3 workspaces, build prod cliente OK. Equipo en vivo
(equipar y ver stats subir con otro cliente) = pendiente-usuario (sandbox WS).
