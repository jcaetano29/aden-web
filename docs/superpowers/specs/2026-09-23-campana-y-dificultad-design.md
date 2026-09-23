# Campaña de Aden: dificultad y capítulo de la Memoria

Fecha: 2026-09-23. Estado: propuesta escrita para revisión; no implementada.

## 1. Intención y alcance

El usuario aprobó enfocar el siguiente trabajo en la campaña, con nuevos mapas y NPC. Aclaró su observación sobre la facilidad: matar bestias y jefes resulta demasiado sencillo; el inicio accesible le parece bien, pero espera mayor dificultad al avanzar. Precisó también que el nivel SÍ debe importar: deben existir bestias imposibles para el personaje en su nivel actual, a las que pueda volver después de progresar. La prioridad es una jerarquía real de poder por nivel, complementada por mecánicas de combate. Esto no equivale a pedir más tiempo de farmeo ni una reducción general de atributos.

El primer capítulo cubre niveles 10–15: Marismas del Velo y Monasterio de la Vigilia, tres NPC principales, ocho misiones principales y tres encargos opcionales. Es el alcance presentado en la propuesta a la que el usuario respondió «dale». La victoria sobre Nihil conserva su significado y sirve de transición.

La dificultad del tramo 1–10 se calibra antes de fijar los enemigos y recompensas de la ampliación. La experiencia buscada es una aventura accesible al inicio, con amenazas que superan claramente al personaje y dan una razón para crecer y volver. El jugador debe poder completar la ruta principal solo con cualquiera de las cinco clases al alcanzar su nivel y preparación previstos; no se promete que pueda vencer cualquier enemigo que encuentre. Cooperar sigue siendo una ventaja.

Quedan fuera de esta entrega nuevos niveles máximos, clases, asedios, raids obligatorias, instancias privadas, escoltas con IA, árboles de decisiones narrativas y una reforma completa de atributos o PvP.

## 2. Diagnóstico medido

Se ejecutó un análisis que importa las funciones actuales de estadísticas, equipo y daño. Fuentes reproducibles: `artifacts/campaign-balance/probe.mts` y `artifacts/campaign-balance/baseline.json`.

Reproducción en PowerShell desde la raíz:

```powershell
$env:TSX_TSCONFIG_PATH = 'server/tsconfig.json'
node --import tsx artifacts/campaign-balance/probe.mts
```

Perfil: nivel 9, 24 puntos repartidos en 8 STR / 8 AGI / 8 VIT; arma de clase +5 con habilidad de la Cripta, Guarda de Ceniza, Amuleto del Cazador y Sello del Veneno Antiguo. Son recompensas garantizadas para un participante elegible que completa esos hitos y las equipa. No se incluyen botín aleatorio, otras ranuras, buffs, críticos, curas ni movimiento. Se usa varianza de daño 1.

| Clase | Vida | Ataque | Defensa | Golpe normal de Nihil | % de vida por golpe | Ataques básicos necesarios para abatirlo |
|---|---:|---:|---:|---:|---:|---:|
| Caballero | 564 | 70 | 79 | 21 | 3,7% | 19 |
| Mago | 408 | 84 | 54 | 25 | 6,1% | 16 |
| Bárbaro | 512 | 85 | 65 | 23 | 4,5% | 16 |
| Pícaro | 455 | 81 | 64 | 23 | 5,1% | 17 |
| Explorador | 442 | 81 | 63 | 23 | 5,2% | 17 |

Son cálculos nominales, no una simulación del combate completo. Con ataques básicos continuos y el primer golpe en tiempo cero, los tiempos nominales para abatirlo están entre 17,6 y 28,8 segundos. No prueban cuánto tarda una persona en una partida real.

Otros resultados:

