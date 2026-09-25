# Acto II · Capítulo 2 — La Fragua Antigua

Fecha: 2026-09-25. Estado: diseño aprobado por el usuario, pendiente de revisión del spec escrito.

## 1. Intención y alcance

La historia jugable termina en el nivel 15 (`memory_campaign_complete`), pero el nivel máximo es 40. Consecuencias medidas:

- El enemigo más alto es de nivel 15 (Prior). No hay nada que cazar ni misiones después del Prior.
- Las skills de nivel 25 (`iron_will`, `frost_nova`, `bloodthirst`, `vanish`, `eagle_focus`) y 40 no se pueden conseguir en la práctica.
- El catálogo tiene ~70 piezas de nivel 24–40 que ninguna fuente entrega.

Este capítulo lleva al jugador del nivel 15 al 25 con dos mapas, cuatro NPC nuevos, dos jefes y el aprendizaje de la skill de nivel 25 justo antes del jefe final. Antes del contenido se entrega un **paso 0 de cimientos** que convierte en datos lo que hoy está escrito caso por caso, para que este capítulo y los siguientes sean mayormente contenido.

Decisiones del usuario (2026-09-25): seguir la historia (no endgame repetible ni solo infraestructura); antagonista **Maestro y Dragón**; incluir el paso 0.

**Fuera de alcance:** contenido 25–40 (salvo un élite de nivel 30 como anticipo), crafteo, modelos 3D nuevos, migración del server a Fly.io, cambios de PvP, clases nuevas o nuevo nivel máximo.

## 2. Historia

Tras la caída del Prior, los nombres que la Memoria retenía quedan libres. Muchos no vuelven a sus dueños: viajan hacia las montañas del este. Allí, la segunda llama —la Fragua, "la que da forma"— los llama para darles cuerpos de hierro.

Dorne reconoce las marcas del Custodio (ya lo anticipó en el Acto I: "pertenecen a una fragua más antigua que la mía"). Son de su maestro, **Halden**, desaparecido años atrás con la antigua Hermandad del Yunque. Halden perdió a su familia por la maldición de Nihil y cree que nadie debería desaparecer del todo: forjar cuerpos para los muertos es, para él, piedad. Para encender la Fragua a plena potencia despertó a **Vharzul**, el dragón primordial del que nacieron las dos llamas.

Arco en tres tiempos:

1. **Dorne** (pueblo) entrega la transición: "el hombre que me enseñó a forjar está haciendo esto".
2. **Minas de Hierro Negro:** investigás el taller abandonado de la Hermandad, abrís las galerías y vencés a Halden en la Puerta de la Fragua. Derrotado, confiesa que despertó a Vharzul y que ya no puede detenerlo. Decide ayudar.
3. **Fragua de los Primeros:** con Ysolde, guardiana de las runas de los primeros herreros, y Halden bajo su custodia, preparás el enfrentamiento: pilares rúnicos, yunques que forjan guardianes, y Vharzul. Epílogo con Dorne en el pueblo: forja una última pieza con el corazón del dragón y decide qué hacer con su maestro.

Coherencia con lo escrito: Nihil no reaparece. El Prior preservaba recuerdos; Halden les da cuerpo. Son dos respuestas equivocadas a la misma pérdida, lo que mantiene el tono de los capítulos anteriores.

## 3. Regiones

Dos mapas nuevos en el plano global, a la derecha de Marismas/Monasterio. `MAP_BOUNDS.maxX` pasa de 1300 a 1600.

| id | Nombre | Centro | Spawn | Nivel | levelReq |
|---|---|---|---|---|---|
| `minas` | Minas de Hierro Negro | (1500, 150) | (1500, 200) | 15–20 | 15 |
| `fragua` | Fragua de los Primeros | (1500, 450) | (1500, 500) | 20–25 | 20 |

Además del nivel, cada mapa exige estado de campaña (ver §6.2): `minas` requiere haber iniciado el capítulo; `fragua` requiere haber vencido a Halden.

**Minas de Hierro Negro.** Campamento minero al sur (spawn, NPC, sin mobs ni patrullas encima). Tajo abierto en el centro con rampas y vagonetas. Galerías al norte que terminan en la **Puerta de la Fragua** (arena de Halden). Pozos y abismos no transitables, con la misma técnica de navegación que el agua de las Marismas (`VEIL_POOLS`). Galería lateral al este con un élite de nivel 24 visible desde el camino, fuera de la ruta obligatoria. Materiales: roca oscura, madera de entibado, hierro, faroles de aceite.

