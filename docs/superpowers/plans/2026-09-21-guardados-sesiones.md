# Guardados ordenados y sesiones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proteger el último progreso del personaje ante guardados concurrentes, salida y acceso duplicado.

**Architecture:** Coordinador compartido por proceso, reserva por nombre autenticado y serialización de snapshots. GameRoom conserva sus servicios actuales y delega el ciclo de vida de la persistencia del personaje.

**Tech Stack:** TypeScript, Colyseus, Vitest, PersistenceService actual.

**Spec:** docs/superpowers/specs/2026-09-21-guardados-sesiones-design.md

## Global Constraints
- Identidad: nombre autenticado con trim, sensible a mayúsculas como hoy; no renombrar cuentas ni guardados. onJoin y todos los guardados usan auth.name.
- No nuevas dependencias, migraciones, cambios de balance ni reconexión de cliente.
- Coordinación entre todas las GameRoom del mismo proceso; documentar limitación multiproceso y pendientes no duraderos frente a reinicio.
- Tests sin Supabase real. Windows/PowerShell; checkout C:/Users/Joaco/.codex/worktrees/aden-alfa-consolidacion/l2 en codex/alfa-consolidacion. Usar require_escalated para escrituras y pruebas si lo exige el sandbox.

### Task 1: Coordinar guardados y propiedad de personajes

**Files:**
- Create: server/src/persistence/CharacterPersistenceCoordinator.ts — coordinación separada y pequeña de ownership, escrituras y pendientes.
- Create: server/src/persistence/CharacterPersistenceCoordinator.test.ts — regresiones deterministas de cola y propiedad.
- Create: server/src/rooms/CharacterSessions.test.ts — integración real Colyseus con backend temporal compartido.
- Modify: server/src/persistence/CharacterSave.ts y/o PersistenceService.ts — copia profunda de campos mutables, incluyendo learnedTomes; tests existentes pertinentes.
- Modify: server/src/rooms/GameRoom.ts — reservar en auth, liberar en fallos/cierre, usar auth.name, ordenar autosave/salida y gestionar dispose.
- Modify: docs/persistencia-segura.md — contrato, recuperación y limitaciones verificadas.

**Interfaces:**
- Consumes: PersistenceService.load(name): Promise<CharacterSave|null>; save(name,data): Promise<void>, errores propagados del proveedor; CharacterSave y toCharacterSave existentes.
- Produces: exportar una clase coordinadora instanciable en tests y una instancia compartida para GameRoom. Mantener la interfaz pública PersistenceService sin cambios. Los nombres internos de métodos se eligen al implementar y se documentan; ningún consumidor externo depende de una firma nueva preestablecida.
- Read the referenced spec before code. The spec is binding and contains lifecycle/failure requirements. Inspect installed Colyseus Room._onJoin/_onLeave and client ref close APIs; do not guess that onLeave runs after an auth failure.

- [ ] **Step 1: Escribir regresiones RED antes del código.** Caso central con backend que solo aplica al resolver: iniciar autosave con gold=10, encolar final gold=20, confirmar que no inicia la segunda escritura hasta completar la primera, resolver y comprobar el registro gold=20. Comprobar que mutar learnedTomes/inventory después de encolar no altera snapshot. Escribir primero casos que ejercitan entradas reales existentes si la clase aún no existe.

```ts
const first = deferred<void>();
const committed: number[] = [];
const writer = async (_name: string, snapshot: CharacterSave) => {
  if (snapshot.gold === 10) await first.promise;
  committed.push(snapshot.gold);
};
// Drive the coordinator or GameRoom autosave + leave using writer;
// before first.resolve(), committed must be empty and the second write must not begin.
// After both saves settle, committed must equal [10, 20].
```

- [ ] **Step 2: Ejecutar RED y guardar salida explicando fallo observado.** Desde server usar ../node_modules/.bin/vitest.cmd run src/persistence/CharacterPersistenceCoordinator.test.ts src/rooms/CharacterSessions.test.ts. Una dependencia ausente no reemplaza la regresión funcional del guardado real; registrar al menos una regresión funcional que falle antes de corregir.
- [ ] **Step 3: Implementar coordinador y conectar GameRoom con pruebas incrementales.** Adquirir lease antes de await, conservar token de propietario, secuenciar escrituras y retener snapshot más reciente cuando rechazan. Usar finally para limpieza y manejo de cierres tempranos; proteger la reserva frente a callbacks antiguos. La fuente de onJoin es auth.name. Retirar jugador de sistemas vivos antes de esperar guardado. Reintentar pendiente al próximo acceso antes de load y fallar acceso de forma segura si no se confirma. No programar bucles de retry infinitos.

```ts
// Required sequencing, expressed independently of the chosen coordinator method names:
// acquire canonical identity -> authenticate -> settle old pending save -> load -> join
// exit live systems -> enqueue final snapshot -> settle or retain failure -> release ownership
// aborted authentication -> await/settle any mutation already started -> release exact ownership
```

- [ ] **Step 4: Completar casos GREEN.** Cubrir dos accesos concurrentes a misma cuenta en una sala y entre dos salas compartiendo backend; dos creaciones simultáneas sin reemplazar contraseña; otros nombres pueden operar mientras uno espera; auth/password/load fallidos no bloquean acceso posterior; cierre del socket mientras load o saveAccount esperan no deja sesión ni permite adelantar escritura; rechazo/reintento del final preserva el progreso correcto; salida y reingreso antes de resolución no cargan registro antiguo; nombre con espacios usa misma clave y reserva; dispose no libera escrituras en vuelo ni pierde snapshots fallidos. Usar clientes Colyseus reales para los flujos de acceso; usar helpers puros para interleavings extremos. No tests que solo comprueban conteos de mocks cuando puede comprobarse el dato final.
- [ ] **Step 5: Verificar integración y documentar.** Ejecutar npm test --workspace @aden/server y node_modules/.bin/tsc.cmd --noEmit -p server/tsconfig.json. Corregir fallos relacionados manteniendo pruebas existentes significativas. Guardar logs gitignored en artifacts. Documentar un proceso, memoria temporal, reintento en próximo acceso, limitación in-memory por sala actual, clanes fuera del alcance. No tocar credenciales ni llamar Supabase real.
- [ ] **Step 6: Auto-revisar y crear commit.** Revisar riesgos de lease/callback/Promise y limpieza. Commit solo de código/tests/docs de entrega. Reporte detallado en el archivo indicado por el controlador: RED/GREEN con comandos y resultados, archivos, decisiones, commit y límites. No ejecutar subagentes.