- La ruta obligatoria tiene 41 bajas, 4.980 EXP por misiones y 6.300 EXP por esas bajas: 11.280 EXP en total, suficiente para terminar en nivel 10. Las bajas incidentales, diarias y contratos aceleran más el recorrido.
- Cada nivel suma crecimiento automático de clase y tres puntos asignables. En nivel 10, los 27 puntos permiten agregar hasta 54 de ataque o 324 de vida si se concentra toda la inversión en un atributo.
- El mago del perfil recupera 7,4 MP/s incluso en combate. Bola de Fuego cuesta 16 MP cada 3 segundos, equivalentes a 5,33 MP/s si se usa siempre que está disponible. Esa habilidad sola puede sostenerse indefinidamente con ese perfil; otras combinaciones consumen más.
- Tres llamadas consecutivas al uso de una poción de 60 HP se aceptaron: vida 10 → 70 → 130 → 190. No existe cooldown de consumibles en el handler ni en esa función.
- El arma de la Cripta +5 suma 10 de ataque por mejora y habilita otra habilidad. También se suman las recompensas de armadura y accesorios de la campaña.
- El viaje con M no exige estar fuera de combate. Es posible retirarse por esa vía sin una ventana de preparación.
- El ataque normal de los enemigos tiene 700 ms de aviso y los mobs se mueven a 3,5 unidades/s frente a las 5 del jugador. La presión sobre clases a distancia debe medirse con movimiento real, además de comparar estadísticas.
- Los enemigos no tienen un campo propio de nivel en `MobTemplate` ni en `MobState`. El daño depende de ataque, defensa, factor y varianza, sin comparar el nivel del atacante con el del enemigo. El requisito de acceso de un mapa no reemplaza esa jerarquía de enemigos dentro del mapa.

La hipótesis principal es la acumulación de poder y recuperación frente a enemigos con poca presión, junto con la ausencia de un nivel enemigo explícito que participe en el balance. El conteo de EXP describe la ruta actual; no demuestra por sí mismo un problema de ritmo. La aclaración del usuario sitúa la prioridad en que el combate respete las diferencias de nivel.

## 3. Enfoques considerados

1. **Introducir una jerarquía de enemigos por nivel, calibrar el combate y después extender la campaña — recomendado.** Permite que progresar abra posibilidades reales y utilizar un personaje de nivel 10 representativo para diseñar el capítulo nuevo. Tiene trabajo inicial de medición, pero evita balancear dos veces.
2. **Aumentar únicamente vida y daño enemigos.** Es rápido, pero puede producir combates largos sin decisiones; tampoco corrige pociones consecutivas o recuperación excesiva.
3. **Rehacer atributos, daño físico/mágico y especializaciones.** Cambia demasiados sistemas a la vez y complica personajes existentes. Se reserva para un proyecto posterior si la calibración demuestra que hace falta.

Se adopta el enfoque 1 para esta propuesta.

## 4. Contrato de dificultad

### Nivel fijo y diferencia de poder

Cada enemigo tiene `level` y rango de amenaza (`normal`, `elite`, `boss`) definidos en sus datos y sincronizados al cliente. Sus estadísticas se fijan para ese nivel y rango. No se adapta automáticamente al nivel del jugador: una bestia de nivel 12 sigue siendo nivel 12 cuando el jugador pasa de 5 a 10 y luego a 15.

Propuesta de relación para un encuentro en solitario y equipo legal de ese tramo:

| Diferencia del enemigo respecto al jugador | Resultado buscado |
|---|---|
| 3 o más niveles por debajo | Claramente dominable; el progreso se siente |
| Entre −2 y +2 | Combate de su categoría: un normal es accesible y un jefe exige mecánicas |
| Entre +3 y +5 | Peligroso; requiere preparación y puede convenir volver o buscar grupo |
| +6 o más | Amenaza abrumadora: vencer solo debe ser inviable con una configuración legal de ese nivel |

Ejemplo de referencia: contra un jefe fijo de nivel 12, un personaje de nivel 5 no puede resolver el encuentro solo; en nivel 10 puede intentarlo con preparación y buena ejecución; en nivel 12 encuentra el desafío previsto; en nivel 15 lo supera con mayor comodidad. El equipo ayuda dentro de un tramo, sin borrar una diferencia extrema de nivel.

