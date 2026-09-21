# Animaciones de habilidades

Las 45 habilidades del catálogo (clases, armas y tomos) tienen efectos procedurales de Three.js. `SkillEffects` distingue flechas, lanzas de hielo, orbes, meteoros descendentes, rayos, columnas elementales, cortes, golpes de escudo, curación, buffs y desplazamientos.

Referencias de identidad de los poderes: [MU Online — Dark Wizard](https://muonline.webzen.com/en/gameinfo/guide/detail/6) y [Lineage II — Battle Chronicle](https://www.lineage2.com/en-us/news/battle-chronicle-patch-notes). Los efectos se construyen con geometría propia, integrada al estilo del juego.

## Combate y sincronización

- El servidor valida el alcance mediante `skillRange`. Golpes sin alcance explícito: 2,5 unidades; Nova de Escarcha: 3; proyectiles del mago: 10; cargas: 12. Explorador y tomos conservan sus alcances configurados.
- `SkillCast` transmite mapa, origen, destino y posición del objetivo para visualizar desplazamientos sin depender de posiciones interpoladas atrasadas.
- `StatusEffects` consume los tiempos sincronizados: estrellas para stun, prisión de cristales para raíces, partículas para veneno y auras para buffs. Sigue a la entidad y se limpia al expirar, morir, purgarse o eliminarse. Se oculta fuera del mapa visible.
- `Damage` es la fuente de números de daño. Se emite también por cada tick de veneno PvP. Los números concurrentes se separan; los ticks no vuelven a disparar la animación de ataque del lanzador.
- La resolución de daño continúa siendo inmediata en el servidor; el viaje del proyectil es visual. Los hechizos continúan afectando al objetivo individual definido por las reglas actuales.

## Vista local

Con el cliente iniciado, abrir `/skill-preview.html`. Permite elegir cualquiera de las habilidades y repetir su animación con modelos del juego. Los números de esa vista son ilustrativos; la partida usa los eventos reales del servidor.

## Verificación

Se verifican cobertura y limpieza de efectos para todas las habilidades, trayectoria descendente del meteoro, seguimiento y limpieza de estados, separación de números simultáneos, rechazo por alcance, posiciones de casteo y eventos de daño periódico PvP.

Comandos: `npm test`, `npx tsc --noEmit -p client/tsconfig.json`, `npx tsc --noEmit -p server/tsconfig.json` y `npm run build --workspace @aden/client`.
