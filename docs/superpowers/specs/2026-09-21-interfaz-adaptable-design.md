# Interfaz inicial adaptable — diseño de entrega 4

Diseño preparado durante verificación de conexión; interfaz implementada en 1e51cf8 y f833749. Acceso compatible con autofill implementado en 9106fbf; resultados de cierre en docs/entrega-consolidacion.md. Autorización general de consolidación cubre ajustes reversibles; preservar el estilo visual y los sistemas del juego.

## Problema medido
Ver docs/diagnostico-continuidad.md: en 390x844 el HUD tapa habilidades y el chat tapa objetivo/personaje; el tracker queda de 109 px de ancho. No hay overflow horizontal del documento, por lo que ocultar overflow no resuelve el problema. En 1280x720 y 1280x560 los controles básicos siguen visibles. Usar esas medidas como línea base, no tratar una captura como prueba de todas las escenas.

## Decisión de diseño
Conservar el aspecto de Aden y coordinar las regiones de interfaz mediante CSS responsive, con atributos/clases estables. Prioridad: vida/maná y habilidad visibles, objetivo legible, chat deliberadamente expandible. Evitar reconstruir componentes o medir cada frame. Si hace falta medir alturas, usar ResizeObserver con limpieza. No cambiar stats, recompensas, quests ni el protocolo.

En pantallas estrechas reservar la franja inferior para skills, poner HUD compacto encima y minimizar inicialmente chat. El objetivo debe tener ancho legible y texto completo accesible, no recortarlo de forma irreversible. Reducir minimapa/audio y distribuir la parte superior sin tapar misión/controles. No colapsar el chat a mitad de escritura ni sobrescribir una preferencia explícita al redimensionar. En escritorio conservar distribución reconocible. Los avisos diarios y anuncios largos deben envolver texto dentro de una región que no tape habilidades ni salga de la pantalla.

## Criterios de aceptación
- Verificar 1280x720, 1280x560, 390x844 y 844x390; En el estado normal de juego, HP/MP, al menos la habilidad seleccionada, objetivo y acceso al chat visibles. Los avisos transitorios pueden cubrir temporalmente el objetivo o radar mientras muestran feedback; al expirar debe reaparecer íntegro. Los avisos no deben cubrir HP/MP, habilidades ni el acceso al chat. Scroll local permitido para seis habilidades o textos largos si todo es accesible y el control de scroll es utilizable.
- HUD y skillbar no se intersectan; chat colapsado no tapa el personaje en estado inicial. Al expandirlo, su contenido y controles se pueden usar y minimizar de nuevo.
- Objetivo de pueblo/Bosque y texto largo de Cripta legibles; no columna estrecha, no pérdida de historia por clamp sin expansión.
- Seis habilidades de una clase de nivel40, nombres largos y aviso diario largo además de Knight nivel1. Las fixtures temporales deben usar componentes reales y datos sintéticos en una página local gitignored o pruebas DOM; no introducir un acceso de debug en producción.
- En conexión perdida, el modal de entrega3 sigue por encima de toda la UI y bloquea los controles.
- La validación del formulario ClassSelect se trata como tarea separada: submit comprueba los valores actuales, input/change/pageshow/focus ayudan al autofill, y un submit válido no depende de que input se haya disparado. No polling, no lectura de contraseñas del usuario ni almacenamiento nuevo. Usar campos de prueba y jsdom.
- No afirmar controles táctiles completos: viajes y ciertos paneles aún dependen del teclado; este alcance corrige visibilidad y claridad en ventanas pequeñas.

## Superficie sugerida
Hud.ts (casing real del archivo), SkillBar.ts, AdventureTracker.ts, Minimap.ts, AudioPanel.css, ChatPanel.ts/css y una hoja de distribución compartida si evita reglas dispersas. Classes/data attributes e inline style deben coordinarse sin una cascada extensa de !important. ClassSelect.ts y sus tests para autofill como segunda tarea independiente. La implementación se organizó en las dos tareas del plan docs/superpowers/plans/2026-09-21-interfaz-adaptable.md y conserva los contratos de entrega 3.

## Decisión tras verificación visual
La revisión confirmó que exigir el objetivo visible incluso bajo avisos transitorios excedía la distribución prevista para ventanas pequeñas. Se acepta la superposición breve de los avisos sobre el objetivo/radar; nunca se elimina ni recorta su contenido, y se conserva la prioridad de HP/MP, habilidades y chat. Coste: durante esos segundos se puede perder de vista la misión; queda documentado para futuras mejoras. El estado normal y los seis botones deben mantenerse separados también a 1024x768, además de los cuatro tamaños iniciales.
