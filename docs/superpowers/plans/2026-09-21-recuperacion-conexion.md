# Recuperación visible de conexión Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquear acciones durante desconexión y ofrecer retorno claro al acceso existente.

**Architecture:** Estado de transporte explícito y un único guard de envío. Diálogo modal de conexión en main, reingreso manual mediante recarga y modo login inicial existente.

**Tech Stack:** TypeScript, Colyseus.js, DOM/CSS, Vitest/jsdom, Three.js existente.

**Spec:** docs/superpowers/specs/2026-09-21-recuperacion-conexion-design.md

## Global Constraints
- Ejecutar después de aprobar entrega 2: guardados y sesiones.
- Sin contraseñas en storage/URL/logs, sin nuevas dependencias ni cambios de servidor/balance.
- No reconexión automática ni repetición de create; recarga y acceso manual con contrato existente.
- Conservar último snapshot para render; no afirmar confirmación de guardado o envío del servidor.

### Task 1: Desconexión visible y comandos seguros

**Files:**
- Modify: client/src/net/NetworkClient.ts — estado connected, guard común y callbacks aislados por sala.
- Create: client/src/net/NetworkClient.connection.test.ts — connect, leave, fallos y payloads con transporte controlado.
- Modify: client/src/net/NetworkClient.catalog.test.ts — setup conectado realista conservando las pruebas de payload.
- Create: client/src/render/ConnectionDialog.ts y ConnectionDialog.css — diálogo reusable para corte o servidor ausente.
- Create: client/src/render/ConnectionDialog.test.ts — interacción/foco/modal y callback.
- Modify: client/src/main.ts — montar diálogo, integrarlo en callback, bloquear entrada, reemplazar overlay offline duplicado si corresponde.
- Modify: client/src/input/InputController.ts y test correspondiente solo si necesita un predicado de entrada central para impedir selección/NPC detrás del diálogo.
- Create: docs/recuperacion-conexion.md — qué ocurre, reingreso y límites.

**Interfaces:**
- Consumes: NetworkClient.connect actual y RoomCallbacks.onConnectionChange(connected:boolean), ClassSelect login por defecto, estilos render/theme.ts.
- Produces: NetworkClient.isConnected:boolean getter; todos los send* devuelven boolean. ConnectionDialog.show(kind:'disconnected'|'unavailable'):void, isOpen:boolean getter, dispose():void; constructor recibe onReturn:()=>void (main usa location.reload) y parent opcional. Es admisible cambiar firmas internas del diálogo si mejora legibilidad y queda documentado.

- [x] **Step 1: RED de comandos después de leave.** Fake Colyseus Client.joinOrCreate devuelve una Room con eventos controlables y state collections mínimas. Primero demostrar que sendMove/sendBuyItem después de leave todavía transmiten. Añadir casos sin conexión y transporte que arroja. Comprobar payloads conectados y que no se transmite al reconectar ninguna intención anterior.

```ts
await net.connect('Temporal', 'clave-temporal', '', callbacks, 'login');
room.emitLeave();
expect(net.sendBuyItem('health_potion', 2)).toBe(false);
expect(room.sent).toEqual([]);
```

- [x] **Step 2: Guard único y estado.** Sustituir todas las llamadas room.send por un único helper; se conserva la información de último estado y se limpia invitación. leave/send-error cambia a false una vez; callbacks de sala anterior no afectan actual. Fallo inicial devuelve rechazo al flujo existente. El true solo significa intento aceptado por el transporte.

```ts
// All send methods delegate to one guarded method:
// if (!connected || !room) return false;
// try { room.send(type, payload); return true; }
// catch { markDisconnectedForThisRoom(); return false; }
```

- [x] **Step 3: RED/GREEN del diálogo y bloqueo.** DOM jsdom: show produce diálogo etiquetado, foco del botón, Tab contenido, Escape no oculta, callback único al activar, dispose elimina eventos. Aplicar texto exacto de spec, layout con ancho máximo y padding adaptable. Bloquear eventos de controles detrás antes de selección/NPC y envío; hotkeys no abren paneles al perder conexión. Mantener funcionalidad del botón con Enter/Espacio.
- [x] **Step 4: Integrar en main.** Crear componente antes de netCallbacks; enseñar corte solo después de sesión establecida; proteger corte durante espera self/StoryCard, callback idempotente; unavailable ofrece Reintentar. Acceso manual recarga a pestaña login inicial. No nueva copia de password ni almacenamiento de credenciales. Evitar introducir una pantalla duplicada y endpoints técnicos en el producto.
- [x] **Step 5: Verificar y documentar.** npm test --workspace @aden/client, node_modules/.bin/tsc.cmd --noEmit -p client/tsconfig.json, npm run build --workspace @aden/client. Usar servidor temporal sin Supabase, puertos 2577/5177 para browser; anotar pasos de acceso/corte/modal/retorno y viewports sin afirmar recuperación de memoria tras reinicio. Los servidores y pestañas propios se limpian al acabar. Si navegador está a cargo del controlador, indicar pendiente sin inventar su resultado.
- [x] **Step 6: Revisar y commit.** Comprobar todas las familias send*, las guardas teclado/puntero y ausencia de colas/credenciales almacenadas. Registrar RED/GREEN/comandos/límites en informe separado. Commit explícito de archivos de esta entrega. Revisión independiente antes de avanzar.
