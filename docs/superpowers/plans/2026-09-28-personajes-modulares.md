# Personajes modulares, armaduras, armas y creador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir los personajes jugables por héroes modulares de fantasía con armaduras ajustadas, armas renovadas y apariencia elegible, persistente y sincronizada.

**Architecture:** Una ruta nueva de héroes carga mallas, prendas, armas y clips previamente preparados, mientras la fábrica antigua continúa atendiendo a NPC, enemigos y transformaciones. Un contrato de apariencia compartido conecta creador, servidor y renderizado. Primero se entrega una galería visual; la integración completa depende de aceptar su calidad.

**Tech Stack:** TypeScript, Three.js 0.160, Vite 5, Colyseus 0.15, schema 2, Vitest 1.6, Node.js para preparación de assets; formatos glTF/GLB y texturas locales.

**Spec:** [Especificación aprobada](../specs/2026-09-28-personajes-modulares-design.md).

**Estado:** plan pendiente de revisión; ninguna tarea de implementación se ha ejecutado. La especificación fue aprobada con la incorporación del rediseño de armas por familias.

## Global Constraints

- Exclusivamente recursos gratuitos.
- Estética de fantasía estilizada: rostros y proporciones cercanos a Lineage II, combinados con armaduras y siluetas marcadas inspiradas en WoW/MU.
- Vista previa 3D con giro y acercamiento.
- La apariencia no modifica atributos, alcance, velocidad, habilidades ni reglas de equipamiento.
- No se exige una malla exclusiva por cada ítem del catálogo.
- Los NPC continúan por la ruta antigua aunque utilicen nombres como Knight o Mage. No se cambia el significado global de esos IDs.
- Un resultado técnicamente válido pero visualmente insatisfactorio no cumple el objetivo.
- Catálogo final: 2 cuerpos; 4 rostros y 6 opciones de cabello por cuerpo, contando calvicie; 8 tonos de piel; 8 colores de cabello; 6 colores de ojos; 3 barbas más `none`; 3 marcas más `none`.
- Muestra: ambos cuerpos; atuendos de caballero y mago; 2 rostros y 2 peinados por cuerpo; espada, escudo y bastón renovados.
- Presupuesto de muestra: 35.000 triángulos y 12 llamadas de dibujo por héroe con atuendo base y armas, excluyendo efectos y compañeros; texturas de cuerpo/rostro hasta 2.048 px y piezas pequeñas hasta 1.024 px; recursos nuevos transferidos hasta 15 MiB.
- Objetivo medido: 60 FPS a 1080p en el equipo de verificación; medir además escenas de 1, 10 y 20 héroes sin prometer rendimiento universal.
- Los paquetes Standard son candidatos; su contenido real se inspecciona. No comprar ni usar archivos Source/Pro como si fueran gratuitos.
- Una apariencia guardada de versión desconocida provoca error de compatibilidad antes de añadir al jugador al mundo; no se sobrescribe.
- Cliente y servidor se publican coordinadamente por el cambio de schema. Este trabajo no incluye despliegue.
- Mantener el formato de cuentas actual, las cinco clases, los datos guardados y el comportamiento de NPC, monstruos y compañeros.
- Revisión del plan antes de implementar y revisión estética de la muestra antes de extenderla.

## Review Focus

1. Dos jugadores con colores y equipo distintos comparten assets: modificar o retirar uno no debe alterar ni invalidar al otro. Pruebas en tareas 3 y 10.
2. Cambio rápido de cuerpo/clase durante una carga fallida: la selección más reciente debe conservarse y Reintentar debe recuperarla. Prueba con promesas controladas en tarea 8.
3. Personaje existente llega por login con cosméticos diferentes, o save de versión futura: preservar el guardado válido y rechazar la versión desconocida sin escribir defaults. Pruebas en tarea 7.
4. Transformación termina mientras el jugador está muerto o seleccionado: conservar posición, orientación, selección y estado de muerte al recuperar toda la apariencia. Prueba en tarea 9.
5. Modelo de arma indexado, varios materiales o escala exportada distinta: misma familia visible en mano, suelo e icono, con agarre correcto. Pruebas en tareas 4 y 6.

## Secuencia y mapa de archivos

Hito A: tareas 1–5 producen la galería de calidad. Hito B: tareas 6–9 completan contenido e integración después de la revisión visual. Hito C: tarea 10 verifica la experiencia completa.

| Unidad | Archivos principales | Responsabilidad |
| --- | --- | --- |
| Preparación | `scripts/heroes/gltf.mjs`, `scripts/heroes/import.mjs`, `scripts/heroes/source-selection.json` | Inventario, adaptación reproducible y exportación |
| Procedencia | `client/public/models/heroes/provenance.json`, `client/public/models/LICENSES.md` | Archivos utilizados, licencia y hashes |
| Apariencia | `shared/src/appearance.ts`, `shared/src/index.ts` | IDs, reglas, defaults, migración |
| Recursos | `client/src/assets/heroManifest.ts`, `client/src/assets/weaponManifest.ts` | Referencias a los exports y selección de partes/clips |
| Héroe | `client/src/render/HeroRig.ts`, `ModularHeroFactory.ts`, `ModularHeroEquipment.ts` | Ensamblado, animación, materiales y vestuario |
| Armas | `client/src/render/WeaponModels.ts`, `ItemModels.ts` | Modelos y acabados compartidos con equipo, suelo e iconos |
| Muestra | `client/hero-redesign-preview.html`, `client/src/preview/HeroRedesignPreview.ts`, `HeroRedesignPreview.css` | Comparación y revisión artística |
| Servidor | `server/src/state/AppearanceState.ts`, `PlayerState.ts`, `rooms/GameRoom.ts`, `persistence/CharacterSave.ts`, `PersistenceService.ts` | Validación, replicación y guardado |
| Creador | `client/src/render/CharacterCustomizer.ts`, `CharacterCustomizer.css`, `ClassSelect.ts`, `ClassSelect.css`, `HeroPreview.ts` | Selección y presentación |
| Mundo | `client/src/net/NetworkClient.ts`, `client/src/main.ts`, `client/src/render/EntityViews.ts`, `CharacterView.ts` | Aplicar apariencia al jugador y sus transformaciones |

