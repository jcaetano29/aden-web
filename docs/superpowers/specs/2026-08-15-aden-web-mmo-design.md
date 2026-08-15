# Aden Web — MMO web low-poly estilo Lineage 2 (Diseño v1)

**Fecha:** 2026-08-15
**Estado:** Aprobado para planificación
**Working title:** Aden Web

## 1. Visión

Construir el primer MMO jugable en navegador con estética "vieja escuela" 3D
low-poly (PS1/PS2), inspirado en Lineage 2. La v1 entrega el **núcleo MMO
mínimo**: un mundo 3D compartido en tiempo real donde varios jugadores se ven,
se mueven con click-to-move, matan mobs con combate target-based, ganan EXP,
suben de nivel y juntan loot. La arquitectura queda preparada para crecer por
etapas (clases, equipo, PvP, clanes, sieges) sin reescrituras.

Principio rector: **salir rápido y que sea bueno**. Server autoritativo para que
sea un MMO real, no un juego local disfrazado.

## 2. Alcance

### En v1 (núcleo MMO mínimo)
- Login simple por nombre (crea/recupera personaje).
- Un mapa: pueblo seguro (spawn/respawn) + campos de caza con mobs.
- Movimiento click-to-move validado por el servidor.
- Ver a otros jugadores moverse en tiempo real (con animaciones).
- Combate target-based: auto-attack + 1 skill activa ("Power Strike").
- Mobs con spawn zones, wander, aggro por proximidad, persecución, muerte,
  respawn.
- EXP y subida de nivel (stats suben al subir).
- Loot: drop al piso → pickup → inventario.
- Muerte → respawn en el pueblo.
- HUD: barras HP/MP, EXP, target frame, nameplates.
- Persistencia en Supabase (personaje, posición, nivel, EXP, inventario).

### Fuera de v1 (etapas futuras, pero el diseño de datos lo soporta)
Clases, elección de clase, equipar armas/armadura con cambio de stats, barra de
múltiples skills, pociones, chat, comercio, PvP, clanes, más mapas, castle
sieges, penalización de EXP por muerte, anti-cheat avanzado.

### Explícitamente NO objetivo
Escalar a miles de jugadores simultáneos, sharding de mundo, matchmaking, o
economía global. Se aborda si/cuando el producto lo justifique.

## 3. Stack técnico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Cliente render | TypeScript + Three.js + Vite | 3D en navegador, low-poly, HMR rápido |
| HUD | HTML/CSS overlay | Simple, testeable, sin peso 3D |
| Red | Colyseus (WebSockets) | Server autoritativo, state sync con deltas, salas, interpolación built-in |
| Servidor | Node.js + Colyseus, game loop ~15 Hz | Autoritativo: valida movimiento, resuelve combate, corre IA |
| Persistencia | Supabase (Postgres) | Cuentas/personajes/inventario; guardado periódico + on-disconnect |
| Assets | glTF/GLB CC0 (KayKit, Quaternius, Kenney) | Low-poly con animaciones, licencia libre sin atribución obligatoria |

**Modelos concretos a sourcear (todos CC0):**
- Personajes jugables: **KayKit Adventurers** (idle/walk/run/attack animados).
- Monstruos: **Quaternius Ultimate Animated Monsters** (animados, glTF).
- Naturaleza/props/tiles: **Kenney** + **Quaternius Nature**.
- Se guarda `assets/LICENSES.md` con fuente + licencia de cada asset.

## 4. Reglas del juego (estilo L2)

### Movimiento
- Click en el terreno → el personaje camina hacia ese punto.
- Servidor valida velocidad y colisiones básicas; el cliente interpola.
- v1: mapa mayormente plano, navegación por línea recta con bloqueo por props;
  navmesh se puede agregar después sin cambiar el protocolo.

