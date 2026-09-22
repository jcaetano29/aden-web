# Consolidación de Aden — entrega para continuar

Rama: `codex/alfa-consolidacion`, basada en `bd2e056`. Repositorio: https://github.com/jcaetano29/aden-web.
El usuario pidió commitear y publicar lo terminado, y detener la automatización después del push para continuar personalmente. Ese cierre sustituye la continuación autónoma del resto de la hoja de ruta.

## Entregas terminadas

1. **Persistencia segura** (`961739b`): los errores de carga y guardado se propagan y no se confunden con ausencia del personaje. Se carga el estado necesario antes de permitir crear otro.
2. **Sesiones y guardados ordenados** (`362870f`): una sesión por personaje autenticado, escrituras serializadas y snapshots independientes; los guardados finales fallidos se reintentan antes del siguiente ingreso.
3. **Desconexión controlada** (`6b409a5`, `4f6f5fe`): comandos bloqueados sin transporte, diálogo visible ante corte o servidor ausente y regreso manual al acceso. Conserva el foco del diálogo y no almacena contraseñas ni repite la creación del personaje.
4. **Interfaz y acceso** (`1e51cf8`, `f833749`, `9106fbf`, `1f9a5c2`): HUD y habilidades separados también en ventanas pequeñas e intermedias, objetivo con texto completo y scroll, chat compacto que conserva borrador/preferencias y formulario compatible con autocompletado sin eventos de escritura. Los campos inválidos muestran mensajes claros y exponen correctamente su estado a lectores de pantalla.

## Verificación de navegador

Componentes reales con datos sintéticos: 1280×720, 1280×560, 390×844 y 844×390; límites adicionales 1024, 1200 y 1201 px. Se comprobaron seis habilidades, textos largos de Bosque/Cripta, avisos simultáneos, chat y audio. En 1024×768 el HUD termina en y=656 y las habilidades comienzan en y=678; en 390×844 con seis habilidades quedan 7 px entre ambas regiones.

Partida temporal local: controles visibles, chat inicialmente compacto y corte real del servidor; el diálogo impide continuar acciones, conserva el foco y permite regresar con teclado al acceso. El formulario aceptó autofill sintético sin eventos y rechazó nombre vacío/contraseña corta con mensajes en español. Sin errores de consola en esas comprobaciones. No se usaron credenciales reales ni Supabase de producción.

## Pruebas y revisión de cierre

- Shared: 187/187; servidor: 227/227; cliente final: 247/247. Total: **661 pruebas aprobadas**. Comandos: `npm test --workspace @aden/shared --workspace @aden/server` y `npm test --workspace @aden/client`.
- TypeScript de shared, servidor y cliente aprobado con `tsc -p <paquete>/tsconfig.json --noEmit`; build final `npm run build --workspace @aden/client` aprobado en `1f9a5c2`.
- Bundle: 1113,72 kB minificado, 298,55 kB gzip; permanece la advertencia de tamaño de Vite. Las pruebas de servidor incluyen avisos esperados del modo en memoria y clientes sintéticos, sin fallos.
- Revisión independiente combinada `bd2e056..1f9a5c2`: **APPROVED**, sin hallazgos pendientes. El único hallazgo menor de la última revisión, el valor ARIA de campos inválidos, se reprodujo con una regresión y se corrigió; pruebas enfocadas finales 16/16.
- Evidencia local en `artifacts/handoff/`; se excluyen del repositorio los logs, fixtures y datos temporales. El registro duradero de decisiones y resultados está en esta entrega y `docs/avance-nocturno.md`.

## Próximas mejoras

- Balancear y verificar el recorrido 1–10 de las cinco clases a partir de `docs/analisis-balance-alfa.md`: protección PvP inicial, flechas, recompensa +5 de Cripta, hacha legacy y recompensas duplicadas. Ese informe es análisis estático, no playtest completo.
- Pruebas de varios clientes, botín, grupos, carga y rendimiento con medidas reproducibles. No se comprobó una capacidad máxima de jugadores.
- Medir recursos y render antes de optimizar. El bundle conserva la advertencia de tamaño.
- Diseñar la ampliación 10–20 después de verificar esas bases; no se inició en esta entrega.
- Profundizar el tutorial de arma/pociones y comprobarlo durante el playtest inicial. Pulido preexistente: el HUD de nivel 40 muestra EXP contra Infinity.

## Decisiones registradas

- Se ejecutó el diseño reversible con la autorización autónoma existente; no se pidió otra confirmación. Si la distribución no resulta adecuada, requiere ajustes de interfaz que se pueden revertir.
- Se mantuvieron la paleta de piedra/oro, las tipografías y componentes existentes, coordinados por CSS. El chat empieza compacto hasta 900 px de ancho o 500 px de alto y conserva las decisiones explícitas durante la sesión. El espacio para HUD/habilidades se adapta hasta 1200 px. El coste de cambiar esta decisión es reajustar y volver a medir el CSS.
- Se aceptó que los avisos transitorios cubran brevemente el objetivo o radar para que el feedback sea legible en ventanas pequeñas. El objetivo reaparece íntegro; HP/MP, habilidades y acceso al chat permanecen disponibles. El coste es perder temporalmente de vista la misión. Esta excepción está explícita en el diseño (`3d03521`).

## Límites y entorno

La coordinación de guardados cubre las salas de un proceso que usan el mismo backend real. Los pendientes fallidos viven en memoria: no constituyen un diario durable ni coordinación entre múltiples procesos. El modo en memoria sigue aislado por sala y no garantiza continuidad al reiniciar. Un proveedor que nunca responde conserva la reserva del personaje para impedir escrituras obsoletas. Guardados de clanes y proveedores colgados requieren trabajo adicional antes de ampliar las garantías.

La interfaz no incorpora controles táctiles completos. Las pruebas locales no equivalen a una validación de producción. Se conservó el checkout original y este worktree queda disponible para continuar. La revisión de procesos del 22/09/2026 no encontró procesos Node propios de este worktree ni servidores en sus puertos temporales 2577/5177; la pestaña temporal de acceso se cerró y se restableció el viewport.