Las rutas abreviadas en esta tabla pertenecen al directorio del primer archivo de su celda. Las tareas siguientes usan rutas completas. No agregar módulos que no tengan consumidor en el hito correspondiente.

### Tarea 1: Inspeccionar y preparar los assets de la muestra

**Files:** crear `scripts/heroes/gltf.mjs`, `scripts/heroes/gltf.test.mjs`, `scripts/heroes/import.mjs`, `scripts/heroes/source-selection.json`, `client/public/models/heroes/provenance.json`; modificar `client/public/models/LICENSES.md`. Usar `artifacts/source-models/heroes/` para descargas, ya cubierto por `.gitignore`.

**Interfaces:** `readGltf(file: string): Promise<{ json: object; buffers: Buffer[] }>`; `inspectGltf(document): { meshes: number; skinnedMeshes: number; triangles: number; materials: string[]; joints: string[]; clips: string[] }`; CLI `node scripts/heroes/import.mjs --selection scripts/heroes/source-selection.json --out client/public/models/heroes`.

- [ ] Descargar únicamente las ediciones Standard desde las fuentes oficiales de la especificación. Inspeccionar los archivos de licencia y el contenido antes de seleccionar modelos; guardar los originales en la carpeta ignorada. Si la descarga necesita interacción, utilizar el flujo gratuito del sitio y su herramienta de navegador, sin compras.
- [ ] Generar un inventario de nombres reales, mallas, materiales, huesos y clips. Completar `source-selection.json` con rutas existentes y SHA-256, incluyendo dos cuerpos, prendas para ambas bases, dos peinados por cuerpo, espada, escudo, bastón y clips. No copiar nombres de un tutorial ni adivinar huesos.
- [ ] Escribir pruebas del lector con una fixture glTF mínima que referencia un buffer externo y otra GLB con el mismo contenido. Comprobar igualdad de posiciones e índices y un error explícito cuando un buffer requerido falta. Usar `node:test`, `node:assert/strict`, `mkdtemp` y `node:os` en `gltf.test.mjs`; sin instalar un framework adicional.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGltf, inspectGltf } from './gltf.mjs';