### Combate (target-based)
- Click en un mob → se fija como target → auto-attack cuando está en rango.
- Auto-attack se repite por timer de `atkSpeed`.
- 1 skill activa: **Power Strike** (golpe fuerte con cooldown y coste de MP).
- Todo resuelto en el servidor.

**Fórmula de daño (estilo L2, simplificada):**
```
damage = (pAtk * factorSkill) / max(1, pDef) * variance
variance ∈ [0.9, 1.1]   (aleatorio server-side)
factorSkill = 1.0 para auto-attack, mayor para Power Strike
```

### Stats
- `hp`, `mp`, `pAtk`, `pDef`, `level`, `exp`, `atkSpeed`, `moveSpeed`.
- Al subir de nivel: HP/MP máximos y pAtk/pDef aumentan por una curva fija.

### EXP y nivel
- Curva empinada estilo L2: `expToNext(level) = base * level^2.5` (constantes a
  afinar en implementación).
- Matar un mob otorga EXP fijo por template de mob.

### Mobs (IA)
- Estados: `idle/wander → aggro → chase → attack → dead → respawn`.
- Aggro por proximidad (radio configurable por template).
- Al morir: otorga EXP al killer, tira loot según drop table, respawnea tras
  timer en su spawn zone.

### Loot
- Cada mob template tiene una drop table: `[{ itemTemplateId, chance, qty }]`.
- Ítem cae al piso como entidad → jugador camina/clickea → va al inventario.
- v1 ítems: consumibles/materiales simples (sin equipar todavía), pero el
  esquema de item ya distingue `type` (consumable/weapon/armor/material) para
  soportar equipo después.

### Muerte del jugador
- HP a 0 → respawn en el pueblo con HP/MP parcial. Sin penalización de EXP en
  v1 (campo listo en datos para activarla luego).

## 5. Mundo v1

Un mapa con dos regiones:
- **Pueblo (zona segura):** punto de spawn/respawn. Sin mobs hostiles.
- **Campos de caza:** varias spawn zones con mobs de bajo nivel.

Terreno low-poly (plano con relieve suave), props CC0 (árboles, rocas, casas),
límites del mapa que bloquean salir.

## 6. Arquitectura modular

```
/shared    Tipos, protocolo de mensajes, constantes, fórmulas de combate/EXP.
           Importado por cliente y servidor → una sola fuente de verdad.
/server    Sala Colyseus + sistemas independientes:
             - MovementSystem   valida y aplica movimiento
             - CombatSystem     auto-attack, skills, daño, muerte
             - MobAISystem      máquina de estados de mobs
             - SpawnSystem      gestiona spawn zones y respawns
             - LootSystem       drop tables, ítems en el piso, pickup
             - PersistenceService  carga/guarda personajes en Supabase
/client    - Renderer (Three.js scene, cámara, luces)
             - EntityViews      mapea estado de red → modelos 3D + animaciones
             - InputController  click-to-move, selección de target, skill
             - NetworkClient    conexión Colyseus, envío de inputs
             - HUD              barras HP/MP/EXP, target frame, nameplates
/assets    Modelos glTF/GLB + manifest.json + LICENSES.md
/db        Migraciones/schema Supabase
```

**Fronteras:** cada sistema del servidor opera sobre el estado compartido de la
sala a través de interfaces claras; se pueden testear con estado mockeado sin
red ni render. El cliente nunca decide resultados de juego: solo envía inputs y
renderiza el estado que llega.

### Modelo de datos (Supabase, resumen)
- `accounts` (id, name, created_at) — v1 login por nombre.
- `characters` (id, account_id, name, level, exp, hp, mp, pos_x, pos_y, pos_z,
  class_id nullable, updated_at).
- `item_templates` (id, name, type, stats_json, stackable).
- `inventory_items` (id, character_id, item_template_id, qty, equipped_slot
  nullable).

`class_id` y `equipped_slot` van nullable en v1 para soportar clases/equipo
después sin migración disruptiva.

