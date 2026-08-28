# Etapa 17 — Polish visual: efectos de skills + estructuras en los mapas

## Problema

Feedback del usuario probando en producción: (1) faltan animaciones/efectos al lanzar
skills, y (2) los mapas se sienten vacíos, sin estructuras/arquitectura.

## Diseño

### A) Efectos de skills (VFX)
- `SkillConfig` gana `vfxColor` + `projectile?` (shared/combat.ts, uno por skill).
- Server broadcastea `SkillCast{casterId, skillId, targetId}` en cada rama exitosa de
  `UseSkill` → así el VFX se ve en TODOS los clientes (no sólo el que castea).
- Cliente `SkillEffects` (procedural, sin assets): proyectil (bola de fuego / lanza de
  hielo viajan del caster al objetivo → impacto), destello de impacto (melee), chispas
  ascendentes (curación), aura + chispas (buff), nube (veneno), y un anillo de casteo bajo
  los pies siempre. `NetworkClient.onSkillCast` resuelve posiciones (caster/target vía
  EntityViews) y dispara el efecto; se actualizan/limpian por lifetime en el loop.
  Nota: el VFX depende del broadcast del server (no hay path local), pero su ausencia NO
  rompe nada (si el server viejo no lo emite, simplemente no hay efecto).

### B) Estructuras en los mapas
- `Environment.structures()` coloca landmarks arquitectónicos a mano por mapa:
  - Pueblo: casas (cuerpo + techo piramidal + puerta) alrededor de la plaza + pozo.
  - Bosque: torre de vigía + arco de entrada.
  - Ruinas: gran templo caído (plataforma + dos columnatas con columnas rotas + vigas
    caídas) + arco violeta.
  - Yermo: campo de obeliscos de obsidiana + torre quemada (corona rota).
  - Trono: pórtico monumental + escalinata al trono.
  - Builders reutilizables: house/well/tower/arch/templeHall/obeliskField/stairs.

## Verificación

278 tests (135 shared + 85 server + 58 client; nuevos: SkillEffects.test —proyectil agrega
y limpia efectos, skill desconocida no rompe, heal sin objetivo—). tsc estricto limpio 3
workspaces, build prod OK. Estructuras = client-only (se ven con sólo redeployar el cliente);
el VFX de skills necesita también el server (broadcast SkillCast) pero no rompe si falta.
Visual en vivo = pendiente-usuario.
