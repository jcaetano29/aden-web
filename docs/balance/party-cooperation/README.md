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

Tres semillas, personajes de nivel 25 y equipo equivalente por clase contra el Dragón. Mediciones regeneradas con la versión preparada para integrar en `master`, sin los cambios locales pendientes de atributos y equipo. Mediana de segundos hasta derrotarlo:

| Composición | Sin decisiones de apoyo | Con decisiones de apoyo |
|---|---:|---:|
| Una de cada clase | 277,1 | 280,9 |
| Cinco magos | 287,5 | 295,6 |
| Cinco bárbaros | 320,9 | 320,9 |

La diferencia más clara aparece en los cinco magos: pasan de 1/1/1 muertes a 0/0/1 y de 21/18/19 pociones a 5/6/4. El grupo mixto no mejora con las decisiones de apoyo actuales de los bots: pasa de 1/1/1 pociones a 2/2/5, sin muertes en ninguno de los casos y con un tiempo algo mayor. Los cinco bárbaros conservan una muerte por intento. Son resultados de bots; no establecen una composición óptima para jugadores humanos ni demuestran una mejora universal por usar apoyo.

Los grupos previstos derrotan las cuatro invasiones dentro de los intervalos originales en las tres semillas. Sus intentos individuales fracasan. Las cinco clases cumplen el límite de 1,5 veces la mediana en Halden y Vharzul. Vharzul con cinco personajes de nivel 25 muere demasiado rápido para demostrar complementariedad: sirve como comprobación de regresión, no como validación de un encuentro de grupo exigente.

`cooperation: false` mantiene la party, las auras, los debuffs y el motor actual; desactiva las decisiones de curar/proteger aliados de los bots. Por lo tanto, esta comparación no representa el motor anterior. `healing` mide vida recuperada en compañeros; `protections` mide aplicaciones de Guardia, no daño prevenido. Cada ejecución vence las recargas de pociones antes de reutilizar los personajes.

Ejecutar desde `server`:

```powershell
node ../node_modules/tsx/dist/cli.mjs src/sim/cooperation-report.ts
```

El comando regenera [cooperation-results.json](cooperation-results.json), que incluye 36 comparaciones de grupo, las cuatro invasiones con sus intentos individuales y 30 peleas individuales contra jefes. Los archivos `pre-tuning-*` conservan mediciones exploratorias previas, realizadas con cambios locales de atributos, y no describen el balance final.

## Verificación

Se probaron por protocolo real la selección de aliados, distancia, muerte, mapa, party, recursos, curación efectiva, provocación, venenos simultáneos, bonus de EXP y permisos de botín. Las pruebas de dominio cubren reparto, contribución, recuperación entre controles y limpieza de estados. La revisión independiente encontró y permitió corregir falsas interrupciones, crédito por daño excesivo, bloqueo de viaje por curas pacíficas, ayuda PvP fuera de combate y refuerzos sin requisitos o huérfanos.

La interfaz se comprobó con dos clientes locales: invitación y aceptación, selección de apoyo, cambio de modo replicado y permisos del líder. Se corrigieron superposiciones con el chat y el botón de intercambio. La consola de navegador no mostró errores durante la comprobación final.

Verificación de la versión para integrar: `npm test` completó **1051 pruebas** (shared 282, servidor 400, cliente 369). TypeScript de los tres paquetes, builds de cliente y servidor y `git diff --check` correctos. Vite conserva el aviso de un chunk gráfico de más de 500 kB; no impide compilar. La comprobación anterior de 1071 pruebas incluía cambios locales de atributos y equipo que se conservaron fuera de este commit.
