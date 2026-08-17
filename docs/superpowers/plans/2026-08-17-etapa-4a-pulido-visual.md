# Etapa 4a — Pulido visual (loot visible, entorno, cámara) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el juego SE VEA lindo y el loot se vea. Tres cosas, según feedback del usuario: (1) el loot es invisible porque el auto-pickup lo levanta en el mismo tick que cae (matás en rango de melee = rango de pickup) → agregar un **delay de pickup** para que el ítem aterrice, brille y recién ahí se levante, y hacerlo más grande/brillante; (2) el entorno es "feo" (piso plano vacío) → **entorno procedural** estilo vieja escuela: domo de cielo con gradiente, niebla, iluminación cálida, y árboles/rocas/pasto low-poly esparcidos; (3) la cámara sigue "tosca" (teletransporta) → **suavizar el follow** (carry-forward de la Etapa 1).

**Architecture:** Cambio chico en el server (delay de pickup, config en shared). El resto es cliente: un `Environment.ts` que arma cielo/niebla/luces/props procedurales (sin descargas — geometrías Three.js low-poly, colocadas determinísticamente); ajustes al render de loot (`GroundItems`); y suavizado de `Renderer.followTarget`. Server sigue autoritativo; el delay de pickup es server-side.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js 0.160, Vitest.

**Spec:** feedback del usuario (2026-08-17): "el loot no se ve, el entorno no es lindo".

## Global Constraints

- ESM, `strict: true`. TDD en lo puro (delay/pickable, colocación determinística de props si se extrae un helper).
- Server autoritativo: el delay de pickup es server-side; el cliente solo renderiza. Sin nuevos mensajes cliente→servidor.
- Entorno **procedural, sin assets externos** (geometrías Three.js): robusto, controlable, estilo low-poly "vieja escuela".
- Colocación de props **determinística** (seed fija) para que todos los clientes vean el mismo bosque, y **fuera del pueblo** (radio SAFE_RADIUS alrededor de TOWN 0,0) y de las spawn zones para no tapar el gameplay.
- No romper etapas previas. Config nueva en `shared`.

---

## File Structure

```
shared/src/items.ts               (MODIFICAR) PICKUP_DELAY_MS
server/src/state/DroppedItemState.ts (MODIFICAR) pickDelayMs (server-only, cuenta atrás)
server/src/rooms/GameRoom.ts      (MODIFICAR) init pickDelayMs al dropear; tick lo descuenta; auto-pickup requiere pickDelayMs<=0

client/src/render/GroundItems.ts  (MODIFICAR) mesh más grande + halo/luz + bob más marcado
client/src/render/Environment.ts  (NUEVO) domo de cielo con gradiente, niebla, luces (hemi+dir cálida), props procedurales (árboles/rocas/pasto) esparcidos
client/src/render/Renderer.ts     (MODIFICAR) followTarget suavizado (lerp por frame) + integrar Environment (fog/sky en la escena)
client/src/main.ts                (MODIFICAR) instanciar Environment
```

---

### Task 1: Server — delay de pickup (loot visible)

**Files:** Modify: `shared/src/items.ts`, `server/src/state/DroppedItemState.ts`, `server/src/rooms/GameRoom.ts`

**Interfaces:**
- `PICKUP_DELAY_MS = 1500` en shared.
- `DroppedItemState` gana plano server-only `pickDelayMs = 0`.

- [ ] **Step 1 (shared, TDD-lite):** agregar `export const PICKUP_DELAY_MS = 1500;` a `items.ts`. (Opcional: un test que verifique `PICKUP_DELAY_MS > 0` en `items.test.ts`.)
- [ ] **Step 2 (server state):** `DroppedItemState` agrega `pickDelayMs = 0;` (plano, sin @type — el delay es server-only; el cliente no lo necesita).
- [ ] **Step 3 (server tick):** al dropear en `killMob`, `item.pickDelayMs = PICKUP_DELAY_MS`. En el tick: descontar `it.pickDelayMs -= dtMs` (donde ya se descuenta `despawnMs`). En el auto-pickup, agregar la guarda: solo es pickable si `it.pickDelayMs <= 0` (además de estar en rango). Así el ítem queda visible ~1.5s antes de poder levantarse.
- [ ] **Step 4:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspaces --if-present` (existentes verdes). Boot OK.
- [ ] **Step 5: Commit** `git commit -m "feat(server): delay de pickup para que el loot sea visible"`.

---

### Task 2: Client — loot más visible (mesh + halo)

**Files:** Modify: `client/src/render/GroundItems.ts`

- [ ] **Step 1:** Agrandar el mesh (octaedro 0.35 → ~0.5) y subir `emissiveIntensity` (0.25 → ~0.6). Bob más marcado (BOB_HEIGHT 0.12 → ~0.2). Opcional: agregar un `THREE.PointLight` chico del color del ítem adjunto al mesh (radio corto, intensidad baja) para que "brille" en el piso; o un anillo/halo en el suelo bajo el ítem. Mantener el dispose correcto en `remove` (incluida la luz/halo si se agrega).
- [ ] **Step 2:** `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 3: Smoke** — matar un mob: el ítem queda visible en el piso ~1.5s (por el delay del server), grande y brillante, antes de levantarse. Verificar por estado/DOM (el ítem persiste en `droppedItems` durante el delay) + consola limpia.
- [ ] **Step 4: Commit** `git commit -m "feat(client): loot mas grande y brillante"`.

---

### Task 3: Client — entorno procedural (cielo, niebla, luces, props)

**Files:** Create: `client/src/render/Environment.ts`; Modify: `client/src/render/Renderer.ts`, `client/src/main.ts`

