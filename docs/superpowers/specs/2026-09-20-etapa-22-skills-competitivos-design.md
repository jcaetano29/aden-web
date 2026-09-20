# Etapa 22 — Combate y skills competitivos (PvP con skill ceiling)

**Fecha:** 2026-09-20 · **Estado:** aprobado por el usuario

## Objetivo
Que los skills funcionen bien, se entiendan, se aprendan al subir de nivel y estén
balanceados para un PvP donde las mecánicas (no solo el daño) definan al mejor jugador.

## Decisiones del usuario
- **Nivel máximo 40** (estilo L2).
- **6 skills por clase**, aprendidos por nivel.
- **PvP con counterplay** (control, movilidad, limpieza, sustain).

## Causa raíz de "Segundo Aire no funciona"
No hay regeneración de maná → tras un par de casteos te quedás sin MP y los skills
dejan de funcionar (peor en clases de 30 MP). Además no hay feedback de fallo.

## A. Arreglos base
- **Regen por tick** (server): MP `max(2, round(maxMp*0.04))`/s siempre; HP `round(maxHp*0.015)`/s
  sólo fuera de combat-recent (últimos 5 s sin dar/recibir daño) y con vida>0. Nunca en muertos.
- **Feedback (cliente)**: antes de mandar UseSkill, chequeo local (maná, cooldown, objetivo,
  aturdido, aprendido) y toast del motivo ("Sin maná", "En cooldown", "Sin objetivo",
  "Aturdido"). Al castear OK: nombre del skill flotante sobre el caster + VFX existente +
  número verde de cura. Se elimina el toast optimista de éxito.

## B. Level cap 40 + aprendizaje
- `MAX_LEVEL = 40` en progression; `gainExp` no sube más allá (exp sobrante se descarta) y
  `expToNextLevel` acota. Los puntos de atributo se otorgan hasta 40.
- `ClassDef.skills: { id, level }[]` (6 por clase, orden de desbloqueo). Helpers:
  `learnedSkillIds(className, level)`, `newSkillsAtLevel(className, level)`,
  `getClassSkillUnlocks(className)`. `getClassSkills` = todos los ids (compat/UI).
- Al subir de nivel, `LevelUpEvent.learned?: string[]` → toast "¡Aprendiste X!" y la barra
  crece. Teclas **1–6**. El server sólo permite castear skills **aprendidos** al nivel actual.

## C. Mecánicas de counterplay
`SkillConfig` gana: `stunMs?`, `rootMs?`, `dash?: "toTarget"|"away"`, `dashRange?`,
`cleanse?`, `lifestealPct?`. Estado nuevo (sincronizado): `PlayerState.stunMs/rootMs`,
`MobState.stunMs/rootMs`.
- **stun**: no se mueve ni castea (bloquea UseSkill + movimiento + auto-attack + AI del mob).
- **root**: no se mueve (puede castear).
- **dash toTarget**: el server acerca al caster al objetivo (a rango de ataque, clamp a bounds).
- **dash away** (blink): el server aleja al caster del objetivo (o hacia atrás si no hay).
- **cleanse**: pone stun/root/dot(veneno) del caster en 0.
- **lifesteal**: cura al caster por `lifestealPct * daño`.
- Aplicación: en UseSkill, tras el efecto primario (damage/heal/buff/dot) se aplican los
  modificadores (stun/root al objetivo; dash/cleanse/lifesteal al caster). CC también sobre mobs.
- tick: decrementa stun/root de jugadores y mobs. Movement y MobAI respetan stun/root.

## D. Kits por clase (mp / cd ms / efecto) — desbloqueo 1·3·8·15·25·40
**Caballero (tank/CC):**
1(1) shield_bash — dmg 2.0, mp10 cd5000, stun 900
2(3) guard — buff pDef×1.6 6s, mp12 cd12000
3(8) second_wind — heal 40%, mp16 cd14000
4(15) shield_charge — dmg 1.8 + dash toTarget + root 1200, mp16 cd9000
5(25) iron_will — cleanse + buff pDef×1.4 5s, mp18 cd18000
6(40) last_stand — buff pDef×2.0 8s + heal 25%, mp28 cd40000

**Mago (kite):**
1(1) fireball — dmg 3.4 proj, mp16 cd3500
2(3) ice_lance — dmg 2.2 proj + root 800, mp14 cd3000
3(8) arcane_mend — heal 32%, mp20 cd12000
4(15) blink — dash away, mp14 cd9000
5(25) frost_nova — dmg 2.6 + root 2000, mp24 cd12000
6(40) meteor — dmg 5.5 proj, mp40 cd16000

**Bárbaro (enganche):**
1(1) brutal_strike — dmg 3.0, mp12 cd4000
2(3) rage — buff pAtk×1.5 6s, mp14 cd12000
3(8) cleave — dmg 2.4, mp10 cd3000
4(15) charge — dmg 2.0 + dash toTarget + stun 1000, mp16 cd10000
5(25) bloodthirst — dmg 2.8 + lifesteal 0.6, mp16 cd8000
6(40) rampage — buff pAtk×1.9 8s, mp30 cd40000

**Pícaro (burst):**
1(1) backstab — dmg 2.8, mp10 cd2500
2(3) poison — dot 14dps 5s, mp12 cd6000
3(8) evasion — buff pDef×1.8 4s, mp10 cd10000
4(15) shadowstep — dmg 2.4 + dash toTarget, mp14 cd8000
5(25) vanish — cleanse + dash away + buff pDef×1.6 3s, mp16 cd16000
6(40) assassinate — dmg 4.8, mp28 cd14000

## E. Protocolo / cliente
- `LevelUpEvent.learned?`. `SkillCastEvent.amount?` (número de cura/daño sobre el caster).
- `SkillInput`/`SkillBar`: hasta 6 slots (teclas 1–6), construidos de `learnedSkillIds`; se
  reconstruyen al aprender. main.ts: pre-checks + feedback; indicador "Aturdido" del self.

## Verificación
tsc estricto 3 workspaces + tests nuevos (MP/HP regen, cap 40, learnedSkillIds/newSkillsAtLevel,
stun bloquea cast+move, root frena, dash mueve, cleanse limpia, lifesteal cura, PvP E2E) sin
romper los 311 + build prod + prueba en vivo.

## Deploy
Cambia schema Colyseus (stun/root en Player/Mob) → **redeploy Railway**. Cliente por Vercel.
Sin migración (no hay columnas nuevas; skills/CC no se persisten como columnas).