**Fragua de los Primeros.** Campamento de Ysolde al sur. Caldera volcánica con canales de lava no transitables que forman pasillos. Tres pilares rúnicos en el camino. Arena norte con tres yunques antiguos alrededor de Vharzul. Un nicho lateral oeste con un élite de nivel 30 como anticipo del contenido futuro. Materiales: basalto, brasas emisivas, bronce antiguo, humo. La niebla no oculta ni los avisos de ataque ni las salidas.

Cada mapa tiene su propia ambientación (`MinasEnvironment.ts`, `FraguaEnvironment.ts`, con el mismo patrón que `VeilEnvironment`/`MonasteryEnvironment`), geometría compartida render/navegación en `structures.ts`/`navigation.ts`, y un tema musical en `score.ts`.

## 4. NPC

| id | Nombre | Mapa | Función |
|---|---|---|---|
| `smith` (existente) | Herrero Dorne | pueblo | Transición al capítulo y epílogo |
| `brenna` | Capataz Brenna | minas | Emisora y receptora de las misiones del mapa 1. Compañera de aprendizaje de Dorne |
| `tobias` | Intendente Tobías | minas | Tienda de provisiones, cadena opcional de encargos y contratos repetibles |
| `ysolde` | Guardiana Ysolde | fragua | Emisora y receptora de las misiones del mapa 2 |
| `halden_npc` | Maestro Halden | fragua | Solo diálogo contextual (bajo custodia de Ysolde), sin misiones |

Todos se definen en el registro `NPCS` con `mapId`, presentación y posición. Se reusan los modelos de héroe y los de NPC existentes, diferenciados por silueta, color y accesorios. La interacción se valida contra el NPC exacto, su mapa y 5 unidades de alcance, como en el capítulo 1.

## 5. Misiones

La cadena usa el mismo modelo que Marismas/Monasterio (`Quest` con `returnNpcId`, `objective`, `targetId`, `autoAdvance` para pasos intermedios). IDs con prefijo `f_`. La primera va de Dorne a Brenna.

**Mapa 1 — Minas (receptora: Brenna)**

| id | Título | Objetivo |
|---|---|---|
| `f_arrival` | El taller de Halden | Visitar `minas` y hablar con Brenna |
| `f_mark_1` · `f_mark_2` | La runa del maestro | Examinar dos herramientas marcadas (auto-avance entre ambas) |
| `f_armors` | Hierro que camina | Derrotar 8 Armaduras Animadas |
| `f_lift` | Las galerías hondas | Activar el montacargas que abre las galerías norte |
| `f_trolls` | Lo que vive abajo | Derrotar 6 Trolls de Caverna |
| `f_foreman` | El capataz de hierro | Derrotar al élite Capataz de Hierro (nivel 19) |
| `f_halden` | La Puerta de la Fragua | Derrotar a Halden (nivel 20). Recompensa: arma por clase |

**Mapa 2 — Fragua (receptora: Ysolde, salvo la última)**

| id | Título | Objetivo |
|---|---|---|
| `f_caldera` | La guardiana de las runas | Visitar `fragua` y hablar con Ysolde |
| `f_rune_1..3` | Los pilares de los primeros | Activar tres pilares rúnicos (auto-avance) |
| `f_imps` | Chispas con hambre | Derrotar 10 Imps de Brasa |
| `f_drakes` | La cría del dragón | Derrotar 6 Dracos Jóvenes |
| `f_smelter` | El fundidor primordial | Derrotar al élite Fundidor Primordial (nivel 24) |
| `f_anvils` | Los tres yunques | Examinar los tres yunques. La EXP de esta entrega alcanza el nivel 25 y enseña la skill |
| `f_vharzul` | El corazón de la Fragua | Derrotar a Vharzul (nivel 25). **Se entrega a Dorne en el pueblo** (epílogo). Recompensa: accesorio legendario |

Estado final: `forge_campaign_complete`.

**Cadena opcional de Tobías:** tres encargos en secuencia (provisiones perdidas en el tajo, el diario de un minero, una herramienta de la Hermandad en la Fragua). Dan oro, consumibles y una pieza de equipo; sin EXP necesaria para la ruta.