El balance combina HP/ataque/defensa propios del enemigo y un modificador PvE monotónico por diferencia de nivel cuando los valores base no basten. Ese modificador reduce el daño efectivo de un personaje demasiado bajo y aumenta la presión que recibe. No se introduce una tirada aleatoria de fallo en esta primera versión: el daño reducido y el aviso de amenaza deben ser comprensibles. Los coeficientes se calibran contra los perfiles y se publican en la tabla de balance, comprobando específicamente las diferencias +0, +2, +4, +6 y +8.

Todas las fuentes PvE deben respetar la regla: autoataque, habilidades, veneno, reflejo, áreas y ataques de invocaciones. El daño periódico se valida especialmente para que no permita anular la diferencia de nivel. Se prueba también disparar mientras se retrocede y abusar de los límites de persecución. La devolución a su territorio restaura el encuentro para impedir erosionarlo con entradas y salidas sucesivas. No se altera por esta vía la fórmula entre dos jugadores.

Los mapas contienen rutas de campaña acordes a su nivel y áreas opcionales con amenazas superiores claramente señaladas. Se reserva una bestia élite de nivel 7 en una zona lateral del Bosque, fuera del trayecto obligatorio del Alfa y de la llegada. Así un jugador inicial puede verla, evitarla y volver más adelante. Abrir un mapa no garantiza poder matar todo lo que vive allí.

La interfaz muestra nombre, nivel y categoría. El color del nivel indica amenaza relativa: verde para −3 o menos, amarillo de −2 a +2, naranja de +3 a +5 y rojo con calavera para +6 o más. Un jefe conserva su icono de categoría independientemente del color. El peligro se comunica antes de entrar en su radio de agresión; no se coloca una amenaza abrumadora sobre el spawn.

### Referencias de prueba

Por clase y por hito se usan tres perfiles: recompensas garantizadas, equipo habitual accesible de la región y una configuración optimizada legal. Se comparan asignación equilibrada, inversión ofensiva y defensiva. Los perfiles conservan los requisitos de nivel y compatibilidad de equipo reales.

La calibración usa estos objetivos iniciales con el perfil garantizado, jugando solo, usando habilidades apropiadas y dentro del tramo de nivel previsto. No son objetivos para un personaje muy inferior al enemigo:

| Encuentro | Objetivo inicial |
|---|---|
| Enemigo común de su región | 5–9 segundos; permite practicar sin consumir una poción en cada baja |
| Élite | 15–30 segundos; obliga a atender al menos una mecánica |
| Jefe de capítulo | 60–100 segundos de combate efectivo; muestra al menos dos ciclos de sus mecánicas |
| Ataque fuerte anunciado de un jefe | Aproximadamente 25–40% de vida de una configuración no especializada en defensa |
| Patrón fallido repetidamente | Tres errores fuertes consecutivos sin recuperación pueden matar; un error aislado con vida llena no debe hacerlo |

Estos rangos son objetivos de calibración, no resultados ya comprobados. La identidad de tanque permite mayor supervivencia. Un equipo optimizado debe mejorar el resultado, pero no permitir ignorar todas las mecánicas. Las pruebas en grupo de 2 y 3 jugadores verifican participación y legibilidad; no se añade escalado dinámico de enemigos en esta entrega.

### Curva de aprendizaje y jefes existentes

- **Bosque, niveles 1–3:** mantener enemigos individuales fáciles en la ruta inicial. El Alfa, nivel 4, presenta un único golpe fuerte anunciado con tiempo generoso para apartarse; fallarlo una vez permite recuperarse. La bestia élite de nivel 7 ocupa un área opcional separada y enseña a reconocer una amenaza para más adelante.
- **Ruinas, niveles 3–6:** el Centinela, nivel 6, alterna ataques normales y un barrido frontal cuya dirección queda fijada al comenzar el aviso. El jugador debe apartarse del frente o interrumpirlo cuando su clase pueda hacerlo. Las bestias élite requieren más atención que los enemigos comunes de la misma región.
- **Cripta, niveles 5–7:** conservar las dos salas y sus sellos. Ajustar el Behemoth y el Custodio, de niveles 6 y 7, para que sus áreas existentes tengan consecuencias y alcancen a ejecutarse antes de morir. El Custodio desplaza la presión entre posiciones del encuentro; se valida que todas las clases tengan una salida caminando.
- **Yermo, niveles 6–9:** combinar enemigos que presionan desde cerca y desde lejos en encuentros concretos. El jugador debe decidir a quién atacar primero y reconocer cuándo retirarse. Eliminar uno de esos enemigos reduce perceptiblemente la presión.
- **Nihil, nivel fijo 10:** dos fases, diseñadas para la llegada del personaje en 9–10. La primera enseña un golpe frontal anunciado y su ventana de recuperación. Al cruzar el 50% de vida invoca dos guardias una sola vez y combina el frontal con una zona anunciada bajo una posición fijada del jugador. Moverse, cambiar objetivos y reservar recursos deben importar. Las invocaciones se limpian al morir el jefe o reiniciar el encuentro y no generan recompensas infinitas al provocar resets.

