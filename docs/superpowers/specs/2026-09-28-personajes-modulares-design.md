# Personajes modulares y creador de apariencia

Fecha: 2026-09-28.
Estado: dirección y alcance aprobados en conversación; esta especificación está pendiente de revisión del usuario.

## 1. Objetivo y decisiones acordadas

Reemplazar la representación de los personajes jugables por modelos atractivos, coherentes y personalizables. El problema expresado por el usuario es que los actuales parecen figuras de bloques deformadas. El éxito requiere una mejora visible de anatomía, rostro, cabello, vestuario y movimiento, además de un creador funcional.

Decisiones explícitas del usuario:

- Estética de fantasía estilizada: rostros y proporciones cercanos a Lineage II, combinados con armaduras y siluetas marcadas inspiradas en WoW/MU.
- Personalización mediante opciones prediseñadas combinables: cuerpo masculino/femenino, rostro, piel, peinado, color de cabello, ojos y barba o marcas.
- Vista previa 3D con giro y acercamiento.
- Exclusivamente recursos gratuitos.
- Apariencia persistente y visible para otros jugadores; equipo adaptado al personaje.
- Primera comprobación con un personaje masculino y otro femenino vestidos y animados, de cerca y desde la cámara del juego; después, extensión a las cinco clases.
- Esta etapa se concentra en personajes jugables y su creador.

Decisiones de diseño propuestas para concretar ese alcance: bases humanas adultas, cantidades mínimas del catálogo descritas abajo, mismo personaje por cuenta que en el juego actual y conservación de las cinco clases. Las cantidades son objetivos de esta implementación, no afirmaciones sobre el contenido de un paquete gratuito.

## 2. Situación actual y restricciones

El cliente usa Three.js y el servidor sincroniza jugadores con Colyseus. La apariencia guardada actualmente se limita a `gender`.

- `CharacterFactory.ts` carga los GLB, modifica proporciones y ejecuta `buildHeroAppearance`, que oculta superficies originales y reconstruye cuerpo, extremidades, cara, cabello y ropa alrededor del esqueleto antiguo.
- `HeroBody.ts` deforma el torso; otras piezas se fijan a huesos. Añadir detalle a ese ensamblaje no sustituye una base anatómica y un vestuario preparados para animación.
- `ClassSelect.ts` combina acceso y creación, con clase, género y una vista previa rotatoria.
- `HeroEquipment.ts` cambia materiales en piezas identificadas por nombres; `EquipmentViews.ts` utiliza nombres y posiciones de huesos del rig actual.
- `NpcAppearance.ts` también usa `CharacterFactory.create` y esos anclajes. Los NPC deben conservar su ruta actual durante esta etapa.
- `appearanceModel` en `PlayerState` es una transformación temporal por equipo. Es distinto de la identidad cosmética persistente.
- `CharacterSave.ts` guarda `progress` como JSON, y `SupabasePersistence.ts` lee y escribe ese objeto. La nueva apariencia se añade allí sin una columna SQL nueva.
- No se detectó Blender en PATH ni en la ubicación habitual examinada. El diseño prioriza recursos glTF/GLB; si el trabajo artístico necesita Blender, se deberá comprobar su disponibilidad antes de ejecutar esa parte.

## 3. Elección de la base artística

### Ruta elegida para la primera evaluación

Usar las ediciones Standard gratuitas de Universal Base Characters, Modular Character Outfits - Fantasy y Universal Animation Library de Quaternius. Son una familia diferente del antiguo pack RPG usado en el repositorio. Sus páginas oficiales describen un rig humanoide compatible, vestuario modular y licencia CC0.

La selección definitiva de archivos requiere inspeccionar las descargas Standard. Las páginas promocionan también el contenido pago: no se presupone que todos los cuerpos, peinados, prendas o clips anunciados estén en la edición gratuita. Los archivos Source y las opciones pagas quedan excluidos.

Alternativa evaluada: MakeHuman ofrece bases humanas y exportaciones utilizables bajo CC0, pero adaptar ropa y animaciones supone una ruta de producción distinta. Se conserva como alternativa si la muestra de Quaternius no satisface la dirección artística. Ese cambio requiere revisar la sección de assets antes de extender el trabajo; no se mezclarán cuerpos y rigs incompatibles de forma improvisada.

### Inventario y preparación