**Contratos repetibles de Tobías:** pool de 4 contratos de caza (armaduras, trolls, imps, dracos) que rotan como los de Varek. Son la vía de EXP adicional para quien prefiera no farmear libre.

## 6. Paso 0 — Cimientos

Se entrega y deploya antes del contenido, como etapa propia. Criterio de éxito común: **toda la suite actual sigue pasando** (717 tests) y los tests de Marismas, Monasterio, Cripta y jefes no cambian sus asserts.

### 6.1 Estado del jugador en sub-estados

`PlayerState` tiene 61 de los 64 campos `@type` que admite Colyseus 0.15. Se agrupan:

- `attributes: AttributesState` ← `str`, `agi`, `vit`, `ene`, `statPoints`
- `retention: RetentionState` ← `loginStreak`, `dailyQuestId`, `dailyProgress`, `dailyDone`, `totalKills`
- `sideChains: MapSchema<SideChainState{ id, progress }>` ← `bountyId/bountyProgress` (clave `varek`) y `veilContractId/veilContractProgress` (clave `boren`)

Resultado: 61 → 50 campos. El formato de guardado (`ProgressSave`) sigue leyendo los campos viejos: si el save no trae `sideChains`, se migra desde `bountyId`/`veilContractId` al cargar. Se escribe el formato nuevo. Sin migración de Supabase (todo vive en el blob `progress`). El cliente adapta sus lecturas en `NetworkClient`; los paneles no cambian.

### 6.2 Capítulos como datos

Nuevo `shared/src/chapters.ts`:

```ts
interface ChapterDef {
  id: string;                 // 'act1' | 'veil' | 'memory' | 'forge'
  questOrder: string[];
  completeId: string;         // 'campaign_complete', 'veil_prologue_complete', ...
  startNpcId: string;         // quién ofrece el capítulo desde el estado anterior
  startLevel: number;         // nivel mínimo para iniciarlo
  after: string | null;       // completeId del capítulo anterior
  mapGates: Record<string, { from: string }>; // mapa → primera misión que lo habilita
}
```

Reemplaza las ramas manuales de `serveElder`, `nextQuestId` y la restricción del Monasterio en `WarpTo`. Los IDs y los estados guardados no cambian: los tres capítulos actuales se expresan en datos con el mismo comportamiento y el capítulo `forge` se agrega como una entrada más.

### 6.3 Encargos opcionales como datos

La cadena de Boren (`veilContracts.ts`) se generaliza a `SIDE_CHAINS` (`shared/src/sideChains.ts`) con `{ chainId, npcId, kind: 'sequence' | 'repeatable', steps[] }`. Boren y Varek migran a esa definición. El progreso usa `sideChains` (§6.1).

### 6.4 Encuentros como datos

`stepGuardianHazard` hoy decide por `templateId` con valores fijos en el código. Nuevo `shared/src/encounters.ts`:

```ts
type HazardShape = 'circle' | 'cone';
interface HazardPattern {
  shape: HazardShape;
  anchor: 'target' | 'self';   // bajo el objetivo fijado o sobre el jefe
  radius: number;
  angleDeg?: number;           // solo cono; orientación fijada al iniciar el aviso
  windupMs: number;
  power: number;               // multiplicador de daño
  channel?: boolean;           // canalización interrumpible
  interruptObjects?: string[]; // objetos que la cortan (anclajes, yunques)
}
interface EncounterDef {
  templateId: string;
  cooldownMs: number;
  patterns: HazardPattern[];              // se alternan en orden
  belowHalf?: { cooldownMs?: number; patterns?: HazardPattern[] };
  summons?: { templateId: string; fromObjects?: string[]; atHpPct?: number; everyMs?: number; maxAlive: number };
}
```

El server interpreta estos datos; los seis encuentros actuales (Behemoth, Custodio, Guardián del Velo, Carcelero, Nihil, Prior) migran con **los mismos números** y sus tests deben pasar sin tocar los asserts. `MobState` suma `hazardShape` y `hazardAngle` sincronizados; `HazardViews` dibuja círculo o cono. El impacto usa la misma geometría que se dibuja.

Las invocaciones no dan EXP ni botín, se limpian al morir el jefe o al reiniciarse el encuentro, y respetan `maxAlive`.

### 6.5 Reglas pendientes del spec anterior

