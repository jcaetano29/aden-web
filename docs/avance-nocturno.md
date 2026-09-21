# Avance nocturno de Aden

Autorización: el 21/09/2026 el usuario pidió ejecutar todas las tareas posibles mientras duerme y autorizó las decisiones de implementación del plan revisado. Continuar sin solicitar confirmaciones rutinarias.

## Entorno y recuperación

- Checkout de trabajo: `C:/Users/Joaco/.codex/worktrees/aden-alfa-consolidacion/l2`.
- Rama: `codex/alfa-consolidacion`; base: `bd2e056`.
- Checkout original: `C:/Users/Joaco/Documents/GitHub/l2`; no mezclar dependencias ni alterar sus artefactos.
- Automatización: `consolidaci-n-nocturna-de-aden`, cada hora, ocho ejecuciones desde 21/09/2026 04:02 UTC. Detenerla cuando se complete el trabajo o el usuario lo solicite.
- Entorno Windows/PowerShell. Este checkout está fuera de las raíces iniciales escribibles: usar exec_command con require_escalated para sus escrituras, pruebas y commits cuando haga falta. Usuario ya autorizó el trabajo.
- Dependencias instaladas con `npm ci --offline --no-audit --no-fund`; paquetes propios apuntan a este checkout.
- No usar Supabase real para pruebas. Puertos locales de verificación: servidor 2577, cliente 5177; cerrar los procesos propios al terminar.

## Orden de entregas

1. [ ] Fallos de persistencia: lecturas y escrituras explícitas, acceso seguro y regresión de pérdida de progreso. Plan activo: `docs/superpowers/plans/2026-09-21-persistencia-segura.md`.
2. [ ] Guardados ordenados y sesiones: impedir escrituras obsoletas, colisiones por dos sesiones del mismo personaje y pérdida al desconectar durante un guardado. Diseñar con el contrato de la entrega 1.
3. [ ] Recuperación de conexión: estado visible, impedir acciones desconectadas y vía segura de reingreso. No guardar contraseñas en localStorage ni recrear personajes al reconectar.
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
- Base de pruebas del checkout aislado en ejecución; log `artifacts/baseline-tests.log`.
- Próxima acción: ejecutar entrega 1 y revisar su diff.