Para Centinela, Custodio y Nihil se prueba explícitamente la estrategia de permanecer quieto usando solo autoataque: no debe ganar con el perfil garantizado al nivel previsto de la campaña. Un jugador atento de ese nivel sí debe poder ganar solo con cualquiera de las clases. La dificultad no depende de una habilidad que esa clase todavía no haya aprendido ni de llevar una pieza aleatoria específica. Un personaje mucho más avanzado puede dominarlos: esa ventaja es parte de la progresión solicitada.

Los ataques frontales y las áreas usan una representación compartida de forma, posición, orientación, duración y alcance. El servidor aplica el impacto a la geometría anunciada, y el cliente dibuja esa misma geometría. Un sistema dedicado de encuentros programa fases y ataques; `GameRoom` conecta sus resultados con daño, muerte y recompensas existentes. Los ataques fuertes no siguen al jugador durante el aviso. Las ventanas se comprueban con latencia de 100–150 ms y no exigen esquives al límite de un frame.

### Cambios de reglas propuestos

- **Pociones de HP:** cooldown compartido de 8 segundos entre tamaños y variantes; **pociones de MP:** otro cooldown compartido de 8 segundos. Validación y reloj del servidor, con tiempo restante visible. Una acción rechazada no consume objeto. Los tiempos quedan ligados a la cuenta durante su vigencia para evitar reiniciarlos mediante reconexión. Mejoras de equipo, tomos y otros objetos no heredan ese cooldown.
- **Regeneración de maná:** medir y calibrar por clase la recuperación en combate para que sostenga un ciclo moderado y agote reservas al mantener la rotación de máximo daño. Objetivo de referencia: el mago no sostiene indefinidamente su rotación ofensiva máxima con solo regeneración; puede completar un encuentro normal sin quedar obligado a esperar inmóvil. Fuera de combate conserva recuperación cómoda. La implementación determinará los valores concretos contra los perfiles y los registrará en una tabla de balance.
- **Estadísticas y equipo:** mantener inicialmente tres puntos por nivel, los atributos y las recompensas existentes. Medir cuánto aporta cada fuente y calibrar primero los enemigos contra ese poder real. Si una fuente concreta permite ignorar los encuentros incluso tras introducir mecánicas, justificar su ajuste con los perfiles antes de modificarla. Un cambio de coeficientes conserva puntos invertidos, nivel y objetos, y recalcula estadísticas de forma uniforme. No se aceptan estadísticas negativas ni vida por encima del nuevo máximo.
- **Viaje:** exigir 5 segundos sin combate para M y para el objeto de retorno. Ambos usan la misma regla del servidor y muestran el motivo del bloqueo. Morir mantiene la ruta de respawn; caminar para retirarse sigue siendo posible.
- **Encuentros:** dar patrones distintos a élites y jefes, con avisos que identifiquen área y momento del impacto. Ningún aumento de vida se aprueba si el encuentro no añade decisiones durante ese tiempo.

Los cambios globales a recursos afectan también PvP: deben probarse daño, curación y persecución entre jugadores para detectar regresiones, sin prometer un rebalance competitivo completo.

### Progresión compatible con la dificultad

Se mantienen inicialmente la curva global de EXP y las recompensas de EXP de las 12 misiones existentes. La ruta principal debe alcanzar todas sus puertas sin repetir un campamento para desbloquear la siguiente misión. Los encuentros se prueban tanto al nivel esperado como con un nivel extra por bajas incidentales y actividades opcionales.

