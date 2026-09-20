# Cripta ampliada: expedición compartida sin respawns

**Objetivo:** salas despejadas hasta terminar el recorrido, mapa mayor con identidad y bestias variadas.
**Arquitectura:** una expedición compartida por GameRoom. Progreso de sala global, reflejado en dungeonStage/dungeonKills de cada jugador. Nunca reaparecen enemigos dentro de una expedición. Se reinicia cuando no quedan participantes en el mapa; al morir se regresa al pueblo. Entradas tardías se suman al avance actual; tras vencer al jefe se espera a que salgan todos para abrir otra expedición.
**Autorización:** el usuario aprobó corregir respawns y ampliar mapa y bestias. Conservar las mejoras posteriores de NPCs y navegación del commit 9a521da.

## Contratos
- shared/dungeon.ts: CRYPT_ROOMS `{id,x,z,width,depth}[]`, CRYPT_ROUTE `{x,z}[]`, CRYPT_SEALS `{id,x,z}[]`, CRYPT_SPAWN, CRYPT_BOSS, CRYPT_BOUNDS; CRYPT_WAVE_TEMPLATES `Record<number,string[]>` claves0/2; CRYPT_WAVE_SIZE=6.
- Mapa bounds x815..985 z-180..100; entrada900,90; salas: entrada900,75 (42x30), despertar860,25 (62x52), fragua940,-55 (66x58), corazón900,-140 (78x62). Sellos845,8 y960,-72. Custodio900,-140.
- Ola0:3 crypt_acolyte +3 crypt_stalker; ola2:3 crypt_flameguard +2 crypt_emberbeast +1 crypt_behemoth. Jefe crypt_warden.
- Bestias reutilizan modelos animados distintos: DeathWraith, DreadStalker, BoneWarden, InfernalDemon, ForestTroll y AncientDrake. No se afirma que sean modelos nuevos.
- Preservar EXP total obligatoria de cripta de la campaña (acolytes/guards antes 3+3 másjefe), distribuyéndola entre criaturas; recompensas existentes y nivel recomendado5–7.
- Daño de ataque normal/skills/DoT/reflejo bloqueado para enemigos de etapa futura o terminada. Progreso global no depende de cercanía al último golpe. EXP compartida cercana y premio al jefe sólo a jugadores vivos cercanos elegibles, una vez/run.
- Guardianes: jefe conserva peligro fijo radio6 aviso1600ms; behemoth ataque área lento radio5 aviso2000ms; emberbeast ataque más rápido y débil. Señales existentes sincronizadas en cliente.

## Implementación y verificación
- [x] Datos compartidos, geometría/colisiones y bestiario; navegación válida desde entrada a sellos/jefe. Plan ejecución con subagentes para áreas independientes.
- [x] Servidor: expedición compartida, no respawn, reinicio vacío/muerte/desconexión, reentrada y nuevas habilidades de bestias; pruebas de recorrido y multijugador.
- [x] Cliente: mapa ampliado texturizado, rutas/alas, guía y marcadores desde constantes; instrucciones de expedición actualizadas.
- [x] Tests completos, TypeScript/build y revisión independiente; documentación y prueba visual si entorno disponible.

## Límites
No agrega instancias privadas ni matchmaking. La expedición persiste mientras exista un jugador dentro, incluso si está inactivo. El balance de tiempo/dificultad requiere juego real además de tests de progresión.

## Resultado verificado
177 tests shared +145 servidor +105 cliente =427 aprobados. TypeScript de los tres paquetes correcto y build Vite correcto (advertencia de bundle >500 kB). Revisión independiente corrigió reingreso por save a expedición completada; regresión incluida. Navegador local: Sala del Despertar, seis bestias, guía y minimapa ampliados visibles. Ajustado texto del minimapa para no cortarse. Entorno de prueba temporal retirado.
