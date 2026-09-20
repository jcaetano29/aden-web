# Integración del catálogo en Aden

## Base encontrada y decisión de clases

El juego tenía Caballero (tanque/control), Bárbaro (daño físico), Mago (hechizos) y Pícaro (asesino ágil). Las plantillas vivían en `shared/src/items.ts`; había tres ranuras, bonos planos y cinco rarezas fijas. El servidor Colyseus era autoritativo y persistía inventario y equipo como mapas JSON.

Se añade **Explorador**, con seis habilidades y combate con arco/ballesta y munición. Conserva las cuatro clases y sus kits. Una evolución no era necesaria: faltaba el rol de arquero desde el inicio, mientras el Pícaro ya tenía una identidad cuerpo a cuerpo. El modelo usa el rig existente del Pícaro con arco y carcaj añadidos; no requiere un GLB externo nuevo.

- DK → Caballero y Bárbaro; armas pesadas compartidas según su tipo.
- DW → Mago.
- ELF → Explorador para arcos/ballestas/munición; Explorador y Pícaro para equipo ágil.
- TODAS → las cinco clases.

El [mapeo completo de los 208 objetos](catalogo-items.md) incluye nombre original, ID de referencia, nombre/ID nuevos, clases y tier. Hay 17 familias de armadura de cinco piezas. Los requisitos se distribuyen entre niveles 1 y 40 por familia; las alas requieren nivel 40. Se conservan categoría, subcategoría y manos.

## Equipo y calidad

Ranuras: arma, escudo, casco, armadura, guantes, grebas, botas, accesorio, anillo, alas y compañero. Un arma de dos manos y un escudo son incompatibles en ambos sentidos. El servidor verifica posesión, clase y nivel antes de consumir o mover equipo.

- **Normal:** estadísticas base y mejora +0–+9. Sin Suerte, habilidad, opción adicional ni Excellent.
- **Mágico:** modificadores adicionales; nunca obtiene opciones Excellent por el mero hecho de mejorarlo.
- **Excelente:** 1–6 opciones distintas del grupo ofensivo (armas) o defensivo (equipo restante). Puede sumar mejoras y modificadores compatibles.
- **Conjunto:** no es una calidad. Dos piezas distintas dan +2 defensa; tres dan +4 defensa y +15 vida; cinco dan +8 defensa, +35 vida y +3 ataque. Cinco piezas con Suerte agregan +3 defensa.

Cada nivel de mejora añade +2 al ataque de un arma o a la defensa de una armadura, escudo o alas. La opción adicional añade +4 por paso, hasta +28, sólo en armas, armaduras y escudos. Suerte añade 5 puntos porcentuales de crítico y 25 de éxito al mejorar. Skill otorga una acción utilizable mientras el arma está equipada.

Opciones ofensivas: 10% golpe excelente, ataque +nivel/20, ataque +2%, velocidad +7%, recuperar 1/8 de vida o maná por baja. Defensivas: vida/maná +4%, esquive +10%, reducción +4%, reflejo +5%, oro de monstruos +30%. Se limita esquive/crítico/Excellent a 50%, reducción a 60%, reflejo a 30% y velocidad de ataque a +50%. El ataque excelente multiplica daño por 1,75 y el crítico por 1,5; si coinciden se usa Excellent.

Anillos y colgantes aplican resistencias elementales; el anillo de metamorfosis cambia la apariencia a espectro y la restaura al quitarlo. El colgante de aptitud añade regeneración de maná. El guardián reduce daño y regenera vida durante combate; el compañero ofensivo aumenta ataque y la montura aumenta movimiento. Las alas añaden ataque, absorción y movilidad: no habilitan vuelo libre ni atraviesan límites del mapa.

## Obtención y uso

Mercader: consumibles, munición y joyas. Herrero: bases normales de equipo. Todos los objetos del catálogo tienen precio y pueden obtenerse por esas tiendas; esta es la alternativa a crear eventos exclusivos para ciertos objetos del origen. El botín agrega una tirada por enemigo/cofre, limitada por requisitos de nivel del mapa. Puede dar calidad Mágica o Excelente: equipo Excelente tiene hasta dos opciones en enemigos normales y hasta seis en el Rey Nihil; cada opción extra tiene una probabilidad de 20%.