- **Viaje en combate:** `WarpTo` y `aden_sello_de_retorno` se rechazan si `msSinceCombat < 5000`, con el motivo y los segundos restantes. Caminar para retirarse sigue siendo posible.
- **Maná:** la regeneración en combate baja y fuera de combate sube, con la forma `base × factor` según `msSinceCombat`. Los valores se fijan con el simulador (§6.6) para cumplir: la rotación máxima del mago se queda sin maná entre 40 y 70 s de combate continuo; usando solo su skill principal la sostiene; fuera de combate recupera el maná completo en menos de 20 s.

### 6.6 Simulador de balance

Script determinista (semilla fija) que usa **el código real del server** —daño, skills, pociones, peligros, `pvePower`— sin reimplementar fórmulas. Bots por clase con dos conductas: *atento* (se aparta de avisos y ataques telegrafiados, usa skills y pociones) y *quieto* (solo autoataque, sin moverse). Corre más rápido que el tiempo real avanzando el tick manualmente.

Si los handlers de `GameRoom` no pueden invocarse sin WebSocket, se extrae la lógica de skills a un sistema propio (`SkillSystem`), lo que además reduce `GameRoom.ts` (1742 líneas). El plan de la etapa A empieza por esa verificación.

Salida: tabla por clase × enemigo con tiempo para matar, vida perdida, pociones y muertes, guardada en `artifacts/balance/`. Se corre también sobre los jefes existentes como línea base.

## 7. Enemigos y combate

Todos con nivel fijo y rango explícitos (regla del capítulo 1). Modelos existentes con otro tinte y escala.

| id | Nombre | Nivel | Rango | Modelo |
|---|---|---|---|---|
| `mine_digger` | Excavador Hueco | 15 | normal | BoneWarden |
| `mine_armor` | Armadura Animada | 16 | normal | DreadKnight |
| `cave_troll` | Troll de Caverna | 18 | normal | ForestTroll |
| `mine_foreman` | Capataz de Hierro | 19 | élite | DreadKnight ×1.5 |
| `halden` | Maestro Halden | 20 | jefe | DreadKnight ×1.4, bronce |
| `iron_colossus` | Coloso de Hierro Negro | 24 | élite (opcional) | ForestTroll ×1.6 |
| `ember_imp` | Imp de Brasa | 21 | normal | InfernalDemon ×0.7 |
| `young_drake` | Draco Joven | 22 | normal | AncientDrake ×0.8 |
| `forge_construct` | Guardián Forjado | 23 | normal | BoneWarden |
| `primal_smelter` | Fundidor Primordial | 24 | élite | InfernalDemon ×1.5 |
| `forged_guardian` | Guardián de Yunque | 23 | invocación | BoneWarden |
| `vharzul` | Vharzul, Dragón de la Fragua | 25 | jefe | AncientDrake ×2.6 |
| `magma_wyrm` | Sierpe de Magma | 30 | élite (anticipo) | AncientDrake ×1.3 |

**Zonas de caza:** cada mapa tiene 3–4 grupos de 6–10 enemigos de su rango, fuera de la ruta de los jefes. El capítulo 1 tiene solo 4 enemigos por mapa además de sus jefes. Acá el objetivo es poder subir cazando.

**Halden (nivel 20):** alterna un martillazo en cono frontal (orientación fijada al iniciar el aviso) y un círculo bajo el objetivo. Al cruzar el 50% invoca una sola vez dos Armaduras Animadas y acorta su cooldown.

**Vharzul (nivel 25):** alterna aliento en cono y brasas en círculo bajo el objetivo. Los tres yunques de la arena forjan un Guardián de Yunque cada cierto tiempo (máximo uno vivo por yunque). Interactuar con un yunque lo enfría por el resto del encuentro, si el jugador tiene poder suficiente contra el jefe (misma regla que los anclajes del Prior). Bajo el 50% canaliza "Fragua encendida", un círculo grande sobre sí mismo: se escapa caminando o se interrumpe enfriando un yunque todavía activo. Enfriar los tres antes de tiempo quita esa opción: hay que decidir cuándo usarlos.

**Objetivos de calibración** (perfil garantizado, en solitario, al nivel previsto; los mismos del capítulo 1): enemigo común 5–9 s; élite 15–30 s; jefe 60–100 s de combate efectivo; ataque fuerte ≈25–40% de la vida de una configuración no defensiva. El bot *quieto* no debe vencer a Halden ni a Vharzul con el perfil garantizado; el bot *atento* sí, con las cinco clases.