**Interfaces:**
- `Environment` (constructor `(scene: THREE.Scene)`): arma y agrega a la escena:
  - **Domo de cielo:** una `SphereGeometry` grande (radio ~200, `side: BackSide`) con un material de gradiente vertical (ShaderMaterial simple o vertex-colors) de celeste a un tono más claro en el horizonte.
  - **Niebla:** `scene.fog = new THREE.Fog(color, near, far)` (color acorde al horizonte) para dar profundidad y ocultar el borde del mundo.
  - **Luces:** `HemisphereLight` (cielo/tierra) + `DirectionalLight` cálida en ángulo (sol), reemplazando/ajustando la iluminación actual del `Renderer` (coordinar para no duplicar luces — si `Renderer` ya agrega ambient/dir, `Environment` las ajusta o el Renderer delega en Environment).
  - **Props procedurales low-poly**, colocados con un RNG **seedeado fijo** (para que todos los clientes vean lo mismo), dentro de MAP_BOUNDS (±50) pero **excluyendo** el pueblo (≤ SAFE_RADIUS de TOWN 0,0) y sin taparse entre sí:
    - **Árboles:** tronco (`CylinderGeometry` marrón) + copa (`ConeGeometry` verde, 1-2 conos apilados) → pino low-poly. ~30-40.
    - **Rocas:** `IcosahedronGeometry`/`DodecahedronGeometry` gris, escala/rotación random. ~15-20.
    - **Matas de pasto:** unos pocos conos/planos verdes chicos, o parches. Opcional.
  - Reusar geometrías/materiales compartidos entre instancias del mismo prop (una geo por tipo) para performance; `InstancedMesh` es ideal si es fácil, si no, meshes normales con geo compartida.
- El **piso** existente (100×100) puede recibir un color/material más lindo (verde apagado tipo pasto) — ajustarlo en `Renderer` o `Environment`.

- [ ] **Step 1:** Implementar `Environment.ts` (sky dome + fog + luces + props seedeados). Usar una función RNG determinística (p.ej. mulberry32 con seed fija) para las posiciones.
- [ ] **Step 2:** En `Renderer`/`main`: instanciar `Environment(renderer.scene)` tras crear el renderer; asegurar que la niebla y el color de fondo combinen (setear `renderer` clear color / `scene.background` al color del cielo o dejar el domo). Evitar doble iluminación (consolidar luces).
- [ ] **Step 3:** `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 4: Smoke** — la escena tiene cielo con gradiente, niebla, árboles y rocas esparcidos (fuera del pueblo), iluminación cálida. Los personajes/mobs siguen visibles y bien iluminados. Consola limpia; sin caída de FPS notable (introspección de que los meshes se crearon; el pixel lo confirma el usuario).
- [ ] **Step 5: Commit** `git commit -m "feat(client): entorno procedural (cielo, niebla, luces, arboles y rocas)"`.

---

### Task 4: Client — cámara follow suavizada

**Files:** Modify: `client/src/render/Renderer.ts`

- [ ] **Step 1:** `followTarget(x, z)` hoy hace `camera.position.set(...)` directo (teletransporta). Cambiar a un lerp por frame hacia la posición objetivo (`target + offset`), guardando el estado y usando `smoothTowards`/lerp con dt (o un factor por frame). Necesita el `dt` — pasar dt a `followTarget(x, z, dt)` o guardar un target y suavizar en `render()`. Mantener el `lookAt` al jugador. Resultado: la cámara sigue al jugador con suavidad, sin saltos.
  - Reusar `smoothTowards` de `@aden/shared` (frame-rate independiente) para cada componente de la posición de cámara.
- [ ] **Step 2:** Ajustar el llamador en `main.ts` (pasar `dt` si cambia la firma).
- [ ] **Step 3:** `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 4: Smoke** — la cámara sigue al jugador suavemente (verificable: la posición de cámara converge hacia target+offset por frame en vez de saltar). Consola limpia.
- [ ] **Step 5: Commit** `git commit -m "fix(client): camara follow suavizada (lerp)"`.

---

### Task 5: Verificación (controller)

- [ ] **Step 1: Delay de pickup (E2E/estado)** — levantar server; un cliente mata un mob y verificar por estado que el ítem del piso **permanece** en `droppedItems` durante ~1.5s (el `PICKUP_DELAY_MS`) antes de ser recogido (a diferencia de antes, que se recogía al instante). Documentar PASS/FAIL.
- [ ] **Step 2: Boot del cliente** — carga sin errores; `Environment` crea el domo/luces/props sin excepción; el build es OK. (La belleza del entorno y la suavidad de cámara las confirma el usuario visualmente.)

---

## Self-Review (cobertura vs feedback)

- **Loot no se ve (feedback):** Tasks 1,2 (delay de pickup + mesh más visible).
- **Entorno feo (feedback):** Task 3 (cielo, niebla, luces, árboles/rocas procedurales).
- **Cámara tosca (carry-forward E1 + feedback):** Task 4 (follow suavizado).
- **Server autoritativo / sin protocolo nuevo:** el delay es server-side; el resto es render cliente.
- **Fuera de alcance:** misiones/pueblo/NPC/economía (Etapa 4b, elegida por el usuario); deploy (Etapa 4c). Assets 3D externos de naturaleza (se usa procedural).

**Placeholder scan:** los steps con lógica traen el cambio concreto; el entorno se describe con precisión (domo, fog, luces, props seedeados fuera del pueblo).
**Type consistency:** `PICKUP_DELAY_MS` shared usado por server; `Environment`/`GroundItems`/`Renderer` client; `smoothTowards` reusado para la cámara.
