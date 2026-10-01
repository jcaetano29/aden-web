# Cooperación de party: implementación y balance

La party ahora permite proteger y curar compañeros sin perder el objetivo enemigo, mantener amenaza, mejorar el daño de otros integrantes y aprovechar debuffs compartidos. Se ampliaron las habilidades existentes: siguen siendo seis por clase. Las reglas para jugar y repartir recompensas están en [la guía de party](../../party.md).

## Calibración

Se mantuvieron los criterios anteriores del simulador: invasiones dentro de su intervalo de duración, derrotas en los intentos individuales de invasión y ninguna clase por encima de 1,5 veces la mediana de tiempo contra Halden o Vharzul. No se ampliaron los límites de las pruebas para hacerlos pasar.

- Caballero: +12% de daño PvE para conservar su ritmo individual. Este factor no entra en los ataques contra jugadores.
- Dragón Carmesí: 221000 → 250000 HP; dos guardianes al 70% y otros dos al 35%, con un máximo de cuatro vivos. Heredan los requisitos del jefe y desaparecen cuando termina el encuentro.
- Espectro del Velo: 53400 → 60000 HP.
- Coloso de Brasa: 69100 → 78000 HP.

Los aumentos de vida compensan el daño adicional del grupo. El Heraldo conservó sus valores.

## Resultados reproducibles

Tres semillas, personajes de nivel 25 y equipo equivalente por clase contra el Dragón. Mediciones regeneradas con los atributos por clase revisados y el mismo reparto equilibrado de puntos del simulador. Mediana de segundos hasta derrotarlo:

| Composición | Sin decisiones de apoyo | Con decisiones de apoyo |
|---|---:|---:|
| Una de cada clase | 245,3 | 244,7 |
| Cinco magos | 247,0 | 247,0 |
| Cinco bárbaros | 271,3 | 271,3 |

La diferencia más clara aparece en supervivencia y recursos. Los cinco magos pasan de 1/1/0 muertes a 0/0/0 y de 14/14/18 pociones a 0/12/4. El grupo mixto pasa de 4/2/3 pociones a 1/1/0, sin muertes en ninguno de los casos. Los cinco bárbaros conservan una muerte por intento. Son resultados de bots; no establecen una composición óptima para jugadores humanos ni demuestran una mejora universal por usar apoyo.

Los grupos previstos derrotan las cuatro invasiones dentro de los intervalos originales en las tres semillas. Sus intentos individuales fracasan. Las cinco clases cumplen el límite de 1,5 veces la mediana en Halden y Vharzul. Vharzul con cinco personajes de nivel 25 muere demasiado rápido para demostrar complementariedad: sirve como comprobación de regresión, no como validación de un encuentro de grupo exigente.

`cooperation: false` mantiene la party, las auras, los debuffs y el motor actual; desactiva las decisiones de curar/proteger aliados de los bots. Por lo tanto, esta comparación no representa el motor anterior. `healing` mide vida recuperada en compañeros; `protections` mide aplicaciones de Guardia, no daño prevenido. Cada ejecución vence las recargas de pociones antes de reutilizar los personajes.

Ejecutar desde `server`:

```powershell
node ../node_modules/tsx/dist/cli.mjs src/sim/cooperation-report.ts
```

El comando regenera [cooperation-results.json](cooperation-results.json), que incluye 36 comparaciones de grupo, las cuatro invasiones con sus intentos individuales y 30 peleas individuales contra jefes. Los archivos `pre-tuning-*` conservan mediciones exploratorias previas, realizadas con cambios locales de atributos, y no describen el balance final.

## Verificación

Los atributos ahora distinguen el ataque principal por clase: Fuerza para caballero y bárbaro, Energía para mago, Agilidad para pícaro y explorador. Agilidad también aporta rapidez y movimiento, con límites propios de +50% y +15%, respectivamente; los efectos del equipo se suman aparte. La vida por Vitalidad y el maná por Energía dependen de la clase. El panel muestra base 100 más la inversión; los 100 no conceden puntos extra ni alteran el formato de los atributos guardados.

El servidor, la comparación de equipo y la descripción del próximo punto usan la misma composición de estadísticas, incluidos porcentajes de equipo y redondeos. Para proteger las inversiones previas al cambio de reglas, los personajes antiguos con puntos asignados reciben una redistribución gratuita opcional de un solo uso. Se confirma desde el panel C, estando vivo, fuera de combate y en una zona segura del pueblo. La disponibilidad y su consumo se guardan en el progreso existente; no requiere migrar tablas. Los personajes nuevos no reciben esta compensación.

Se probaron por protocolo real la selección de aliados, distancia, muerte, mapa, party, recursos, curación efectiva, provocación, venenos simultáneos, bonus de EXP y permisos de botín. Las pruebas de dominio cubren reparto, contribución, recuperación entre controles y limpieza de estados. La revisión independiente encontró y permitió corregir falsas interrupciones, crédito por daño excesivo, bloqueo de viaje por curas pacíficas, ayuda PvP fuera de combate y refuerzos sin requisitos o huérfanos.

La interfaz se comprobó con dos clientes locales: invitación y aceptación, selección de apoyo, cambio de modo replicado y permisos del líder. Se corrigieron superposiciones con el chat y el botón de intercambio. La consola de navegador no mostró errores durante la comprobación final.

Verificación con atributos por clase: `npm test` completó **1077 pruebas** (shared 291, servidor 412, cliente 374). TypeScript de los tres paquetes y builds de cliente y servidor correctos. Las pruebas nuevas cubren redondeos y porcentajes de equipo, confirmación, guardados antiguos, persistencia de la compensación, rechazo de usos repetidos y restricciones de combate. La revisión independiente no encontró bloqueos tras corregir la migración de builds y los textos del próximo punto. Vite conserva el aviso de un chunk gráfico de más de 500 kB; no impide compilar.
