# Persistencia segura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Rechazar accesos y escrituras fallidas de forma explícita para que un error de Supabase no se convierta en un personaje nuevo ni en un guardado aparentemente exitoso.

**Architecture:** Mantener el contrato de PersistenceService, haciendo que los fallos rechacen promesas y que null signifique exclusivamente ausencia comprobada. Manejar el rechazo en GameRoom antes de introducir un jugador y en consumidores asíncronos de guilds y clasificaciones.

**Tech Stack:** TypeScript, Supabase JS, Colyseus, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-persistencia-segura-design.md`

## Global Constraints

- Mantener IDs, esquema de guardados y reglas de juego existentes.
- No agregar dependencias ni migraciones.
- No usar datos o credenciales de producción en pruebas.
- Los mensajes de indisponibilidad al cliente deben estar en español y no revelar detalles internos.
- Toda corrección de comportamiento necesita una regresión que falle antes de implementarla.

### Task 1: Propagar fallos de persistencia y proteger el acceso

**Files:**
- Modify: `server/src/persistence/SupabasePersistence.ts`
- Modify: `server/src/persistence/PersistenceService.ts` (documentar semántica, sin cambiar firmas)
- Modify: `server/src/rooms/GameRoom.ts` (manejar errores en los consumidores afectados)
- Create: `server/src/persistence/SupabasePersistence.test.ts`
- Create: `server/src/rooms/PersistenceFailures.test.ts`
- Create if useful: `server/src/persistence/PersistenceError.ts` (solo error específico reutilizado)
- Create: `docs/persistencia-segura.md`

**Interfaces:**
- Consumes existing `PersistenceService.load(name): Promise<CharacterSave | null>`, `loadAccount(name): Promise<AccountRecord | null>`, `save`, `saveAccount`, guild and leaderboard methods.
- Produces the same API with the enforced semantic: missing records resolve null, failures reject. A denied connection must not add PlayerState or schedule/save default progress.
- Test injection uses existing room.persistence and a fake/mock of the external Supabase boundary; no production-only testing flags.

- [ ] **Step 1: Write failing adapter tests.** Use the same mocked createClient boundary as appropriate for the SDK: responses with `{ data: null, error: null }` resolve null, but `{ data: null, error: { message: 'database unavailable' } }` and rejected requests reject for load/loadAccount/loadGuild. Assert save/saveAccount/saveGuild failures reject instead of silently resolving. Use a small fake query builder or Vitest mock at the SDK boundary only. Example essential assertion:

```ts
await expect(persistence.load('Veterano')).rejects.toThrow();
await expect(persistence.save('Veterano', saved)).rejects.toThrow();
```

- [ ] **Step 2: Write failing room regression.** Follow existing Colyseus test-server setup with its own free test port. Store a level-7 character with gold, inventory and a later quest in an InMemoryPersistence-based test double. Configure its load to reject only during login. Connect through the real Colyseus client. Assert the connection rejects, no matching player enters room.state.players, and the saved record retains the same gold, level, inventory and quest. Clear the failure and confirm re-entry restores the record. Also fail account lookup and account write and assert connection denial. Capture expected logging locally so tests are readable.

```ts
await expect(colyseus.connectTo(room, credentials)).rejects.toThrow();
expect([...room.state.players.values()].some(p => p.name === 'Veterano')).toBe(false);
expect(await backingStore.load('Veterano')).toEqual(saved);
```

- [ ] **Step 3: Run focused tests and record RED.** Run `npm run test --workspace @aden/server -- src/persistence/SupabasePersistence.test.ts src/rooms/PersistenceFailures.test.ts`. The adapter failures must demonstrate the existing swallowing behavior. Room tests that already pass with a throwing double still verify the desired integration; connect the adapter contract to that evidence rather than forcing an artificial failing room test.

- [ ] **Step 4: Implement explicit failure semantics.** After each Supabase response, if error is present throw an error instead of returning null or resolving a write. Preserve original cause for server diagnostics, sanitize outward text. Use null only after a successful absent-record query. Apply equivalent handling to transport rejections. Example shape (adapt to a reusable typed error if needed):

```ts
if (error) throw new PersistenceError('No se pudo cargar el personaje. Intentá nuevamente.', { cause: error });
if (!data) return null;
```

In onAuth, catch persistence-specific failures and deny access with a safe retryable Spanish message. Do not label all errors as incorrect password. Check `loadGuild`, `refreshLeaderboard` and all write call sites for new rejection behavior. Preserve last valid leaderboard if refresh fails; do not reconstruct an empty guild after an unavailable load. Keep changes scoped to error semantics, not a new retry/queue framework.

- [ ] **Step 5: Verify GREEN and consumers.** Run focused tests, the full server suite once, then server TypeScript. Add a regression for each altered async consumer that would otherwise leak an unhandled rejection or destroy prior state. Commands: `npm run test --workspace @aden/server` and `node_modules/.bin/tsc.cmd --noEmit -p server/tsconfig.json`. Record exact counts and any pre-existing warnings, not invented pristine output.

- [ ] **Step 6: Document, self-review and commit.** Document failure behavior, no schema change, and the separate pending ordering/retry work in docs/persistencia-segura.md. Review the diff for IDs/schema changes, secret exposure and missed callers. Commit only this task's files. Write the detailed report in the task report path supplied by the controller with RED/GREEN evidence, files and limitations.
