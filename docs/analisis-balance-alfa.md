# Análisis de balance alfa: campaña de nivel 1 a 10

## Alcance y método

Auditoría estática y determinista del recorrido obligatorio definido por `QUEST_ORDER`, sin presentarla como playtest. Se sumó la EXP de cada baja obligatoria y de cada misión usando `MOB_EXP`, `expToNextLevel()` y `gainExp()` (`shared/src/progression.ts:4-12,18-47,75-94`); se asumió que el jugador equipa de inmediato todas las recompensas garantizadas, no reparte puntos de atributo y no obtiene drops aleatorios. Para comparar combate se usó `computeDamage()` con varianza neutra 1, el arma garantizada correspondiente y el primer skill de clase cuando quedaba disponible; cada encuentro comenzó con HP/MP completos. Las cifras de TTK son un modelo de ritmo y no incorporan movimiento, latencia, pulls múltiples ni errores humanos.

La ruta mínima queda bien encadenada: q1 termina en nivel 2; q2 en 3; Alfa en 4; q3 en 5; Centinela/q4 en 6; Cripta en 7; q5 en 9; Nihil/q6 en 10. No hace falta farmear para cumplir los gates de Ruinas 3, Cripta 5, Yermo 6 y Trono 9 (`shared/src/world.ts:71-125`). La EXP final es nivel 10 con 174 EXP. Esto valida el esqueleto de progresión.

Como control de viabilidad, el TTK idealizado de Alfa / Centinela / Custodio / Nihil fue, en segundos: Explorador 7,3 / 11,6 / 14,5 / 23,2; Caballero 11,2 / 17,6 / 22,4 / 33,6; Mago 6,0 / 9,0 / 10,5 / 16,5; Bárbaro 6,0 / 9,0 / 12,0 / 18,0; Pícaro 4,4 / 7,7 / 11,0 / 14,3. Todos superan el chequeo simplificado de supervivencia contra golpes básicos si llevan las piezas garantizadas, pero el Caballero tarda 2,35 veces lo que el Pícaro contra Nihil. Conviene medir esa diferencia en una sesión real antes de tocar stats; un criterio razonable es que el cociente máximo/mínimo de TTK en jefes obligatorios no exceda 1,8 salvo que la utilidad defensiva reduzca muertes o consumo de pociones de forma observable.

## Hallazgos y cambios mínimos recomendados

### 1. La primera misión expone al nivel 1 a PvP sin protección

q1 exige seis bajas en Bosque (`shared/src/quests.ts:24-34,103-106`), el Bosque admite nivel 1 y tiene `safe:false` (`shared/src/world.ts:71-81`). El servidor sólo comprueba que ambos estén en mapas no seguros y que no sean aliados; no hay nivel mínimo, diferencia máxima de nivel, consentimiento ni protección inicial (`server/src/rooms/GameRoom.ts:476-480,1154-1165`). Un atacante de nivel 40 sin equipo ya tiene 130-174 pAtk por crecimiento de clase (`shared/src/classes.ts:32-75`): cuatro de las cinco clases hacen 147-150 de daño básico contra el Caballero nivel 1 (140 HP/16 defensa), suficiente para matarlo de un golpe. Cada muerte además quita 10% de oro y 5% de la banda de EXP actual (`shared/src/pvp.ts:3-20`), mientras el asesino recibe crédito PvP (`server/src/rooms/GameRoom.ts:289-295`).

**Cambio mínimo:** protección de novato hasta nivel 3 inclusive, o hasta entregar q2; los mobs siguen atacando normalmente. **Aceptación:** en Bosque, un jugador protegido no puede infligir ni recibir daño/DoT de otro jugador y no sufre penalidad PvP; al perder la protección, autoataques y skills recuperan exactamente las reglas actuales.

### 2. El arma +5 de Cripta comprime todo el progreso de armas posterior y es repetible

q2 entrega un arma de clase +2 (`shared/src/quests.ts:108-112`; `shared/src/adventure.ts:14-18`). El Custodio entrega la misma base a +5 y con skill de arma (`server/src/rooms/GameRoom.ts:946-955`); cada nivel suma 2 pAtk (`shared/src/itemOptions.ts:51-54`). El salto garantizado es por tanto +6 pAtk: Puñal 8→14, Destral 10→16, Bastón 9→15 y Arco 9→15. En cambio, las opciones editoriales de Yermo son Arco 10 y Cayado 9, y las del Rey están entre 10 y 13 pAtk base (`shared/src/adventure.ts:61-69`; `shared/src/catalog.ts:1120-1144,1483-1506,113-137,498-521,887-910`). Así, gran parte del loot de nivel 7-10 aparece en rojo frente al premio de nivel 6; el arma además agrega `power_strike`, `item_arcane` o `item_volley` (`shared/src/itemSkills.ts:21-29`).

