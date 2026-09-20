# Campaña inicial y Cripta de las Dos Llamas

> Implementación con superpowers:subagent-driven-development; revisión y verificación al finalizar.

**Goal:** completar el recorrido de niveles 1–10 con objetivos variados, mazmorra y recompensas por actividad.
**Architecture:** ampliar los datos compartidos existentes; el servidor valida objetivos, sellos y combate; el cliente muestra destino y progreso. Mazmorra pública con avance individual, reiniciado al salir o morir, sin introducir instancias privadas.
**Tech Stack:** TypeScript, Colyseus, Three.js, Vitest.
**Spec:** propuesta aprobada en la conversación; este documento concreta sus interfaces.

## Global Constraints
- Conservar personajes, IDs q1–q6, catálogo y cambios anteriores.
- No nuevas clases, niveles ni dependencias. No publicar ni hacer commit de trabajo previo.
- Campaña termina con questId `campaign_complete`; no vuelve a repartir premios.
- Objetivos de servidor, mismo mapa y distancia validada; los sellos no se consumen globalmente.
- Equipo de tienda básico; sin botín superior a nivel 10 en la campaña inicial. Catálogo posterior conservado.

## Tareas e interfaces
- [x] Datos: shared quests/world/mobs/combat/progression/worldobjects/items y nuevo adventure.ts.
  Quest añade objective?: 'kill'|'visit'|'interact'|'dungeon', targetId?: string, mapId?: string, hint?: string, rewardByClass?: Record<string,string>.
  nextQuestId(q6) devuelve campaign_complete. Compatibilidad: mobTemplateId continúa existiendo (vacío para objetivos sin enemigo).
  Dungeon: mapa `cripta`, bounds x870..930 z-50..50, spawn900,43, nivel5 recomendado5–7; mobs `crypt_acolyte`, `crypt_flameguard`, `crypt_warden`; sellos `crypt_seal_1` (890,15), `crypt_seal_2` (910,-12), boss900,-37.
  Nuevo enemigo especial `umbra_alpha` en bosque. Al menos 3 acólitos en sala sur y 3 guardias en sala central.
  adventure.ts exporta dungeonObjective(stage,kills):string; catalogDropPool(mapId,lootId):string[]; dungeonReward(className):string; questReward(q,className):string|undefined. Solo imports compartidos sin efectos secundarios circulares.
- [x] Servidor: quest visit/interact/dungeon; recompensas por clase; cierre campaña; dungeonStage y dungeonKills sincronizados, stages0 matar3 acólitos,1 sello1,2 matar3 guardias,3 sello2,4 jefe,5 completado. Ataques al jefe bloqueados antes stage4. Premio una vez/run al inventario. Reset salida/muerte/reconexión. Área anunciada jefe: centro fijado, radio6, aviso1600ms, daño mitigado, cooldown7s; huir cancela al perder aggro.
- [x] Cliente: HUD guía objetivos/destinos, diálogo final, progreso mazmorra, minimapa objetivos, mapa cripta con geometría de salas y ruta; señales de sellos y ataque anunciado. MobSnapshot añade hazardMs/hazardX/hazardZ/hazardRadius; PlayerSnapshot añade dungeonStage/dungeonKills opcionales por compatibilidad de fixtures.
- [x] Pruebas: campaña alcanzable 1–10, fuentes botín, economía, validación objetivos y sellos, ataques anticipados y esquiva, reinicios; regresiones cliente y tests completos/tsc/build.
- [x] Revisión independiente, documentación de recorrido, pruebas visuales.

## Registro
Inicio: cambios anteriores de catálogo presentes sin commit. Se trabaja sobre ellos sin revertirlos. Diseño y avance autorizados por el usuario.


Entrega verificada: 164 pruebas shared, 135 servidor, 93 cliente (392 total / 61 archivos); TypeScript de los tres módulos y build cliente aprobados. Revisión corrigió crédito/EXP compartidos cuando muere o se desconecta el autor del veneno, aggro del guardián a distancia, limpieza de señales visuales y posición exacta del Anciano. Browser con fixture local en memoria: salas, textura, guía, minimapa, movimiento y área roja visibles; sin errores de consola. No se midió todavía duración/diversión con jugadores reales.
