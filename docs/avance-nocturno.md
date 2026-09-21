# Avance nocturno de Aden

Autorización: el 21/09/2026 el usuario pidió ejecutar todas las tareas posibles mientras duerme y autorizó las decisiones de implementación del plan revisado. Continuar sin solicitar confirmaciones rutinarias.

## Entorno y recuperación

- Checkout de trabajo: `C:/Users/Joaco/.codex/worktrees/aden-alfa-consolidacion/l2`.
- Rama: `codex/alfa-consolidacion`; base: `bd2e056`.
- Checkout original: `C:/Users/Joaco/Documents/GitHub/l2`; no mezclar dependencias ni alterar sus artefactos.
- Automatización: `consolidaci-n-nocturna-de-aden`, cada veinte minutos, veinticuatro ejecuciones durante aproximadamente ocho horas. Detenerla cuando se complete el trabajo o el usuario lo solicite.
- Entorno Windows/PowerShell. Este checkout está fuera de las raíces iniciales escribibles: usar exec_command con require_escalated para sus escrituras, pruebas y commits cuando haga falta. Usuario ya autorizó el trabajo.
- Dependencias instaladas con `npm ci --offline --no-audit --no-fund`; paquetes propios apuntan a este checkout.
- No usar Supabase real para pruebas. Puertos locales de verificación: servidor 2577, cliente 5177; cerrar los procesos propios al terminar.

## Orden de entregas

1. [x] Fallos de persistencia: lecturas y escrituras explícitas, acceso seguro y regresión de pérdida de progreso. Plan activo: `docs/superpowers/plans/2026-09-21-persistencia-segura.md`.
2. [x] Guardados ordenados y sesiones: escrituras serializadas y snapshots independientes, sesión única por nombre autenticado y reintento de guardado final antes de reingreso. Garantías de un proceso; límites de memoria/reinicio documentados.
3. [x] Recuperación de conexión: estado visible, impedir acciones desconectadas y vía segura de reingreso. No guardar contraseñas en localStorage ni recrear personajes al reconectar.
4. [ ] Experiencia inicial: reducir superposición de avisos/chat y mejorar descubrimiento de controles, objetivo, arma y pociones; revisar escritorio y pantalla pequeña con navegador.
5. [ ] Balance 1–10: herramienta reproducible de análisis de cinco clases, curva de EXP, recompensas, arma +5 de Cripta, consumo y PvP inicial. Aplicar ajustes respaldados por pruebas; diferenciar simulación de partidas reales.
6. [ ] Calidad y multijugador: comandos reproducibles de verificación, integración automática, prueba de varios clientes, desconexión, botín y grupos; registrar medidas de rendimiento y límites.
7. [ ] Rendimiento: carga del cliente y recursos, perfil de escenas y reducción justificada de trabajo innecesario. No optimizar solo para ocultar advertencias.
8. [ ] Si 1–7 quedan verificadas, preparar diseño y plan de una ampliación 10–20 coherente con la historia, clases y economía y ejecutar las entregas viables. No cambiar el máximo 40 ni retirar contenido existente.
9. [ ] Revisión general, pruebas completas, TypeScript, build, navegador, commits y resumen de entregas y pendientes. No afirmar verificaciones de producción que no se hicieron.

## Reglas de ejecución

- Convertir cada entrega en un diseño/plan acotado antes de modificar código; autorización de diseño general ya recibida. Decidir detalles reversibles y anotarlos.
- Usar desarrollo con pruebas de regresión y revisión independiente mediante subagentes según la habilidad subagent-driven-development. Un implementador a la vez; revisión separada antes de avanzar.
- Trabajar con contratos existentes y cambios pequeños. Conservar IDs, guardados, inventarios, clases y progreso.
- Guardar evidencias extensas en archivos, no en el chat. No volver a ejecutar lo ya completado tras una continuación.
- Crear commits por entrega; no incluir artefactos temporales ni credenciales. Publicación/producción solo con una configuración real verificada y un alcance seguro; un acceso faltante se registra y no bloquea trabajo independiente.
- Registrar en esta página los commits, pruebas, limitaciones y próxima acción antes de terminar cada turno.

## Estado actual