El premio no comprueba `questId` ni posesión previa: cualquier participante vivo a 25 unidades recibe otro +5 en cada clear (`server/src/rooms/GameRoom.ts:946-955`), y la expedición se reinicia cuando sale el último participante (`server/src/rooms/GameRoom.ts:154-165`). **Cambio mínimo:** primer clear de `q_crypt` entrega una sola arma +3 con skill; clears posteriores entregan consumible/oro, no otra arma. **Aceptación:** q2→Cripta mejora exactamente +2 pAtk más el skill; una segunda expedición no crea otra arma; al menos una opción de arma válida por clase en Yermo/Trono puede superar el premio de Cripta con un roll alcanzable.

### 3. El Explorador agota su munición garantizada en la ruta obligatoria

Sólo el Explorador empieza con arma y 100 flechas (`server/src/rooms/GameRoom.ts:1504-1509`). Tanto autoataques como sus tres skills de arco y `item_volley` consumen una unidad (`server/src/rooms/GameRoom.ts:482-484,1144-1149`). Con daño neutro, gear garantizado y HP/MP completos por objetivo, el límite inferior optimista del recorrido obligatorio es 127 flechas; usando sólo autoataques son 194. En este segundo caso las 100 iniciales se terminan durante la segunda sala de Cripta, antes del Custodio. Comprar munición cuesta 1 oro por unidad y sólo se hace en servicios del pueblo (`shared/src/items.ts:93-103`; `server/src/rooms/GameRoom.ts:560-586`), por lo que el coste es pagable, pero el corte ocurre dentro de la actividad que entrega precisamente otra arma con munición.

**Cambio mínimo:** entregar 100 flechas adicionales al Explorador al completar q2 y mencionarlas en el texto/hint; alternativa equivalente: comenzar con 200. **Aceptación:** la suma de munición garantizada antes de Cripta es al menos 200; una prueba de ruta con autoataques y recompensas garantizadas completa las bajas obligatorias hasta Nihil sin quedar en cero; las compras siguen siendo útiles para farmeo y fallos.

### 4. `ember_axe` crea un pico aleatorio y desigual entre clases

Cada Verdugo de q5 tiene 13% de soltar `ember_axe` (`shared/src/items.ts:221-227`); en ocho bajas la probabilidad de obtener al menos una es `1 - 0,87^8 = 67,2%`. El hacha da +23 pAtk y no declara `classes` (`shared/src/items.ts:57-60`), por lo que `canEquipItem()` la acepta para todos (`shared/src/loadout.ts:14-23`). Supera en 7-9 pAtk las armas +5 de Cripta. Mago conserva Fireball y recibe el pico completo; Explorador puede equiparla, pero pierde alcance y sus skills de arco porque el servidor exige un arma con `ammo` (`server/src/rooms/GameRoom.ts:482-484`). El resultado mezcla azar, identidad de clase y una trampa de equipamiento durante una misión obligatoria.

**Cambio mínimo:** retirar `ember_axe` de la tabla legacy de `ash_warrior` y usar recompensas de catálogo con restricciones de clase, o declarar sus clases y ofrecer alternativas equivalentes a las restantes. **Aceptación:** ningún arma de Yermo es equipable por una clase no declarada; la comparación de equipo no recomienda al Explorador un arma que deshabilita sus skills principales; las cinco clases tienen una ruta de mejora post-Cripta de potencia comparable.

### 5. Dos recompensas garantizadas pueden duplicarse en la misma baja y no existe sumidero

El Centinela tiene 50% de soltar `crypt_plate`, pero q4 entrega `crypt_plate` garantizada inmediatamente después (`shared/src/items.ts:203-211`; `shared/src/quests.ts:113`). Nihil repite el patrón: 50% de `nihil_aegis` en su tabla y la misma armadura como recompensa garantizada de q6 (`shared/src/items.ts:230-237`; `shared/src/quests.ts:81-89`). No hay venta, reciclaje ni conversión de equipo implementada, así que en la mitad de las primeras victorias la recompensa narrativa llega duplicada y sin valor sistémico.

**Cambio mínimo:** eliminar esas dos piezas de las tablas aleatorias y sustituirlas por slots complementarios del mismo tier. **Aceptación:** una baja que habilita una pieza garantizada no puede soltar esa misma base; cada drop posible del Centinela y Nihil aporta un slot, opción o uso distinto del premio de misión.

## Prioridad sugerida para alfa

Antes de abrir concurrencia pública: protección PvP de novato y presupuesto de flechas. Antes de evaluar retención/loot: premio de Cripta de una sola vez y curva de armas posterior, luego retirar los duplicados y el hacha legacy universal. La progresión de EXP y los gates 1-10 no necesitan cambios con las reglas actuales.

## Criterio de implementación

Las cantidades propuestas y el umbral de TTK son hipótesis de ajuste, no requisitos aprobados ni resultados de partidas. Antes de aplicar cambios, reproducir las cifras con una herramienta o prueba guardada, preservar equipo y progreso ya existentes y revisar incentivos de la Cripta repetible. Cambiar la recompensa de futuras expediciones no debe quitar armas a personajes que ya las obtuvieron. Comparar alternativas pequeñas, por ejemplo escalonar recompensas o restringir una tabla de botín, antes de agregar sistemas nuevos de economía.