La EXP de las misiones nuevas se distribuye para alcanzar 15 antes del prior, contando sus encuentros obligatorios. La duración total se mide en recorridos completos de las cinco clases; se registran minutos activos, traslados, bajas incidentales y repeticiones. El progreso más exigente debe surgir del combate y sus decisiones. No se establece una espera ni una cantidad extra de bajas como sustituto de esa dificultad.

## 5. Arco narrativo y regiones

Tras la caída de Nihil vuelven a abrirse las rutas de Aden. Los primeros viajeros que cruzan las marismas llegan sin recuerdos. La Orden de la Vigilia está usando conocimientos de la llama de Memoria sobre personas vivas. Su prior cree que puede preservar a los desaparecidos del reino utilizando recuerdos ajenos. Nihil no reaparece ni se revela como un simple títere.

### Marismas del Velo — niveles 10–12

Mapa de caminos elevados, agua somera no transitable, aldeas inundadas, señales apagadas y un puesto de expedición. Tres referencias visibles orientan el recorrido: puesto, caravana y torre de señales. Las rutas principales forman un circuito con atajos que vuelven al puesto, reduciendo viajes repetidos.

El puesto queda fuera de spawns y rutas de patrulla; no anuncia protección PvP que el servidor no implemente. Las pasarelas tienen anchura suficiente para movimiento y combate de varias personas. La niebla no oculta indicadores de ataque ni salidas.

### Monasterio de la Vigilia — niveles 12–15

Mapa con acceso exterior, claustro, archivo, celdas y campanario. La composición permite ver el destino final desde la entrada. Sus encuentros enseñan progresivamente a romper un anclaje, reposicionarse y aprovechar la recuperación enemiga.

Son dos mapas nuevos. El campanario y las celdas son sectores del monasterio, no otras instancias. Terreno, colisiones y navegación comparten geometría autoritativa; los límites globales y el suelo utilizado para seleccionar destinos se amplían para cubrirlos. La dirección artística combina madera mojada y vegetación baja en las marismas, piedra clara, metal y telas envejecidas en el monasterio.

## 6. NPC y misiones

| NPC | Ubicación | Motivación y función |
|---|---|---|
| Maera, exploradora | Puesto de las marismas | Busca a su hermano; inicia y recibe la investigación local |
| Iria, antigua archivista | Acceso al monasterio | Conoce el procedimiento que ayudó a crear y guía el rescate |
| Boren, intendente | Puesto de las marismas | Atiende provisiones y tres encargos opcionales sobre supervivientes |

Rowan entrega la transición desde Aden. A partir de ella, las misiones se aceptan y completan con el NPC de la región. Cada uno tiene silueta, nombre, posición y diálogos propios; pueden compartir esqueletos de animación y materiales existentes.

| ID propuesto | Misión | Objetivo y cierre |
|---|---|---|
| a2_arrival | Una ruta que vuelve | Rowan remite a Maera; llegar y hablar con ella abre el capítulo |
| a2_caravan | Huellas sin nombre | Examinar dos indicios distintos de la caravana y enfrentar a sus saqueadores; entregar a Maera |
| a2_signals | Luces sobre el agua | Restablecer tres señales distintas con defensores preparados; entregar a Maera |
| a2_crossing | El guardián del paso | Derrotar al élite de la ruta y presentar su sello a Iria; habilita el monasterio |
| a2_archive | Lo que la Vigilia conserva | Recuperar dos testimonios distintos del archivo; Iria explica el uso de la Memoria |
| a2_prisoners | Los nombres cautivos | Abrir tres celdas y derrotar al carcelero; los cautivos no requieren escolta con IA |
| a2_anchors | El pulso del campanario | Romper dos anclajes con encuentros de práctica; su entrega permite alcanzar 15 y aprender movilidad antes del jefe |
| a2_prior | El Prior sin Nombre | Vencer al prior y entregar a Iria; epílogo de los supervivientes y reconocimiento de Maera |