Registrar para cada archivo utilizado: fuente oficial, edición, licencia incluida, hash SHA-256, nombre original y modificaciones. Publicar solamente los recursos utilizados y un registro de procedencia en `client/public/models/LICENSES.md`.

Los originales descargados se guardarán en una carpeta de trabajo ignorada por Git. Un proceso reproducible de importación producirá los GLB y texturas optimizados que sí se incluirán en el juego. Las descargas grandes y recursos no utilizados no se enviarán al navegador.

Inspeccionar mallas, UV, materiales, pesos, huesos, clips y piezas intercambiables antes de construir el catálogo. Los rostros ausentes se deberán producir como variantes derivadas de la malla, con correcciones anatómicas localizadas y revisión visual. Cambiar únicamente una textura o un color no cuenta como rostro distinto.

Si los recursos gratuitos inspeccionados no permiten producir la muestra de calidad descrita en la sección 4, ese hito se considera fallido y se informa con capturas y limitaciones concretas. No se sustituye silenciosamente el objetivo por más primitivas geométricas ni se presenta el resto de la integración como una solución del problema visual.

## 4. Dirección visual y primera muestra

### Apariencia

- Proporciones adultas estilizadas, cabeza proporcionada, manos y pies reconocibles, cuello integrado y articulaciones que mantengan volumen al moverse.
- Rostros legibles desde frente, perfil y tres cuartos, con ojos, boca y nariz alineados con la geometría. La textura facial no debe proyectarse como una máscara sobre una esfera.
- Cabello con volumen diseñado, línea de nacimiento limpia y materiales que conserven detalle al variar el color.
- Metal, cuero y tela diferenciados por su respuesta a la luz. Usar ornamento y contraste en zonas que se reconozcan desde la cámara del juego.
- Siluetas por clase: placas para caballero, túnica para mago, equipo robusto para bárbaro, cuero ligero para pícaro y vestuario de exploración para ranger.
- Piel y ropa cotidiana sin brillo plástico ni emisión. Reservar efectos luminosos para equipo que ya los justifique.

### Muestra previa a la integración completa

Crear una galería local independiente del acceso a cuentas, reutilizando el contexto de `character-preview.html`. Mostrar los dos cuerpos con vestuario representativo de caballero y mago, al menos dos rostros distintos por cuerpo y dos peinados por cuerpo. Incluir piel y cabello claros y oscuros para comprobar los materiales.

La galería debe permitir:

1. Ver el personaje entero y acercar el rostro; girar 360 grados.
2. Comparar la versión actual y la nueva con cámara e iluminación equivalentes.
3. Ver la cámara y la iluminación del juego además de la presentación del creador.
4. Reproducir reposo, desplazamiento, ataque, golpe recibido y muerte; volver a reposo.
5. Comprobar vestuario ajustado y anclaje de arma en movimiento.

Entregar capturas comparables y la galería navegable. El usuario debe poder juzgar la mejora de la muestra antes de extenderla a las cinco clases. Las comprobaciones numéricas de geometría y los tests no sustituyen esta revisión estética.

## 5. Catálogo inicial y experiencia de creación

Mínimos propuestos para la versión completa:

| Categoría | Cantidad y comportamiento |
| --- | --- |
| Cuerpo | Masculino y femenino; proporciones fijas por base, sin sliders |
| Rostro | 4 por cuerpo, diferenciados por forma facial |
| Piel | 8 tonos, compartidos por rostro, cuello, manos y demás piel visible |
| Cabello | 6 opciones por cuerpo, incluyendo sin cabello |
| Color de cabello | 8 colores aplicados también a cejas y barba |
| Ojos | 6 colores, sin emisión artificial |
| Barba | Sin barba y 3 estilos en el cuerpo masculino |
| Marcas | Sin marcas y 3 opciones compatibles con ambos cuerpos y todos los tonos de piel |

Cada opción tiene un identificador estable, etiqueta en español y compatibilidad explícita con los cuerpos. Las opciones que no están producidas no aparecen como botones vacíos. Una limitación del paquete gratuito exige producir la variante o revisar expresamente el alcance; no cuenta como cumplimiento ofrecer opciones visualmente iguales.

El creador conserva las pestañas Entrar y Crear personaje. En creación presenta un escenario central amplio, selección de clase, categorías cosméticas con miniaturas o muestras de color y los campos de nombre y contraseña existentes.