### Protocolo de red (mensajes)
- Cliente→Servidor: `moveTo(x,z)`, `setTarget(entityId)`, `useSkill(skillId)`,
  `pickup(itemEntityId)`.
- Servidor→Cliente: estado sincronizado de la sala (jugadores, mobs, ítems en
  piso, HP/target de cada uno) vía schema de Colyseus + eventos puntuales
  (`damage`, `levelUp`, `death`, `loot`).

## 7. Manejo de errores
- **Desconexión:** al desconectar, se persiste el personaje; al reconectar se
  recarga desde Supabase.
- **Inputs inválidos:** el servidor ignora movimientos/acciones fuera de rango o
  en cooldown; nunca confía en el cliente.
- **Fallo de persistencia:** reintentos con backoff; el juego sigue en memoria y
  se re-sincroniza cuando Supabase responde (no se tira la sesión por un guardado
  fallido).
- **Asset faltante:** el cliente cae a un placeholder (cubo) y loguea el asset
  faltante, sin romper la escena.

## 8. Testing
- **`/shared`:** tests unitarios de fórmulas (daño, EXP-to-level) — puras,
  fáciles de cubrir.
- **`/server`:** tests de cada sistema con estado mockeado (CombatSystem aplica
  daño correcto, MobAISystem transiciona estados, LootSystem respeta chances con
  RNG inyectable, SpawnSystem respawnea). Un test de integración de sala:
  conectar cliente simulado, moverse, matar un mob, verificar EXP/loot.
- **`/client`:** lógica testeable (mapping de estado→vista, input→mensaje)
  separada del render para poder testear sin WebGL.
- Enfoque TDD por sistema durante la implementación.

## 9. Roadmap por etapas

- **Etapa 0 — Esqueleto de red:** monorepo armado (shared/server/client),
  sala Colyseus vacía, un jugador (cubo) que se mueve y se sincroniza entre dos
  navegadores. Valida el netcode extremo a extremo.
- **Etapa 1 — Mundo 3D:** terreno + carga de modelos glTF + click-to-move con
  animaciones (idle/walk), múltiples jugadores visibles con nameplates.
- **Etapa 2 — Combate:** mobs con spawn/wander/aggro/chase/attack, auto-attack +
  Power Strike, daño autoritativo, muerte de mob y de jugador, respawn.
- **Etapa 3 — Progresión:** EXP/subida de nivel, drop tables, ítems en piso,
  pickup, inventario, y persistencia en Supabase (load on join / save periódico
  + on disconnect).
- **Etapa 4 — v1 pulida:** pueblo/zona segura, HUD completo (HP/MP/EXP/target),
  balance básico, y **deploy** (cliente en Vercel, servidor de juego en
  Railway/Render).
- **Futuro:** clases, equipo, barra de skills, pociones, chat, comercio, PvP,
  clanes, más mapas, sieges, penalización de EXP por muerte.

## 10. Deploy / hosting
- Desarrollo **local primero**: un comando levanta server + cliente.
- Producción: **cliente estático → Vercel**; **servidor de juego (proceso Node
  persistente con game loop + websockets) → Railway o Render** (Vercel serverless
  no sirve para el loop persistente). Supabase gestionado aparte.
- El deploy se ejecuta en la Etapa 4; la arquitectura queda cloud-ready desde el
  inicio (config por variables de entorno, sin hardcodear hosts).

## 11. Riesgos y mitigaciones
- **Netcode es lo más difícil:** por eso la Etapa 0 aísla y valida la sincronía
  antes de sumar arte/gameplay.
- **Peso de assets 3D:** usar low-poly CC0, GLB comprimido (Draco si hace falta),
  carga diferida.
- **Cheating (cliente autoritativo):** mitigado por diseño — el servidor es la
  única autoridad; el cliente solo manda intención.
- **Scope creep:** el roadmap por etapas y el "fuera de v1" acotan cada ciclo.
