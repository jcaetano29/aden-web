# Campaña inicial: niveles 1–10

La campaña conserva los IDs q1–q6 y agrega seis objetivos de recuperación, interacción, exploración, jefe de mundo y mazmorra. Se entrega cada misión al Anciano Rowan en el pueblo. El final pasa a `campaign_complete`: ya no reinicia la cadena ni vuelve a dar sus recompensas.

## Recorrido y experiencia

La columna EXP incluye la recompensa de misión y únicamente las bajas obligatorias; no cuenta cofres, desafíos, bonificaciones, grupos ni enemigos adicionales. El recorrido alcanza todas las puertas de nivel sin exigir bajas repetidas fuera de sus objetivos. La dificultad real y duración requieren seguir ajustándose con partidas de las cinco clases.

| ID | Objetivo | EXP misión | EXP bajas | EXP acumulada | Nivel al entregar |
|---|---|---:|---:|---:|---:|
| q1 | 6 exploradores óseos en Bosque | 60 | 90 | 150 | 2 |
| q_supplies | Recuperar cofre de provisiones, oeste del Bosque | 80 | 0 | 230 | 2 |
| q_shrine | Activar santuario del Bosque | 100 | 0 | 330 | 2 |
| q2 | 5 guerreros musgosos | 140 | 200 | 670 | 3 |
| q_alpha | Vencer al Alfa de Umbra, noroeste del Bosque | 180 | 200 | 1050 | 4 |
| q_ruins | Viajar a Ruinas de Nihil con M | 200 | 0 | 1250 | 4 |
| q3 | 6 guardianes de la Cripta en Ruinas | 320 | 840 | 2410 | 5 |
| q4 | Vencer al Centinela de Nihil | 600 | 500 | 3510 | 6 |
| q_crypt | Completar Cripta de las Dos Llamas | 600 | 1090 | 5200 | 7 |
| q5 | 8 verdugos ardientes en Yermo | 900 | 2480 | 8580 | 9 |
| q_ash_shrine | Activar santuario del Yermo | 300 | 0 | 8880 | 9 |
| q6 | Vencer al Rey Nihil | 1500 | 900 | 11280 | 10 |

Las puertas se mantienen: Ruinas nivel 3, Cripta nivel 5, Yermo nivel 6, Trono nivel 9. No se agregan niveles ni clases. El máximo global 40 se conserva para compatibilidad; la campaña diseñada aquí termina en 10.

## Cripta de las Dos Llamas

Mapa público nuevo, recomendado nivel 5–7, en x870–930 / z−50–50. Llegada al sur, en 900/43. Secuencia individual:

1. Vencer a tres acólitos en la sala sur.
2. Activar el primer sello en 890/15.
3. Vencer a tres guardias en la sala central.
4. Activar el segundo sello en 910/−12.
5. Derrotar al Custodio en 900/−37 y esquivar su área anunciada.

El servidor valida combate, distancia y etapas. Los sellos no se consumen globalmente. Salir, morir o reconectar reinicia la incursión. El premio de cada recorrido es un arma Mágica +5 con Skill de la clase, con identificador único; una vez entregado, no vuelve a otorgarse hasta comenzar otro recorrido completo. La misión se entrega una sola vez.

## Distribución de ítems

Los 208 ítems originales del catálogo continúan definidos, incluidos los que ya estén guardados. Se reserva su distribución avanzada para contenido posterior. `catalogDropPool(mapId, lootId)` define selecciones explícitas por fuente; no se sortea todo el catálogo según el mapa.