- Cambios visibles inmediatamente sin reconstruir el renderer WebGL.
- Giro con arrastre y botones; acercamiento limitado, más acciones Cuerpo y Rostro para encuadres claros.
- La clase cambia vestuario y pose de presentación; conserva las elecciones cosméticas compatibles.
- Al cambiar de cuerpo, se conservan los colores y marcas compatibles. Rostro, cabello o barba incompatibles vuelven a un valor válido indicado visualmente.
- Un botón Aleatorio elige solamente combinaciones válidas; Restablecer recupera el preset inicial de la clase y cuerpo seleccionados.
- La ropa de presentación corresponde al atuendo inicial de la clase con equipo vacío. No otorga ni simula posesión de objetos de alto nivel.
- Una selección visible no depende solo del color: incluye nombre y estado seleccionado. Los controles funcionan con teclado y conservan foco y etiquetas accesibles.
- En pantallas estrechas los controles se apilan bajo el escenario. Se respeta movimiento reducido.
- Si el usuario recibe un error de nombre o contraseña, se conservan sus elecciones cosméticas.

## 6. Contrato de apariencia y guardado

Definir en `shared/src/appearance.ts` un catálogo sin dependencia de Three.js y un contrato `CharacterAppearanceV1` con estos campos:

| Campo | Valor |
| --- | --- |
| `version` | `1` |
| `gender` | `male` o `female`, reutilizando `CharacterGender` |
| `faceId` | ID del rostro |
| `skinToneId` | ID del tono de piel |
| `hairStyleId` | ID del peinado |
| `hairColorId` | ID del color de cabello |
| `eyeColorId` | ID del color de ojos |
| `facialHairId` | ID de barba, incluyendo `none` |
| `markingId` | ID de marca, incluyendo `none` |

Las opciones se transmiten como IDs del catálogo; no se aceptan URLs, rutas, geometría, colores arbitrarios ni parámetros de deformación proporcionados por el cliente.

Separar dos operaciones:

- Validación estricta para crear: rechaza versiones, tipos, IDs y combinaciones incompatibles con un mensaje comprensible. La validación se ejecuta antes de registrar la cuenta, para que un rechazo no reserve el nombre.
- Normalización de datos guardados: genera valores deterministas para saves anteriores y sustituye campos cosméticos inválidos por sus valores por defecto. Una versión guardada desconocida no se sobrescribe automáticamente: se rechaza la carga de ese personaje con un error de compatibilidad antes de añadirlo al estado jugable.

Persistir el objeto completo en `progress.appearance`. Conservar `progress.gender` como espejo de compatibilidad y escribir ambos desde la misma apariencia normalizada. En el estado sincronizado, `PlayerState.appearance` usa un schema tipado con los campos anteriores; `PlayerState.gender` sigue siendo un espejo derivado.

Los personajes antiguos reciben el preset predeterminado de su clase y género guardado, o masculino cuando tampoco existe género. Conservan nombre, contraseña, clase, estadísticas, equipo, inventario, misiones y progreso. La nueva apariencia se guarda mediante el ciclo normal de persistencia.

Al iniciar sesión con un personaje existente, el servidor restaura su apariencia guardada e ignora los valores cosméticos del mensaje de acceso. La ausencia completa de apariencia en clientes de compatibilidad usa el preset inicial; una apariencia suministrada e inválida se rechaza al crear.

Actualizar la clonación de los saves en memoria para copiar también el objeto de apariencia; modificar un snapshot no debe alterar un registro persistido. El cambio de schema Colyseus requiere desplegar cliente y servidor coordinadamente.

## 7. Organización del renderizado

### Separación entre héroes y modelos existentes

Mantener `CharacterFactory.create(modelName)` y su carga actual para NPC, enemigos y transformaciones. Introducir una ruta explícita `createHero(className, appearance)` que delegue en una fábrica de héroes modulares y devuelva el mismo contrato de reproducción de animaciones.

Los jugadores usan exclusivamente la ruta nueva una vez superada la muestra. Los NPC continúan por la ruta antigua aunque utilicen nombres como Knight o Mage. No se cambia el significado global de esos IDs. El código antiguo de apariencia no se elimina mientras tenga consumidores.

Componentes con responsabilidades acotadas:

| Componente propuesto | Responsabilidad |
| --- | --- |
| `shared/src/appearance.ts` | Contrato, catálogo, defaults, validación y normalización |
| `client/src/assets/heroManifest.ts` | Assets, licencias referenciadas, piezas, clips y compatibilidades del catálogo |
| `client/src/render/ModularHeroFactory.ts` | Carga compartida y construcción de cada héroe con materiales propios |
| `client/src/render/HeroRig.ts` | Resolución de huesos y anclajes semánticos del nuevo rig |
| `client/src/render/ModularHeroEquipment.ts` | Vestuario, máscaras de piel, ocultación de cabello y equipo del nuevo cuerpo |
| `client/src/render/CharacterCustomizer.ts` | Controles y estado de selección cosmética |
| `HeroPreview.ts` | Cámara, iluminación, interacción y ciclo de vida de la vista previa |
| `server/src/state/AppearanceState.ts` | Representación sincronizada de la apariencia validada |

Los nombres propuestos pueden ajustarse en el plan, conservando estas responsabilidades. `ClassSelect`, `NetworkClient`, `GameRoom`, `CharacterSave` y `EntityViews` conectan esos componentes con los flujos existentes.

### Mallas, animaciones y equipo

El nuevo cuerpo y la ropa deformable usan mallas con pesos sobre un esqueleto compatible. Los peinados rígidos siguen la cabeza; prendas y accesorios con movimiento articulado usan el rig correspondiente. La importación alinea posición de reposo, ejes y unidades una sola vez.

`HeroRig` expone anclajes semánticos de cabeza, torso, pelvis, manos y pies. El equipo usa sus transformaciones locales preparadas durante la importación; no presupone nombres como `WeaponR` ni aplica los offsets del cuerpo antiguo al nuevo.

Cada clase tiene una selección explícita de clips de reposo, caminar/correr, ataque, golpe y muerte. El mago necesita un ataque de lanzamiento y el ranger uno de arco reconocible; la selección por substring existente no valida por sí sola esa semántica. Usar animaciones en el lugar para que Colyseus siga controlando la posición. Un clip imprescindible ausente es un fallo de la muestra o de la integración de esa clase.

La ropa inicial identifica a cada clase. Las familias de tela, cuero y placas se representan con piezas ajustadas, con acabados según el equipo existente. No se exige una malla exclusiva por cada ítem del catálogo. Los cascos ocultan las partes de cabello incompatibles y las prendas ocultan las superficies corporales que cubren. Quitar equipo restaura el atuendo base y el cabello seleccionado.

Las ranuras actuales de armas, escudo, casco, armadura, pantalones, guantes, botas, alas y accesorios deben funcionar con los nuevos anclajes. Los compañeros y monturas conservan su comportamiento actual. La apariencia no modifica atributos, alcance, velocidad, habilidades ni reglas de equipamiento.

### Sincronización y transformaciones

`PlayerSnapshot` incluye la apariencia normalizada. `EntityViews` elige la ruta de héroe con clase y apariencia, salvo cuando `appearanceModel` indique una transformación temporal.

Al terminar una transformación, recrea el héroe con su apariencia completa y el equipo actual. Conserva posición, orientación, selección, identificación del jugador local y estado muerto/vivo. No guarda el monstruo transformado como apariencia permanente.

La firma visual incluye clase, apariencia y transformación. Las actualizaciones de posición no reconstruyen el personaje. Si cambian materiales de un jugador, no se alteran los de otro ni los de la galería.

### Carga, fallos y recursos

Precargar el catálogo requerido y cachear cada asset por URL. Cuerpos, ropa y texturas reutilizables se comparten; solo se duplican los materiales o geometrías que realmente varían por instancia. El creador y el mundo utilizan el mismo ensamblado y las mismas reglas de apariencia.

Un error de carga en el creador ofrece Reintentar y desactiva Crear personaje hasta recuperar una vista válida, manteniendo la selección. El acceso a una cuenta existente sigue disponible; si sus recursos esenciales fallan, se muestra un error de carga recuperable antes de entrar al mundo. No se acepta como éxito una creación con el canvas vacío.

Definir propiedad explícita de recursos: cada instancia libera su mixer y recursos exclusivos al retirarse; el repositorio compartido libera geometrías y texturas al cerrar la aplicación. Cambiar de clase, volver desde una transformación o cerrar una vista previa no dispone recursos usados por otros personajes.

## 8. Rendimiento y comprobación

