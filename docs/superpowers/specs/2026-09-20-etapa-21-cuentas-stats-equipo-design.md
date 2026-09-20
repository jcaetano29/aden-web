# Etapa 21 — Cuentas, atributos asignables y equipo de misiones

**Fecha:** 2026-09-20
**Estado:** aprobado por el usuario

## Objetivo
Experiencia personalizada por usuario:
1. **Cuentas** (nombre + contraseña propia) → el progreso es TUYO y protegido.
2. **Atributos asignables** al subir de nivel (Fuerza/Agilidad/Vitalidad/Energía).
3. **Equipo** que dropea de misiones y monstruos (más y mejor señalizado).

## Decisiones del usuario
- Cuenta = **nombre + contraseña** (hash scrypt en el server, sin email, sin deps nuevas). 1 cuenta = 1 personaje.
- **4 atributos**: Fuerza→ataque, Agilidad→defensa, Vitalidad→vida, Energía→maná. +3 puntos por nivel.
- Persistencia real (Supabase) **hay que configurarla** (service key en Railway) — código listo + pasos para el usuario.

## 1. Cuentas
- **`server/src/auth/password.ts`** (puro): `hashPassword(pw) → {hash,salt}` y `verifyPassword(pw, hash, salt)` con `node:crypto` scrypt (salt aleatorio 16 bytes, comparación timing-safe).
- **`onAuth(client, {name,password,className})`** en GameRoom: valida nombre/contraseña; `loadAccount(name)` → si existe verifica (rechaza si no coincide), si no existe registra (`saveAccount`). Personajes viejos sin cuenta → se reclaman al primer login (se crea la cuenta con la contraseña dada, conservando el personaje). Devuelve `{name}` (truthy) para permitir el join.
- **Persistencia de cuentas**: tabla nueva `accounts (name PK, password_hash, password_salt, created_at)` (migración por MCP). `PersistenceService.loadAccount/saveAccount` (InMemory + Supabase). Separada de `characters` para no romper filas parciales.
- **Cliente**: la pantalla de creación suma campo **contraseña**; `connect(name, password, className)`; ante error de auth reintenta (no muestra "Aden dormida").
- **Seguridad**: nunca se loguea la contraseña; en prod viaja por WSS; scrypt + timing-safe. Es una cuenta de juego, no banca.

## 2. Atributos asignables
- **`shared/src/stats.ts`**: `ATTRIBUTES=["str","agi","vit","ene"]` + labels ES, `POINTS_PER_LEVEL=3`, `attributeBonuses({str,agi,vit,ene}) → {pAtk,pDef,maxHp,maxMp}` (str→+2 pAtk, agi→+2 pDef, vit→+12 maxHp, ene→+6 maxMp), `isValidAttribute`.
- **`PlayerState`**: `str/agi/vit/ene` (asignados) + `statPoints` (disponibles), `@type` sincronizados.
- **`recomputeStats`** = statsForClass(clase,nivel) + equipmentBonuses + attributeBonuses. Al subir de nivel: `statPoints += lvls*POINTS_PER_LEVEL` (en grantExp, tras gainExp).
- **Handler `AllocateStat{attr}`**: valida statPoints>0 + attr válido → incrementa attr, decrementa statPoints, recomputeStats (sin bajar HP/MP actuales).
- **Persistencia**: en el blob `progress` (sin migración).
- **Cliente**: `StatsPanel` (tecla **C**) con +por atributo, puntos disponibles y efecto; aviso en HUD/toast al subir de nivel si hay puntos.

## 3. Equipo de misiones + drops
- `Quest`/`Bounty` ganan `rewardItemId?`; al entregar se agrega la pieza al inventario (+ checkAchievements legendario). Asignar gear a q2/q4/q6 y a algunos contratos.
- Subir las chances de equipo en `DROP_TABLES` (E12 muy bajas).
- Toast al dropear equipo; el equip (paperdoll `i`) y el haz de rareza ya existen.
- **Fuera de alcance**: gear visible en el modelo 3D (KayKit sin anclajes).

## Verificación
- tsc estricto 3 workspaces + tests nuevos (password hash/verify, attributeBonuses, E2E: onAuth acepta/rechaza/reclama, AllocateStat sube stat, quest da equipo) manteniendo 294 verdes + build prod + prueba en vivo.
- Migraciones por MCP: `accounts`. Persistencia live = pendiente-usuario (service key en Railway).

## Deploy
- Cliente: Vercel (push). Server: Railway redeploy (schema Colyseus cambió: str/agi/vit/ene/statPoints en PlayerState).
- Usuario: pegar `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` en Railway (y en `server/.env` para local) o no persiste.