- Análisis previo: 595 pruebas (187 shared, 187 servidor, 221 cliente), TypeScript y build correctos. Navegador: creación temporal, pueblo, bosque e inventario.
- Riesgo confirmado por lectura: SupabasePersistence devuelve null al fallar una carga y traga errores de guardado. No se comprobó pérdida de datos real.
- Base del checkout aislado verificada: 595 pruebas aprobadas; log `artifacts/baseline-tests.log`.
- Entrega 1 implementada: commit 961739b (fallos explícitos, mensajes seguros y carga del clan antes de crear estado). RED: 14 fallos; GREEN enfocado final: 19/19; suite servidor ejecutada durante la entrega: 204/204; tsc servidor correcto. Revisión independiente aprobada sin hallazgos (review_persistence_safety). Entrega completa. Informe en .superpowers/sdd/2026-09-21-persistencia-segura/task-1-report.md.
- Análisis de balance completado en docs/analisis-balance-alfa.md: ruta de EXP válida; revisar protección PvP inicial, presupuesto de flechas, premio +5 de Cripta, hacha legacy universal y recompensas duplicadas. Es análisis estático con supuestos, no playtest.
- Hallazgos de sesiones, conexión, interfaz y rendimiento: docs/diagnostico-continuidad.md (investigación, no correcciones).
- Verificación conjunta final: 614 pruebas aprobadas (187 shared, 206 servidor, 221 cliente); TypeScript de los tres paquetes y build correctos. Evidencia: artifacts/persistence-final-tests.log y artifacts/persistence-final-build.log. Advertencia preexistente: bundle del cliente de 1109,34 kB minificado.
- Entrega 2 completa: implementación 362870f, plan 04d9740. Cola y propiedad compartidas por proceso; auth.name canónico; cierre durante auth/dispose seguro; pendiente final recuperable; copias de learnedTomes. RED funcional de solapamiento/aliasing; GREEN 227/227 servidor y 21/21 enfocadas, TypeScript correcto. Logs artifacts/session-tests/server-final.log, green-final.log y tsc-final.log. Revisión independiente review_ordered_character_sessions aprobada sin hallazgos; ledger/informes .superpowers/sdd/2026-09-21-guardados-sesiones/. No repetir implementación ni pruebas sin nuevo motivo.
- Entrega 3 completa: implementación 6b409a5 y corrección de foco 4f6f5fe. Estado de transporte, guard central para 21 familias send*, bloqueo de controles y diálogo de corte/servidor ausente con retorno manual al acceso. Suite cliente 232/232 antes de corrección acotada; diálogo final 6/6, TypeScript y build correctos. Revisión independiente detectó P2 de foco al pulsar título/mensaje/padding: corregido y revisión final PASS. Navegador: corte real en partida y StoryCard, controles bloqueados, retorno con clic/teclado, panel visible en 1280x720, 1280x560 y 390x844; foco final verificado. Evidencia en .superpowers/sdd/2026-09-21-recuperacion-conexion/ y artifacts/connection-preview-final-build.log. Servidores, preview y pestañas propios cerrados; viewport restablecido. No repetir esta entrega sin nuevo motivo.

### Límites confirmados de la entrega 2
La coordinación cubre todas las salas de un proceso que usan el mismo backend real. El modo InMemoryPersistence sigue aislado por sala; no demuestra continuidad a otra sala ni a reinicio. Los pendientes fallidos residen en memoria y se reintentan en próximo acceso, no son un diario duradero. Proveedor que no resuelve conserva el lease para impedir escrituras obsoletas. Multiproceso, cola acotada/coalescida para proveedores colgados y guardados de clanes siguen fuera de este contrato; medir o diseñar antes de ampliar garantías.


## Próxima continuación

Entrega 4: convertir docs/superpowers/specs/2026-09-21-interfaz-adaptable-design.md en plan acotado. Navegador confirmó superposición de HUD/barra de habilidades/chat en pantalla pequeña; propuesta preparada, todavía sin implementar. Después continuar balance 1–10, multijugador y rendimiento antes de ampliar 10–20. No hay agentes ni procesos de prueba activos. Automatización continúa activa; cambios conservados en codex/alfa-consolidacion, sin merge, push ni despliegue.