Presupuestos iniciales para revisar durante la muestra: hasta 35.000 triángulos y 12 llamadas de dibujo para un héroe con atuendo base, excluyendo efectos y compañeros; texturas de hasta 2.048 px para rostro/cuerpo y 1.024 px para piezas pequeñas; hasta 15 MiB de recursos nuevos transferidos para la galería de dos cuerpos después de optimizar.

No se agregan dependencias pesadas de renderizado ni se cambia de motor. Registrar rendimiento con 1, 10 y 20 héroes en el mismo navegador, resolución y equipo, después de cargar los assets. Documentar triángulos, llamadas de dibujo, memoria de recursos, bytes transferidos y tiempos de frame. El objetivo de fluidez es 60 FPS a 1080p en el equipo de verificación; no se presenta como una garantía para hardware no medido.

Pruebas automáticas que protegen comportamiento:

- Catálogo y validación: combinaciones válidas, tipos incorrectos, IDs desconocidos, incompatibilidades y defaults deterministas.
- Persistencia: round-trip de cada campo, migración de saves anteriores, versión desconocida y aislamiento de las copias en memoria.
- Conexiones reales: creación con apariencia, observador remoto, reconexión, rechazo previo a registrar cuenta e imposibilidad de reemplazar la apariencia durante login.
- Creador: cambios de selección, conservación entre clases y tras errores, reinicio, aleatorio válido y manejo de carga fallida.
- Renderizado: dos personajes distintos no comparten mutaciones de materiales; equipo y transformación recuperan la identidad completa; el descarte de una instancia no rompe otra.
- Regresión: NPC actuales, enemigos, movimiento, muerte/reaparición, selección y slots de equipo existentes.

Verificación visual obligatoria en navegador con los assets reales:

- Galería comparativa aprobada antes de ampliar el catálogo.
- Cinco clases en ambos cuerpos; rostros y peinados a corta distancia.
- Secuencias de movimiento y combate con ropa: sin huecos visibles en cuello/articulaciones, penetraciones persistentes, ojos flotantes, manos deformadas o armas desancladas.
- Equipar y quitar prendas y casco; comprobar cabello y piel oculta/restaurada.
- Dos clientes con apariencias distintas, reconexión y transformación reversible.
- Cámara del juego, sombras y luces de mapa; UI en escritorio y viewport estrecho.
- Build de cliente y servidor y suites relevantes del repositorio; después, suite completa por los cambios compartidos y de red.

Si una comprobación visual o de rendimiento falla, registrar el caso y corregirlo antes de declarar el rediseño terminado. Un resultado técnicamente válido pero visualmente insatisfactorio no cumple el objetivo.

## 9. Límites y entregables

Esta etapa entrega una muestra visual revisable, diez presentaciones de clase/cuerpo sobre bases modulares, el catálogo cosmético, el creador integrado, persistencia, sincronización, adaptación de equipo y evidencia de verificación.

Quedan fuera del alcance inicial: nuevas razas, sliders anatómicos, editor facial libre, varias cuentas/personajes por cuenta, cambios de apariencia posteriores a la creación, transfiguración cosmética de equipo, nuevas mecánicas de combate, rediseño artístico de NPC/enemigos, escenarios y HUD general. Los ajustes de iluminación se limitan a la galería y el creador; cualquier ajuste imprescindible en el mundo debe justificarse con comparación visual.

La secuencia de trabajo tiene tres hitos dependientes: muestra artística y comprobación de assets gratuitos; integración completa de cinco clases, creador, equipo y guardado; verificación multijugador, visual y de rendimiento. El plan de implementación se redacta después de revisar esta especificación.

## 10. Fuentes verificadas

Consultadas el 2026-09-28; volver a contrastar el contenido exacto con los archivos descargados:

- Universal Base Characters: https://quaternius.com/packs/universalbasecharacters.html
- Ediciones y descarga de cuerpos: https://quaternius.itch.io/universal-base-characters/purchase
- Modular Character Outfits - Fantasy: https://quaternius.com/packs/modularcharacteroutfitsfantasy.html
- Ediciones y descarga de ropa: https://quaternius.itch.io/modular-character-outfits-fantasy/purchase
- Universal Animation Library: https://quaternius.com/packs/universalanimationlibrary.html
- Licencias de MakeHuman/MPFB, alternativa de producción: https://static.makehumancommunity.org/about/license.html

La investigación de fuentes confirma candidatos y condiciones publicadas; todavía no se han descargado, importado ni validado visualmente los nuevos modelos dentro del juego.