| Fuente | Papel y recompensas |
|---|---|
| Mercader | Pociones, maná menor, antídoto, retorno y ambas municiones; básicos históricos |
| Herrero | Armas iniciales para las cinco clases, rodela y chaleco; sin armas avanzadas ni joyas |
| q_supplies | Tres pociones garantizadas para el recorrido |
| q2 | Arma inicial de la clase Mágica +2; mejora inmediata sin exigir nivel 7–8 a un personaje de nivel 3 |
| Exploradores y guerreros del Bosque | Guantes y botas de los tres conjuntos iniciales |
| Bestias y cofres del Bosque | Grebas y yelmos de esos conjuntos |
| Alfa de Umbra | Anillos de veneno/viento; además la misión garantiza el de veneno |
| Ruinas | Corazas iniciales, primeras armas alternativas, escudos, tomo arcano y accesorios |
| Centinela | Anillo de escarcha/colgante de trueno; la misión garantiza Coraza de la Cripta |
| Acólitos y guardias de mazmorra | Tomo ígneo, maná/accesorio arcano, aguja y lanza |
| Custodio | Arma de clase garantizada por recorrido; pool de joya de mejora segura y accesorios de fuego |
| Yermo | Conjunto del Juramento de Aden, arco del Fresno, cayado del Heraldo, escudo del Astado y accesorios |
| Draco / Rey Nihil | Coraza y ballesta; armas nivel 9–10, escudo y joya de mejora riesgosa |

Los cofres del pueblo y los barriles no generan catálogo avanzado. Alas, mascotas y equipo con requisito superior a 10 no aparecen en estos pools. Las joyas se reservan a Custodio/Rey. Se conservan las tablas históricas de oro, materiales, pociones y equipo legado; el catálogo curado se añade a ellas. Las variantes de calidad siguen usando el sistema existente.

La restricción de tienda también se aplica en `getShopPrice`: enviar directamente el ID de un objeto retirado del escaparate no permite comprarlo.

## Compatibilidad y límites

- Personajes con q1–q6 conservan su misión; se insertan los pasos nuevos que estén por delante de su posición actual. No se borra inventario ni equipo.
- La mazmorra es pública: comparte enemigos y respawns, con progreso individual. No es una instancia privada por grupo.
- Recuperar provisiones es una interacción con un cofre, no un sistema de escolta de NPC.
- Se reutilizan modelos existentes para enemigos. Esta entrega prioriza recorrido y objetivos, sin crear 208 modelos de equipamiento.
- Los materiales históricos conservan sus usos previos; no se agrega un nuevo sistema de crafting de materiales.

## Validación de datos

`quests.test.ts` simula todas las bajas y entregas obligatorias y verifica acceso a cada mapa y nivel final 10. `adventure.test.ts` verifica pools, restricciones de compra, compatibilidad de armas por clase, objetivos y poblaciones de mazmorra. Verificación de esta parte: 164 pruebas compartidas aprobadas y TypeScript compartido sin errores. Las verificaciones integradas de servidor y cliente se registran al finalizar la entrega completa.

## Verificación integrada final

- 392 pruebas aprobadas: shared 164, servidor 135, cliente 93 (61 archivos).
- TypeScript de los tres módulos y build de producción del cliente correctos. Permanece el aviso conocido de bundle mayor de 500 kB.
- Integración de servidor verifica distancia/mapa de objetivos, campaña finita, orden y propiedad individual de sellos, daño bloqueado antes de desbloquear al guardián, premio único por recorrido, reinicio por muerte/salida y cooperación.
- Dentro de la cripta, jugadores vivos a hasta 25 unidades de la baja comparten avance y EXP; el último atacante no cobra EXP duplicada. El guardián detecta amenazas hasta 14 unidades y mantiene leash de 16.
- Revisión independiente y corrección de los hallazgos de servidor y cliente; la limpieza de áreas de peligro y los marcadores del Anciano fueron revisados nuevamente.
- Comprobación visual en navegador con personaje temporal preparado: primera sala, arena, guías, minimapa, movimiento y área roja de ataque. Consola sin errores. La vida elevada del personaje de esa prueba sólo existió en un servidor temporal en memoria; no se agregó un modo de trampas al juego.
- La progresión de EXP está simulada; la duración y la dificultad percibida todavía requieren una sesión de juego completa con las cinco clases.