Las joyas se usan desde **I**, eligiendo un equipo propio como objetivo:

- Bendición adaptada: +1 seguro hasta +6.
- Alma adaptada: +1 hasta +9, 50% de éxito o 75% con Suerte; el fallo resta un nivel y nunca destruye el objeto. Un éxito tiene 10% de otorgar Suerte.
- Vida adaptada: 65% de agregar +4 de opción, hasta +28; el fallo no elimina opciones.
- Caos adaptado: otorga Skill a un arma. Si el objetivo es un arma +6 o mayor de tier 3 o mayor, consume el arma y 500 de oro para fabricar el arma ritual de ese tipo. Un arma ritual +9, personaje nivel 40 y 500 de oro producen las alas de su rol. El resultado se entrega al inventario. Estas combinaciones reutilizan la selección de objetivo; no se añade un edificio de Chaos Machine.

Los doce pergaminos enseñan hechizos adicionales permanentes al Mago, sin sustituir sus desbloqueos por nivel. La barra mantiene teclas 1–6 y permite hacer clic y desplazarse para acceder a las habilidades adicionales. Pócimas restauran vida/maná, antídoto quita veneno, bebida da una mejora temporal y pergamino de retorno lleva al pueblo. La munición se consume por disparo, incluido el uso de habilidades de arco.

## Guardado y compatibilidad

Cada ejemplar nuevo tiene un ID versionado que incluye ID base, calidad, mejora, Suerte, Skill, opción adicional, máscara Excellent y nonce único. `getItem` valida y resuelve este ID de la misma forma en cliente y servidor. Las mejoras reemplazan sólo el ejemplar elegido. Se mantienen los mapas JSON existentes: no se necesitan columnas nuevas en Supabase.

Los IDs, estadísticas, rarezas y guardados del equipo antiguo continúan funcionando. Los hechizos aprendidos se guardan en el campo opcional `progress.learnedTomes`, por lo que un guardado anterior equivale a no tener tomos aprendidos. La prueba de restauración carga un personaje con tomo y un arma Excelente mejorada en una nueva sesión.

## Archivos

- Catálogo/mapeo: `shared/src/catalog.ts`, `catalog.test.ts`, `scripts/generate-catalog.mjs`, `docs/catalogo-items.md`.
- Reglas: `shared/src/items.ts`, `equipment.ts`, `itemOptions.ts`, `loadout.ts`, `itemSkills.ts`, `classes.ts`, `combat.ts`, `protocol.ts`, `index.ts` y sus pruebas.
- Servidor: `server/src/systems/ItemSystem.ts`, `CombatSystem.ts`, `rooms/GameRoom.ts`, `state/PlayerState.ts`, `persistence/CharacterSave.ts` y pruebas de reglas y sala.
- Cliente: `client/src/main.ts`, `net/NetworkClient.ts`, `assets/manifest.ts`, `input/InputController.ts`, paneles de inventario/tienda/habilidades/selección, `CharacterFactory.ts`, `HeroDetails.ts`, `EntityViews.ts` y pruebas correspondientes.

## Verificación

Se verifican cobertura de los 208 registros, rarezas inválidas, clases/manos, conjuntos, mejoras independientes, forja, munición, combate, reflejo letal, regeneración de mascota, persistencia y UI. Se ejecutan las suites de los tres workspaces, TypeScript y build Vite. La verificación de navegador incluye selección del Explorador y equipar/desequipar su arco con cambio real de ataque 20 → 15 → 20 y confirmación del servidor, sin errores de consola.

El balance numérico y las probabilidades están adaptados a Aden: requieren pruebas de juego prolongadas para afinar economía y PvP. El sistema utiliza los modelos existentes; no genera 208 modelos 3D diferentes ni un sistema de animación de vuelo/montura.

Resultado final: **381 pruebas aprobadas** (171 compartidas, 125 servidor, 85 cliente), TypeScript correcto en los tres módulos y build Vite correcto. La advertencia de tamaño de bundle mayor a 500 kB permanece. También se verificó visualmente búsqueda y compra de munición con descuento de oro y confirmación del servidor.