Los encargos de Boren se ofrecen en secuencia independiente, uno activo a la vez: recuperar provisiones, identificar a un viajero y recuperar una herramienta del archivo. Otorgan consumibles, oro y una opción de equipo; su EXP no es necesaria para completar la ruta principal.

La primera porción a construir comprende la transición, Maera, el circuito de caravana y un primer encuentro especial. Debe ser jugable desde un guardado que terminó Nihil. Sirve para comprobar claridad, combate y rendimiento antes de terminar el segundo mapa.

## 7. Combate y recompensas del capítulo

Las marismas combinan perseguidores, un enemigo que ataca a distancia y un élite con barrido anunciado. El monasterio combina guardianes de corto alcance y canalizadores cuyo ataque se puede evitar rompiendo el anclaje correspondiente. Se reutilizan rigs donde resulte adecuado, pero cada comportamiento y silueta debe poder distinguirse en combate.

El prior tiene nivel fijo 15 y alterna dos patrones: una zona anunciada que obliga a abandonar la posición y una canalización ligada a un anclaje visible. Romper el anclaje abre una ventana de daño. El patrón permite resolverlo caminando y usando habilidades; las cinco habilidades de movilidad de nivel 15 ofrecen ventajas distintas y ninguna es una llave obligatoria. El encuentro es público y se reinicia tras 15 segundos sin participantes vivos en su área de combate. El éxito no queda bloqueado por un jugador inactivo en otra parte del mapa.

La elegibilidad de avance y recompensa requiere misión activa, presencia en el mapa y cercanía de hasta 25 unidades al evento. Las bajas cooperativas usan una sola concesión por evento y personaje, evitando duplicar el crédito de party. La recompensa de misión se entrega una sola vez; el botín repetible del jefe tiene su tabla separada. Las interacciones con indicios, señales, celdas y anclajes registran IDs distintos para que repetir el mismo objeto no complete todo el contador.

Las recompensas garantizadas forman una base utilizable por las cinco clases. Se seleccionan piezas de nivel 10–15 del catálogo existente cuando sirvan al balance. El equipo del jefe inicial no recibe otra mejora universal +5 automáticamente. El arma de la Cripta, las armaduras heredadas y los bonus de conjunto se comparan contra todas las mejoras propuestas para que las decisiones de equipo sigan teniendo sentido.

## 8. Estructura técnica y guardado

- **NPC:** ampliar el registro con mapa, presentación y servicios. La interacción se valida contra el NPC exacto y su posición, con alcance de 5 unidades. Un ID desconocido se rechaza; no cae por defecto en Rowan. Los NPC históricos reciben explícitamente el mapa del pueblo.
- **Nivel enemigo:** definir nivel y categoría de todos los templates en datos compartidos, copiarlos a `MobState` al aparecer y comunicarlos a vistas, objetivo y barra de jefe. Aplicar el modificador PvE centralmente a todas las fuentes de daño pertinentes. Los templates antiguos reciben valores explícitos, sin derivarlos del jugador conectado ni del requisito de entrada al mapa.
- **Misiones:** definir emisor, receptor y pasos ordenados. Mantener los IDs históricos y sus estados. Un adaptador interpreta las misiones antiguas como un solo paso; las nuevas admiten interacción con NPC, objeto, bajas y visita. El servidor decide cuándo avanza cada paso.
- **Progreso:** conservar `questId` y `questProgress` como la proyección principal que consume el cliente. Añadir al objeto de progreso persistido el capítulo, el paso y los IDs de objetivos completados, además de un registro compacto para el encargo opcional. La entrega marca y recompensa en una operación de estado síncrona y se incorpora al guardado ordenado existente.
- **Compatibilidad:** `campaign_complete` en un guardado antiguo significa Acto I terminado. Al cargar, se ofrece la transición con Rowan sin repetir premios ni bajar niveles. No se reinicia una misión antigua en curso. Los personajes superiores a 15 conservan su poder y pueden completar la historia; no se usan como referencia de dificultad.
- **Cliente:** diálogos, mapa, minimapa y rastreador muestran el NPC receptor y el paso real, incluyendo mapa y requisito pendiente. Los cooldowns de pociones se comunican desde estado autoritativo. Los paneles muestran los nuevos coeficientes de atributos si la calibración llega a modificarlos.
- **Mundo:** agregar terreno, estructuras, colisiones, enemigos, objetos interactivos, ambientación y música de las dos regiones. La creación y visibilidad de NPC pasa a depender del registro, sin agregar otro bloque de objetos fijo por cada personaje.
- **Errores:** un paso inválido, objetivo ajeno, NPC lejano o mapa bloqueado devuelve un resultado comprensible sin conceder progreso. Una carga de personaje fallida debe impedir entrar con valores iniciales: `SupabasePersistence.load` actualmente devuelve `null` también ante errores, lo que debe separarse de “personaje inexistente” antes de ejecutar migraciones de campaña.