**Reinicio:** el encuentro de cada jefe se reinicia tras 15 s sin participantes vivos a 25 unidades; recupera vida y limpia invocaciones y yunques.

## 8. Progresión y recompensas

EXP necesaria según la curva actual (`100 × nivel^1.5`): 15→20 = 35.137; 20→25 = 51.674; total 86.811 (4,2 veces el capítulo 1, que requiere 20.892).

Reparto objetivo: ~55% por misiones y ~45% por bajas obligatorias e incidentales. La ruta principal sin encargos ni contratos debe alcanzar cada puerta (20 antes de Halden, 25 al entregar `f_anvils`). Las EXP concretas por misión y por enemigo se fijan con el simulador y se publican en la tabla de balance del plan.

Recompensas (del catálogo existente, nivel 15–27):

- Misiones intermedias: piezas de los conjuntos de nivel 21 (`el_bastion_de_ceniza`, `el_enigma_de_umbra`, `el_vendaval_gris`) según clase y escudos de nivel 18–23.
- **Halden:** arma por clase (`rewardByClass`): caballero/bárbaro `aden_azote_de_los_encadenados`, explorador `aden_arco_del_batidor`, mago `aden_vara_de_la_mirada_petrea`, pícaro: **no existe arma de pícaro entre los niveles 15 y 27**; se agregan dos dagas al catálogo (niveles 18 y 24) siguiendo la progresión de ataque de las otras clases.
- **Vharzul:** accesorio legendario nuevo, **Corazón de Vharzul** (nivel 25; valores iniciales `pAtk 16, pDef 14, maxHp 120`, por encima de la Corona del Rey Nihil `12/12/65` y del Relicario de los Nombres `8/6/+65 MP`; se ajustan con el simulador), entregado una sola vez. Tabla de botín repetible separada con armas de nivel 27.
- La tienda de Tobías vende pociones mayores y munición. Dorne suma a su tienda equipo de nivel 18–23; el requisito de nivel de cada ítem ya limita quién puede usarlo, así que no hace falta condicionar el stock a la campaña.

## 9. Guardado y compatibilidad

- `memory_campaign_complete` pasa a ser el estado desde el que Dorne ofrece el capítulo (nivel ≥ 15). No se repiten premios ni se cambian niveles.
- Personajes por encima de 25 pueden jugar el capítulo; no se usan como referencia de balance.
- El progreso del capítulo usa `questId`/`questProgress` y el blob `progress`. **Sin migraciones de Supabase.**
- **El cambio de schema del paso 0 obliga a deployar juntos server (Railway) y cliente (Vercel).** El watch pattern de Railway es `/server/**`: un commit que solo toca `shared/` no redeploya el server. Se propondrá al usuario agregar `/shared/**` a ese patrón (cambio de configuración de su cuenta; requiere su OK).

## 10. Validación

1. Paso 0: suite completa verde sin cambiar asserts de campaña/jefes; tests nuevos de `chapters`, `sideChains`, `encounters` (cono incluido), migración de saves viejos (`veilContractId`/`bountyId` → `sideChains`), bloqueo de viaje y regeneración.
2. Simulador: línea base de los jefes actuales y tabla del capítulo nuevo por clase y conducta.
3. E2E de server por mapa (como `VeilCampaign.test`/`MonasteryCampaign.test`): transición con Dorne, puertas de mapa, orden de pasos, NPC/mapa/distancia, recompensas únicas, jefes con invocaciones y yunques, reinicio del encuentro, contratos repetibles.
4. Cliente: tests de vistas nuevas (cono en `HazardViews`, NPC, ambientación) y recorrido en el navegador contra server local: diálogos, marcadores, avisos legibles, sin errores de consola.
5. TypeScript estricto en los tres paquetes, build de producción.

## 11. Orden de entrega

- **Etapa A — Cimientos** (§6). Deploy coordinado server + cliente.
- **Etapa B — Minas de Hierro Negro:** transición con Dorne, mapa 1, Brenna, Tobías, enemigos, Halden. Primer tramo jugable.
- **Etapa C — Fragua de los Primeros:** mapa 2, Ysolde, Halden NPC, Vharzul, aprendizaje de nivel 25, epílogo, élite de nivel 30.

Cada etapa tiene su plan (`docs/superpowers/plans/`), tests, TypeScript, build y recorrido en navegador antes de pedir OK para integrar.
