# Implementación de cooperación de party

Spec: ../specs/2026-10-01-party-cooperation-design.md

1. Combate (principal): pruebas primero; añadir CooperativeState y CooperativeCombatSystem, amenaza, taunt, protección, curas de aliado, aura, marca, exposición y venenos por atacante. Integrar en GameRoom preservando modificaciones locales. Validar interfaces reales con tests Colyseus.
2. Recompensas (dominio separado): tests de PartySystem, PartyLootSystem y EventSystem; añadir selección de modo, reserva rotativa, multiplicador EXP y contribuciones efectivas. No editar GameRoom: entregar interfaces al principal para integración.
3. Cliente (dominio separado): tests de PartyPanel/SkillBar/NetworkClient; selección independiente de aliado, envío allyId, selector de botín y datos cooperativos. Integración main.ts solo por principal para evitar conflictos.
4. Encuentros y simulador (principal): oleadas limitadas del Dragón y decisiones cooperativas de bots con miembros de party reales. Medir éxito/tiempo/muertes/pociones/apoyos sin exigir que toda mezcla supere a cualquier composición.
5. Integración: actualizar documentación/guía, suite completa npm test, TypeScript de los tres paquetes, builds. Revisión independiente de errores de autorización, recompensas duplicadas, limpieza de estados y regresiones en solo/PvP/Castillo; corregir y verificar. Comprobar navegador con servidor local sin Supabase.

## Contratos

- UseSkillMessage acepta allyId?: string, independiente de targetId.
- SkillConfig acepta description?: string y allyTarget?: boolean.
- MessageType.PartyLootMode = 'partyLootMode', payload { mode: 'free' | 'round_robin' }.
- PartyState.lootMode (synced), lootCursor (server-only); por defecto round_robin.
- PlayerState.cooperation nested: protectedMs, protectedBy, rallyMs; el resto de estado cooperativo será server-only. UI mapea a PartyMember opcional className, protectedMs, rallyMs.
- PartyPanelData agrega opcionales lootMode, selectedAllyId. Handlers opcionales onSelectAlly(id), onLootMode(mode).
- NetworkClient: setSupportTarget(id), getSupportTarget(), sendPartyLootMode(mode). sendUseSkill adjunta allyId si corresponde.
- EventSystem.recordSupport(mobId, playerId, amount) acepta SOLO contribución efectiva validada por combate. Las recompensas no se basarán en pulsaciones de botones.

## Registro

- Base verificada en esta conversación: 966 tests, TypeScript y builds correctos.
- Decisión: autorización de implementación ya recibida; continuar sin nuevas rondas de aprobación de documentos. Conservar todos los cambios previos del usuario y no realizar commits mezclados ni deploy.
- Implementación integrada: combate, recompensas, cliente, encuentros y simulador. Revisión independiente atendida y comprobación con dos clientes locales realizada. Informe y comando reproducible en docs/balance/party-cooperation/README.md.
- Calibración: caballero +12% PvE; HP de Dragón 250000, Espectro 60000, Coloso 78000. Se conservan los umbrales originales de balance.
- Builds de cliente y servidor correctos; verificación final de suite y TypeScript registrada en el informe de entrega.

- Verificación final completada: 1071 tests (289 shared / 409 server / 373 client), TypeScript de los tres paquetes, ambos builds y diff-check. Revisión y correcciones de refuerzos y aislamiento de pociones verificadas.
- Integración solicitada por el usuario en `master` y push a `origin/master`: se separaron los cambios locales de atributos y equipo. La versión preparada para el commit pasó 1051 tests (282 shared / 400 server / 369 client), TypeScript y ambos builds. Se regeneró el informe de balance con esa versión y se verificaron los límites de invasiones y jefes individuales en las tres semillas.