La primera calibración no borra objetos ni reasigna atributos gastados. Si cambian sus coeficientes, el documento de balance y la interfaz explican el cambio. La cola actual de guardado no es durable frente a una terminación forzada; este capítulo reutiliza esa infraestructura y no promete resolver esa limitación.

## 9. Validación y condiciones de entrega

1. Medir y archivar los perfiles por clase en niveles 3, 6, 9, 12 y 15, separando aportes de clase, atributos, equipo, mejoras y conjuntos.
   Probar el mismo enemigo fijo contra varias edades de personaje: diferencia +6/+8 inviable en solitario, +0 apropiada a la categoría y −3 claramente más fácil. Incluir equipo optimizado legal, todas las habilidades aprendidas, consumibles, veneno, reflejo, retirada disparando y resets de persecución. Verificar que la bestia lateral de nivel 7 no bloquea la ruta inicial.
2. Verificar las reglas de consumibles, regeneración, viaje, enemigos y habilidades con pruebas de comportamiento. Incluir intentos de usar varios tamaños de poción en el mismo cooldown y reconectar durante ese tiempo.
3. Simular la ruta de EXP principal: cada acceso es alcanzable sin encargos opcionales ni repeticiones. La habilidad de nivel 15 se aprende antes del prior. Medir también una ruta con diarias, contratos y bajas incidentales.
4. Probar NPC por mapa y distancia, emisor/receptor correcto, objetivos distintos, entregas repetidas y orden de pasos. Un mensaje fabricado no debe saltar el arco.
5. Probar guardados históricos en q1, q6, `campaign_complete`, niveles superiores a 15 y equipo con opciones. Repetir carga, desconexión y guardado sin premios duplicados. Un fallo de lectura no debe sustituir un personaje existente por uno nuevo.
6. Verificar rutas completas y salidas con el radio real del cuerpo; probar combate en pasarelas, celdas y campanario. Revisar marcadores y lectura de ataques en navegador.
7. Recorrer el contenido con las cinco clases y con grupos de 2 y 3. Registrar duración, muertes, pociones, daño recibido, EXP/minuto y motivos de derrota. Los cálculos nominales son una referencia, no sustituyen estas partidas.
8. Ejecutar TypeScript, suites relevantes y build de producción. La línea base revisada antes de este diseño pasó 665 pruebas (187 shared, 245 servidor, 233 cliente), TypeScript en los tres paquetes y build. Es evidencia del estado previo, no validación de la expansión.

## 10. Orden de entrega

1. Nivel fijo y categoría de enemigos, diferencias reales de poder y avisos de peligro; luego Centinela, Custodio y Nihil con dificultad progresiva. Validar mecánicas y recuperación contra los perfiles actuales, preservando el comienzo accesible.
2. NPC por región, pasos de campaña y compatibilidad de guardados.
3. Tramo jugable Rowan → Maera → caravana → encuentro → recompensa.
4. Marismas completas y validación del paso al monasterio.
5. Monasterio, aprendizaje de movilidad, prior y epílogo.
6. Recorridos de balance, cooperación y revisión visual final.

Este documento define la propuesta y sus criterios. Los valores finales de calibración se obtienen con los perfiles y los recorridos descritos; no se afirma que el juego ya sea más difícil. El siguiente paso del proceso es la revisión de este diseño antes de escribir el plan de implementación.