test('lee el buffer externo y detecta su ausencia', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aden-hero-gltf-'));
  const gltfPath = join(directory, 'mesh.gltf');
  const binPath = join(directory, 'mesh.bin');
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const json = {
    asset: { version: '2.0' }, buffers: [{ uri: 'mesh.bin', byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  };
  await writeFile(gltfPath, JSON.stringify(json));
  await writeFile(binPath, Buffer.from(positions.buffer));
  assert.equal(inspectGltf(await readGltf(gltfPath)).triangles, 1);
  await unlink(binPath);
  await assert.rejects(readGltf(gltfPath), /buffer/i);
});
```

- [ ] Ejecutar `node --test scripts/heroes/gltf.test.mjs` y comprobar que falla por la función ausente. Implementar lectura de GLB, glTF con buffers externos o data URI, accessors con offset/stride e inventario; repetir hasta pasar. El lector debe conservar índices y no tratar todos los accessors como Float32.
- [ ] Preparar la selección de muestra: normalizar ejes, escala y posición de reposo; conservar pesos e inverse bind matrices; incrustar texturas y buffers. El proceso debe fallar ante huesos requeridos ausentes, pesos no finitos, índices fuera de rango o archivos no licenciados en el inventario.

```js
import { createHash } from 'node:crypto';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
// source-selection.json registra cada entrada concreta con:
// id, sourcePath, sourceUrl, edition, license, sourceSha256,
// role, gender, sourceNodes, materialChannels y sourceClipNames.
// El importador valida sourceSha256 antes de exportar y registra outputSha256.
```

- [ ] Producir dos variantes de rostro por cuerpo conservando la unión de cuello y pesos. Si la edición no incluye rostros distintos, derivar variantes sobre la malla real: anchura de mandíbula, pómulos y perfil nasal, sin escalar toda la cabeza. Registrar la receta o archivo fuente editable y renderizar frente/perfil/tres cuartos. Una modificación que no se vea distinta no cuenta.
- [ ] Adaptar los clips a la misma pose base de cuerpo y prendas. Exportar aliases explícitos `Idle`, `Walk`, `Primary_Attack`, `Hit`, `Death`; el ataque del mago debe ser de lanzamiento. Si hace falta retargeting, verificarlo visualmente: copiar tracks por nombre no basta cuando cambian matrices de reposo.
- [ ] Repetir importación y comprobar salida determinista, salvo timestamps excluidos del hash. Registrar exactamente qué falta si el paquete gratuito no permite la muestra. Commit: `feat: prepare licensed modular hero sample assets`.

**Entregable:** exports locales e inventario auditado; todavía no se cambia el aspecto de los jugadores del mundo.

### Tarea 2: Definir el contrato cosmético y sus reglas puras

**Files:** modificar `shared/src/appearance.ts`, `shared/src/index.ts`; crear `shared/src/appearance.test.ts`.

**Interfaces:** `CharacterAppearanceV1`; `defaultAppearance(className: string, gender: CharacterGender): CharacterAppearanceV1`; `validateAppearance(value: unknown): CharacterAppearanceV1` (lanza ante entrada inválida); `appearanceFromSave(value: unknown, className: string, legacyGender: unknown): CharacterAppearanceV1`; `rebaseAppearance(value: CharacterAppearanceV1, gender: CharacterGender): CharacterAppearanceV1`; `randomAppearance(gender: CharacterGender, random?: () => number): CharacterAppearanceV1`; `appearanceKey(value: CharacterAppearanceV1): string`.

- [ ] Mantener `CharacterGender`, `characterGender`, `isCharacterGender` y `feminineClassName`. Añadir el contrato y el catálogo tipado de IDs; los IDs iniciales se asignan a los recursos realmente producidos en tarea 1. No publicar opciones cosméticas sin recurso.

```ts
export interface CharacterAppearanceV1 {
  version: 1;
  gender: CharacterGender;
  faceId: string;
  skinToneId: string;
  hairStyleId: string;
  hairColorId: string;
  eyeColorId: string;
  facialHairId: string;
  markingId: string;
}
// Cada entrada del catálogo contiene id, label y genders; los colores incluyen hex.
// Usar arrays readonly con IDs estables: no guardar posiciones de arrays.
```

- [ ] Escribir estos casos y ejecutar `npm run test --workspace @aden/shared -- src/appearance.test.ts` antes de implementar las funciones:

```ts
it('valida sin devolver el objeto mutable del llamador', () => {
  const appearance = defaultAppearance('knight', 'male');
  expect(validateAppearance(appearance)).toEqual(appearance);
  expect(validateAppearance(appearance)).not.toBe(appearance);
});
it('separa creación estricta de migración de campos antiguos', () => {
  const valid = defaultAppearance('mage', 'female');
  expect(() => validateAppearance({ ...valid, faceId: '../external.glb' })).toThrow();
  expect(appearanceFromSave(undefined, 'mage', 'female')).toEqual(valid);
  expect(appearanceFromSave({ ...valid, faceId: 'retired-face' }, 'mage', 'female').faceId)
    .toBe(valid.faceId);
  expect(() => appearanceFromSave({ ...valid, version: 2 }, 'mage', 'female')).toThrow();
});
```

- [ ] Implementar validación de objeto no nulo, versión, tipos, pertenencia al catálogo y compatibilidad por cuerpo. Crear un nuevo objeto con solo los campos permitidos. No usar coerción de tipos ni aceptar IDs por su longitud.
- [ ] Implementar migración determinista: `undefined` usa clase/género antiguo; versión 1 normaliza campos cosméticos individuales; otra versión explícita rechaza. `rebaseAppearance` conserva opciones compatibles y colores; `randomAppearance` solo elige entradas válidas con RNG inyectable.
- [ ] Añadir tests de `null`, arrays, versión string, géneros inválidos, barba incompatible, cambio de cuerpo y 200 combinaciones aleatorias. Verificar que `appearanceKey` usa orden de campos fijo, no el orden de propiedades recibido.
- [ ] Repetir tests y comprobar exports existentes. Commit: `feat: define versioned character appearance rules`.

### Tarea 3: Ensamblar y animar un héroe con recursos bien aislados

**Files:** crear `client/src/assets/heroManifest.ts`, `client/src/render/HeroRig.ts`, `HeroRig.test.ts`, `ModularHeroFactory.ts`, `ModularHeroFactory.test.ts`, `fixtures/modularHero.ts`; modificar `client/src/render/CharacterFactory.ts`, `CharacterView.ts`.

**Interfaces:** `HeroAnchor = 'head' | 'torso' | 'pelvis' | 'rightHand' | 'leftHand' | 'rightFoot' | 'leftFoot'`; `resolveHeroAnchors(root, names: Record<HeroAnchor, string>): Record<HeroAnchor, THREE.Object3D>`; `ModularHeroFactory.preload(): Promise<void>`; `ModularHeroFactory.create(className: string, appearance: CharacterAppearanceV1): Character`; `ModularHeroFactory.dispose(): void`. Agregar `CharacterFactory.preloadHeroes()` y `createHero(className, appearance)` como delegación.

- [ ] Definir el manifiesto con URLs de exports, altura normalizada, correspondencia real de huesos, materiales semánticos, opciones cosméticas y clips por clase/cuerpo. No traducir nombres de huesos dentro del código de UI. Tarea 1 aporta los nombres concretos.
- [ ] Extender `Character` con propiedad opcional `equipment` y método opcional `dispose`. Introducir en `CharacterFactory.ts` el tipo siguiente, sin modificar la firma de `create(modelName)`:

```ts
export interface CharacterEquipment {
  update(equipment: Record<string, string>): void;
  dispose(): void;
}
// CharacterView constructor:
this.equipment = character.equipment ?? new EquipmentViews(character.root);
// Declarar CharacterView.equipment como CharacterEquipment, no EquipmentViews.
// CharacterView.dispose libera el controlador y luego character.dispose?.().
// El dispose del héroe no vuelve a disponer el controlador; solo su mixer/materiales.
```

- [ ] Crear `makeModularHeroFixture(): { scene: THREE.Group; animations: THREE.AnimationClip[] }` en la fixture: esqueleto con los 7 anclajes semánticos nombrados según el manifiesto, una malla triangular skinned con pesos válidos, materiales con los canales del manifiesto y cinco clips de prueba. La fixture es un consumidor del manifiesto: no define un segundo mapa de nombres. Inyectar carga mediante constructor `new ModularHeroFactory(load?: (url: string) => Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>)`; en producción se usa GLTFLoader.
- [ ] Escribir tests de hueso requerido ausente, clonación y propiedad de materiales; ejecutar `npm run test --workspace @aden/client -- src/render/HeroRig.test.ts src/render/ModularHeroFactory.test.ts` y confirmar fallos antes de implementar.

```ts
it('retirar un héroe no dispone la geometría compartida por otro', async () => {
  const source = makeModularHeroFixture();
  const factory = new ModularHeroFactory(async () => source);
  await factory.preload();
  const a = factory.create('knight', defaultAppearance('knight', 'male'));
  const b = factory.create('knight', defaultAppearance('knight', 'male'));
  const meshes: THREE.Mesh[] = [];
  b.root.traverse(node => { if (node instanceof THREE.Mesh) meshes.push(node); });
  const disposed = vi.spyOn(meshes[0].geometry, 'dispose');
  a.dispose?.();
  expect(disposed).not.toHaveBeenCalled();
  b.play('Idle', true);
  b.mixer.update(0.1);
  expect(b.root.matrixWorld.elements.every(Number.isFinite)).toBe(true);
  b.dispose?.();
  factory.dispose();
});
```

- [ ] Implementar cache de assets, clones por esqueleto y materiales por instancia. Las prendas comparten la matriz de reposo y el orden de huesos canonizados por el importador. Seleccionar variantes de rostro/cabello antes de devolver el personaje; aplicar tonos a todas las superficies de piel y canales separados de ojos/cabello/cejas. Guardar `root.userData.appearanceKey = appearanceKey(appearance)` como metadato de diagnóstico, sin guardar controladores ni funciones en `userData`.
- [ ] Conservar la normalización fuera de nodos animados, el frente +Z y la posición del servidor. Reproducir los aliases exportados con crossfade, one-shot y cancelación de callbacks igual al contrato existente. `dispose` es idempotente y libera solo recursos propios.
- [ ] Añadir un test donde recolorear el material de un héroe no cambia otro y otro donde `playOnce` se interrumpe sin disparar el callback anterior. Correr también `src/render/CharacterView.test.ts` y `src/render/NpcAppearance.test.ts`. Commit: `feat: assemble modular heroes on a dedicated rig`.

### Tarea 4: Integrar armaduras y armas de la muestra

**Files:** crear `client/src/render/ModularHeroEquipment.ts`, `ModularHeroEquipment.test.ts`, `WeaponModels.ts`, `WeaponModels.test.ts`, `client/src/assets/weaponManifest.ts`; conectar `client/src/render/ModularHeroFactory.ts`; ampliar selección e importador de tarea 1.

**Interfaces:** `WeaponVisualFamily = 'sword' | 'dagger' | 'axe' | 'mace' | 'spear' | 'staff' | 'bow' | 'crossbow' | 'shield'`; `WeaponModels.preload(): Promise<void>`; `WeaponModels.create(family: WeaponVisualFamily, finish: ReturnType<typeof itemVisual>): THREE.Group`; `WeaponModels.release(model: THREE.Group): void`; `WeaponModels.dispose(): void`; `ModularHeroEquipment` implementa `CharacterEquipment` y recibe anclajes, piezas del atuendo y repositorio de armas. `WeaponModels` recibe el mismo loader opcional e inyectable de `ModularHeroFactory`; esta última se lo transmite, también en tests. Exponer ese repositorio con el getter readonly `weaponModels` en ambas fábricas; no crear una segunda carga para los ítems del suelo.

- [ ] Escribir tests con las fixtures de tarea 3: casco oculta cabello y quitarlo lo restaura; cambiar torso no recolorea la cara; arma sigue la mano durante un clip; quitar equipo restaura el vestuario/arma inicial de clase. Ejecutar tests nuevos y observar el fallo.

```ts
it('el equipo cambia sin destruir la apariencia elegida', async () => {
  const factory = new ModularHeroFactory(async () => makeModularHeroFixture());
  await factory.preload();
  const hero = factory.create('knight', defaultAppearance('knight', 'male'));
  const before = hero.root.userData.appearanceKey;
  hero.equipment!.update({ weapon: 'iron_sword', armor: 'iron_mail' });
  hero.play('Primary_Attack', true);
  hero.mixer.update(0.2);
  hero.equipment!.update({});
  expect(hero.root.userData.appearanceKey).toBe(before);
  expect(hero.root.getObjectByName('hero_default_outfit')?.visible).toBe(true);
});
```

- [ ] Implementar grupos con propiedad clara: `hero_default_outfit`, piezas equipadas por slot y grupos de piel/cabello ocultables. Ocultar partes corporales mediante grupos de índices preparados en importación, no por adivinación durante cada frame.
- [ ] Implementar manifiesto de armas con pivote de empuñadura y transformaciones locales. Espada en mano derecha y escudo en izquierda; bastón según el clip del mago. Ajustar ambos cuerpos con la misma unidad del héroe. Las superficies texturadas mantienen sus mapas al cambiar rareza.
- [ ] Dejar cada objeto de arma con geometría y texturas compartidas, materiales por instancia cuando tengan tintes. El controlador llama a `WeaponModels.release` al retirar una instancia: libera sus materiales exclusivos y la desacopla, conservando geometría/texturas del repositorio. `dispose` libera el repositorio al terminar la aplicación. Añadir comprobación de GLB con índices y múltiples materiales en el loader real. Para la muestra únicamente se exponen las tres familias cuyos assets estén listos.
- [ ] Comprobar en renderer real el agarre, escudo, túnica y placas durante los cinco estados. Corregir clipping mediante geometría, pesos o máscaras; no ocultar el defecto eligiendo un solo ángulo favorable. Commit: `feat: fit sample armor and weapons to modular heroes`.

### Tarea 5: Entregar la galería comparativa y revisar la calidad

**Files:** crear `client/hero-redesign-preview.html`, `client/src/preview/HeroRedesignPreview.ts`, `HeroRedesignPreview.css`, `HeroRedesignPreview.test.ts`; ampliar `docs/hero-appearance.md`; registrar evidencia en `artifacts/hero-redesign/` y resumen en `docs/hero-redesign-validation.md`.

**Interfaces:** `mountHeroRedesignPreview(parent: HTMLElement, factory: CharacterFactory): { dispose(): void }` monta la galería tras precargar sus assets. La página utiliza `CharacterFactory.create` para la versión actual y `createHero` para la nueva. Exportar `sampleMetrics(renderer: THREE.WebGLRenderer): { triangles: number; drawCalls: number; geometries: number; textures: number }` desde el módulo de preview. La UI expone controles accesibles por nombre. El HTML arranca la página; importar el módulo en un test no crea renderers por efecto lateral.

- [ ] Construir una vista comparativa a igual escala, cámara y luz. Ofrecer caballero/mago y ambos cuerpos, rostro/cabello de muestra, giro, encuadre Cuerpo/Rostro, cámara Juego y los cinco estados de animación. Incluir contadores de rendimiento visibles en el modo de diagnóstico.
- [ ] Comprobar que el control de reproducción llama al alias correcto y que cambiar selección retira/dispose la instancia anterior sin recrear el renderer. El test DOM usa factory inyectada y verifica esas llamadas; no reemplaza la inspección de modelos reales.
- [ ] Para cámara de juego, usar parámetros de `Renderer.ts` y una escena de suelo/luces equivalente al pueblo obtenida del código de `Environment.ts`; para comparación cercana, mismo encuadre para ambos modelos. La galería debe cargar sin servidor, contraseña ni escritura de cuentas.
- [ ] Arrancar `npm run dev:client`. Usar la herramienta de navegador y su guía de verificación para abrir `http://localhost:5173/hero-redesign-preview.html`. Comprobar consola, assets, todos los controles y obtener capturas de frente, perfil, tres cuartos y cámara de juego.
- [ ] Medir bytes de recursos nuevos desde la red del navegador y `renderer.info`. Añadir escenarios de 1, 10 y 20 héroes, contabilizando frames después de cargar y calentar durante 5 segundos. Registrar navegador, GPU reportada si está disponible, resolución y duración del muestreo; no inventar FPS si no se pudieron medir.

```ts
export function sampleMetrics(renderer: THREE.WebGLRenderer) {
  return {
    triangles: renderer.info.render.triangles,
    drawCalls: renderer.info.render.calls,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  };
}
```

- [ ] Ejecutar `npm run build --workspace @aden/client`, enlazar la galería y mostrar capturas al usuario. Registrar qué supera o incumple los criterios estéticos y los presupuestos. Commit: `feat: add comparative modular hero showcase`.
- [ ] **Punto de revisión visual:** esperar la valoración de la muestra acordada en la especificación antes de extenderla. Si el aspecto sigue sin cumplir, corregir bases, rostros, materiales, ropa o animaciones dentro de este hito. No usar la creación de cuentas como sustituto de la mejora visual.

### Tarea 6: Completar las cinco clases, el catálogo y las familias de equipo

**Files:** ampliar manifiestos, selección de fuentes, importador, `ModularHeroFactory.ts`, `ModularHeroEquipment.ts`, `WeaponModels.ts`, `shared/src/appearance.ts`; modificar `client/src/render/ItemModels.ts`; crear `client/src/render/WeaponPresentation.test.ts`, `client/src/preview/WeaponIconExport.ts`; actualizar `client/item-preview.html`.

**Interfaces:** `weaponVisualFamily(item: ItemTemplate, className?: string): WeaponVisualFamily | null` en `WeaponModels.ts`; `weaponIconUrl(item: ItemTemplate): string | null`; `configureWeaponModels(repository: WeaponModels): void` en `ItemModels.ts`; `captureWeaponIcon(renderer: THREE.WebGLRenderer, model: THREE.Object3D): string` devuelve PNG data URL en la página de preparación. Los ítems siguen usando `createItemModel(id, side?)`, `itemIconUrl(id)` e `itemIcon(id)`.

- [ ] Producir el catálogo completo: 4 rostros y 6 cabellos por cuerpo, 8 pieles, 8 cabellos, 6 ojos, barbas y marcas acordadas. Registrar cada entrada en el manifiesto y el catálogo compartido. Mantener costura del cuello y separar canales de piel/ojos/pelo; una marca se mezcla conservando el tono de piel.
- [ ] Preparar cuero, tela y placas para ambos cuerpos, y las cinco presentaciones de clase. Completar ataques de bárbaro, pícaro y ranger; el ranger usa arco reconocible, y la ballesta tiene una pose compatible cuando se equipa. Mantener todas las ranuras existentes, incluidos accesorios, alas y compañeros.
- [ ] Importar o producir hoja corta, hacha, maza, lanza, arco y ballesta, junto con espada, bastón y escudo de muestra. La hoja corta corresponde a la presentación del pícaro y a las variantes de ítems cuya identidad lo justifique; no convertir todas sus espadas equipadas en dagas ni cambiar categorías o estadísticas.
- [ ] Escribir tests de cobertura de catálogo y de correspondencia visual usando el catálogo real. Ejecutarlos antes de conectar las nuevas representaciones.

```ts
it.each(['worn_sword', 'iron_sword', 'ember_axe'])('conserva familia visual de %s', id => {
  const item = getItem(id);
  expect(weaponVisualFamily(item)).toBe(itemVisual(item).family);
  expect(weaponIconUrl(item)).toMatch(/^\/textures\/weapons\/.+\.png$/);
});
it('el color de rareza no decide la familia del arma', () => {
  const item = getItem('iron_sword');
  expect(weaponVisualFamily({ ...item, rarity: 'legendary' })).toBe('sword');
});
```

- [ ] Conectar armas precargadas a `createItemModel`: resolver familia desde `getItem`/`itemVisual`, clonar el modelo y aplicar acabados. `main.ts` y la galería de ítems llaman `configureWeaponModels(factory.weaponModels)` tras precargar y antes de construir ítems. Mantener la ruta procedural para los otros ítems. Incluir familia/variante en la clave del cache para que dos variantes no colisionen.
- [ ] El cache finito de `ItemModels` conserva un prototipo por familia/acabado, cuyas copias comparten materiales inmutables. `disposeItemModels` llama a `WeaponModels.release` para sus prototipos de armas y solo dispone directamente las geometrías procedurales que posee. El repositorio de armas se dispone después, al cerrar la aplicación. Probar que quitar una copia del suelo no dispone recursos de otra copia ni del arma equipada.
- [ ] Generar PNG de iconos con el mismo modelo, pose estable y fondo transparente en una página local de exportación, utilizando WebGL. Registrar la salida por familia y acabado; ejecutar la captura desde la herramienta de navegador y guardar los PNG en `client/public/textures/weapons/`. `itemIconUrl` devuelve estos recursos para armas; conservar alt/title/nombre/rareza existentes.
- [ ] Revisar suelo, inventario, tienda, trade y galería de ítems sin rediseñar sus paneles. Añadir tests de malla indexada y varios materiales, rotación de arco/ballesta y recursos al cerrar. Ejecutar `ItemModels.test.ts`, `GroundItems.test.ts`, `EquipmentViews.test.ts` y los nuevos tests. Commit: `feat: complete hero styles and renew weapon presentations`.

### Tarea 7: Guardar y sincronizar la apariencia con validación del servidor

**Files:** crear `server/src/state/AppearanceState.ts`, `AppearanceState.test.ts`, `server/src/rooms/CharacterAppearance.test.ts`; modificar `PlayerState.ts`, `server/src/rooms/GameRoom.ts`, `server/src/persistence/CharacterSave.ts`, `CharacterSave.test.ts`, `PersistenceService.ts`, `PersistenceService.test.ts`; modificar `client/src/net/NetworkClient.ts` y crear `NetworkClient.appearance.test.ts`.

**Interfaces:** `AppearanceState extends Schema` con campos del contrato, método `apply(value: CharacterAppearanceV1): void` y `toAppearance(): CharacterAppearanceV1`; `ProgressSave.appearance?: CharacterAppearanceV1`; `PlayerSnapshot.appearance?: CharacterAppearanceV1`. Agregar `appearance?: CharacterAppearanceV1` como argumento final de `NetworkClient.connect`, conservando argumentos previos.

- [ ] Escribir tests del schema y save: todos los campos sobreviven round-trip; `gender` antiguo es espejo; cargar un save anterior migra a defaults; alterar el objeto retornado de `InMemoryPersistence.load` no cambia otro load. Ejecutarlos antes de añadir el schema.

```ts
it('guarda cada selección sin referencias mutables al estado', () => {
  const player = new PlayerState();
  const selected = defaultAppearance('mage', 'female');
  player.className = 'mage';
  player.appearance.apply(selected);
  player.gender = selected.gender;
  const save = toCharacterSave(player);
  expect(save.progress.appearance).toEqual(selected);
  expect(save.progress.gender).toBe('female');
  player.appearance.faceId = 'changed-in-memory';
  expect(save.progress.appearance?.faceId).toBe(selected.faceId);
});
```

- [ ] Implementar el schema tipado (version uint8 y el resto strings), copia explícita de campos y clonación de `progress.appearance` en persistencia en memoria. El save en Supabase continúa enviando el JSON `progress`; no agregar migración SQL ni escribir a una base externa durante tests.
- [ ] Validar entrada de creación antes de `saveAccount`. Resolver la apariencia guardada antes de `state.players.set` en `onJoin`; un error libera `activeAccounts` y `accountNames` y no escribe un save. Login ignora cosméticos enviados por el cliente.
- [ ] En `CharacterAppearance.test.ts`, usar el mismo arranque `boot(appConfig)` y cleanup de `GameRoom.test.ts`. Crear un observador y un héroe con apariencia elegida, verificar ambos clientes con `vi.waitFor`, desconectar y reconectar. Añadir rechazo de IDs/versiones incompatibles y comprobar que el nombre puede utilizarse después del rechazo.

```ts
const selected = defaultAppearance('mage', 'female');
const room = await colyseus.createRoom('game', {}) as GameRoom;
const observer = await colyseus.connectTo(room, { name: 'AppearanceObserver' });
const client = await colyseus.connectTo(room, {
  name: 'AppearanceHero', password: 'clave123', mode: 'create',
  className: 'mage', gender: 'female', appearance: selected,
});
await vi.waitFor(() => {
  expect(observer.state.players.get(client.sessionId)?.appearance.toJSON())
    .toMatchObject(selected);
});
```

- [ ] Añadir caso de save version 2 con spy de persistencia: login falla, no reemplaza el registro y libera la reserva de cuenta. Añadir login que intenta otro rostro/género/clase y comprobar que conserva la identidad guardada y stats originales.
- [ ] En `NetworkClient`, enviar apariencia únicamente como campo cosmético opcional, leer el schema a objeto plano y normalizar usando el contrato compartido. Añadir test de snapshot antiguo sin apariencia y del nuevo con todos sus campos.
- [ ] Ejecutar `npm run test --workspace @aden/server -- src/state/AppearanceState.test.ts src/persistence/CharacterSave.test.ts src/persistence/PersistenceService.test.ts src/rooms/CharacterAppearance.test.ts src/rooms/GameRoom.test.ts` y tests de red del cliente. Commit: `feat: persist and replicate modular character appearance`.

### Tarea 8: Integrar el creador y recuperar errores de carga sin perder elecciones

**Files:** crear `client/src/render/CharacterCustomizer.ts`, `CharacterCustomizer.css`, `CharacterCustomizer.test.ts`, `HeroPreview.test.ts`; modificar `ClassSelect.ts`, `ClassSelect.css`, `ClassSelect.test.ts`, `HeroPreview.ts`, `client/src/main.ts`.

**Interfaces:** `CharacterCustomizer(parent: HTMLElement, initial: CharacterAppearanceV1, onChange: (appearance: CharacterAppearanceV1) => void)` con `value`, `setClass(className: string)`, `setGender(gender: CharacterGender)`, `reset()` y `dispose()`; `HeroPreview.show(className: string, appearance: CharacterAppearanceV1): void`; `HeroPreview.focus(mode: 'body' | 'face'): void`; `HeroPreview.zoom(delta: number): void`. `LoginResult` agrega `appearance` en creación.

- [ ] Aplicar la guía de diseño de interfaz antes de componer el creador. Conservar lenguaje visual de fantasía y etiquetas españolas; escenario amplio, opciones reconocibles y estados claros. Crear controles desde el catálogo compartido, sin duplicar listas de IDs en HTML.
- [ ] Escribir tests DOM de cambio de rostro/cabello, cambio de clase que conserva apariencia, cambio de cuerpo que ajusta incompatibilidades, Aleatorio válido y Restablecer. Usar RNG fijo para Aleatorio.

```ts
it('cambiar clase conserva la identidad cosmética', () => {
  const initial = defaultAppearance('knight', 'female');
  const control = new CharacterCustomizer(document.body, initial, vi.fn());
  control.setClass('mage');
  expect(control.value).toEqual(initial);
  control.setGender('male');
  expect(() => validateAppearance(control.value)).not.toThrow();
  expect(control.value.skinToneId).toBe(initial.skinToneId);
  control.dispose();
});
```

- [ ] Cambiar `HeroPreview` a la ruta `createHero`. Reutilizar renderer/cámara y liberar solamente la instancia anterior; implementar giro, límites de zoom y encuadres desde bounds/altura del modelo. No disponer geometrías del factory cuando se cierra el preview.
- [ ] Separar apertura del formulario de carga de assets en `main.ts`: el formulario de login se monta aunque una carga falle. Crear solo se habilita con assets y preview válidos; entrar con cuenta existente espera los assets requeridos y ofrece reintento antes de conectar al mundo si faltan.
- [ ] Mantener selección y error en `ClassSelect.create(errorMsg)`. Ajustar tests existentes para inyectar un `HeroPreview` simulado y una factory, en vez de depender de crear sin una vista válida. El fallo de carga muestra Reintentar y no crea cuentas.
- [ ] Añadir prueba de carrera: dos selecciones mientras se resuelve la misma precarga; la última prevalece. Controlar la promesa de carga en el test, rechazarla primero y resolverla al reintentar. Comprobar que el error desaparece y el formulario envía la última apariencia.
- [ ] Probar teclado, estado elegido más allá del color, foco, viewport estrecho y movimiento reducido. Ejecutar `npm run test --workspace @aden/client -- src/render/CharacterCustomizer.test.ts src/render/ClassSelect.test.ts src/render/HeroPreview.test.ts`. Commit: `feat: add modular character creation controls`.

### Tarea 9: Aplicar los héroes al mundo y conservar la identidad al transformarse

**Files:** modificar `client/src/main.ts`, `client/src/render/EntityViews.ts`, `CharacterView.ts`, `EntityViews.appearance.test.ts`, `EntityViews.prediction.test.ts`, `CharacterView.test.ts`; crear `EntityViews.customization.test.ts`.

**Interfaces:** `CharacterFactory.createHero(className: string, appearance: CharacterAppearanceV1): Character` de tarea 3. Las entradas de `EntityViews.add/update` siguen siendo `PlayerSnapshot`; su firma no necesita argumentos cosméticos adicionales.

- [ ] Escribir tests usando una factory fake que registra por separado `create` y `createHero`: entrada normal usa héroe; transformación usa `create`; regreso usa la misma apariencia y equipo actual. Un snapshot solo de movimiento no aumenta el número de construcciones.
- [ ] Resolver `appearanceFromSave(snapshot.appearance, className, snapshot.gender)` para compatibilidad y construir una firma estable. Incluir clase, `appearanceKey` y `appearanceModel`. Guardar la apariencia de base aunque esté transformado.

```ts
function playerVisualKey(snap: PlayerSnapshot): string {
  const className = snap.className ?? 'knight';
  const appearance = appearanceFromSave(snap.appearance, className, snap.gender);
  return snap.appearanceModel
    ? `transform:${snap.appearanceModel}`
    : `hero:${className}:${appearanceKey(appearance)}`;
}
// En el reemplazo, escoger create(snap.appearanceModel) o createHero(...).
// El snapshot sigue siendo la fuente de verdad al recuperar el héroe.
```

- [ ] Añadir a `CharacterView` una operación explícita para inicializar un reemplazo según vida/muerte, usando el mismo estado y animación de caída que el flujo vigente. Transferir orientación antes de descartar el objeto anterior; restituir anillo local, target, raycast y nameplate sobre el nuevo root.
- [ ] Probar fin de transformación estando muerto y seleccionado, y posterior respawn. Verificar posición, orientación, anillos, visibilidad por mapa, apariencia y equipo. Añadir un caso donde cambie la apariencia base mientras existe la transformación en el snapshot y se aplique al recuperarla.
- [ ] Precargar héroes y armas antes del uso de sus APIs síncronas; los NPC siguen creando con el nombre legacy. Mantener la predicción de movimiento, las colisiones y los IDs de selección existentes.
- [ ] Ejecutar pruebas nuevas y de `EntityViews`, `CharacterView`, NPC, `EquipmentViews` y movimiento. Revisar un flujo en navegador: crear, entrar al pueblo, moverse, equipar, morir y volver a entrar. Commit: `feat: render persistent modular heroes in the world`.

### Tarea 10: Verificación final de contenido, multijugador y recursos

**Files:** actualizar `docs/hero-appearance.md`, `docs/hero-redesign-validation.md`, `client/public/models/LICENSES.md` y evidencia de `artifacts/hero-redesign/`; ajustar solo los archivos responsables de fallos reales encontrados.

**Interfaces:** ninguna nueva. Se verifican las interfaces y rutas ya integradas.

- [ ] Ampliar la galería a diez combinaciones clase/cuerpo y a todo el catálogo. Revisar cada rostro, cabello, barba y marca con al menos piel clara y oscura, sin conteos duplicados de opciones visualmente idénticas.
- [ ] Verificar todas las armas/escudo, torso/pantalones/botas/guantes/casco y accesorios de las familias actuales en ambos cuerpos. Comparar icono, suelo y equipo. Observar arco y ballesta en sus animaciones, hoja corta del pícaro y bastón del mago.
- [ ] Ejecutar dos clientes locales con apariencias distintas. Verificar elección, observador remoto, guardado/reconexión, transformación/reversión y muerte/respawn. Usar cuentas locales de prueba y no modificar cuentas existentes en servicios externos.
- [ ] Ciclar 50 veces la selección y 20 veces equipar/quitar/recrear un héroe; muestrear `renderer.info.memory` después de calentar. Los conteos deben estabilizarse por recursos cacheados, no crecer con cada iteración. Confirmar que el segundo cliente/personaje sigue visible y texturado después de retirar el primero.
- [ ] Verificar fallo y recuperación de un GLB esencial, navegación por teclado, viewport estrecho y movimiento reducido. Comprobar que login no depende de tener abierto el creador y que no se envía creación con preview fallido.
- [ ] Ejecutar los checks finales una vez que los checks focalizados pasen:

```powershell
npm test
npm run build --workspace @aden/client
npm run build --workspace @aden/server
git diff --check
```

- [ ] Registrar cada comando, resultado, métricas de rendimiento y capturas. Los builds no cuentan como comprobación estética. Si no se pudo ejecutar una verificación, describirla como pendiente y no declarar éxito completo.
- [ ] Revisar el diff y hacer una revisión final según el método de ejecución elegido. Commit: `docs: record modular hero visual and multiplayer verification` cuando la evidencia sea real. Presentar al usuario galería, capturas, cambios y limitaciones verificadas.

## Comprobación de cobertura del plan

| Especificación | Tareas |
| --- | --- |
| Intención, estilo, presupuesto cero | 1, 4, 5, 6 |
| Sustitución de anatomía y rostros | 1, 3, 5, 6 |
| Comparación visual previa | 5, revisión antes de 6 |
| Catálogo y creador | 2, 6, 8 |
| Guardado, migración, validación y red | 2, 7, 9 |
| Fábricas, rigs, propiedad de recursos | 3, 4, 9, 10 |
| Armaduras, slots y armas renovadas | 4, 6, 10 |
| Compatibilidad NPC/transformaciones | 3, 9, 10 |
| Carga fallida y accesibilidad | 8, 10 |
| Rendimiento, builds y flujo completo | 5, 10 |

## Ejecución y entrega

Antes de implementar: revisar este plan y seleccionar ejecución en esta sesión o con subagentes. Recomendación: ejecución en esta sesión, porque la inspección de assets, la galería y los ajustes de rig comparten estado y dependen de comprobaciones visuales sucesivas.

Al comenzar la implementación, leer la guía de worktrees y aislar el trabajo desde el HEAD que contenga este plan; usar el directorio devuelto por la herramienta, sin asumir que cambia el cwd. Preservar archivos ajenos, incluido `.claude/settings.local.json`. Añadir a Git solo las rutas de cada tarea. No publicar ni desplegar como parte de este plan.

Esta planificación no acredita disponibilidad de todos los assets gratuitos ni una mejora visual ya conseguida. Esas comprobaciones son los entregables del primer hito.
