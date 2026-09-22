# Interfaz inicial adaptable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Hacer visibles y utilizables el estado del personaje, habilidades, objetivo y chat en ventanas pequeñas, y evitar bloqueos de acceso por autofill.
**Architecture:** Distribución CSS compartida con clases/variables estables de los componentes reales; estado local del chat que respeta decisiones explícitas. El formulario valida los valores actuales y no depende de eventos input previos.
**Tech Stack:** TypeScript, DOM/CSS, Vitest/jsdom, Vite; sin nuevas dependencias.
**Spec:** docs/superpowers/specs/2026-09-21-interfaz-adaptable-design.md

## Global Constraints
- Conservar el aspecto de Aden y coordinar las regiones de interfaz mediante CSS responsive, con atributos/clases estables.
- No cambiar stats, recompensas, quests ni el protocolo. Conservar controles existentes y textos de historia.
- Verificar 1280x720, 1280x560, 390x844 y 844x390; En el estado normal de juego, HP/MP, al menos la habilidad seleccionada, objetivo y acceso al chat visibles. Los avisos transitorios pueden cubrir temporalmente el objetivo o radar mientras muestran feedback; al expirar debe reaparecer íntegro. Los avisos no deben cubrir HP/MP, habilidades ni el acceso al chat. Scroll local permitido para seis habilidades o textos largos si todo es accesible y el control de scroll es utilizable.
- HUD y skillbar no se intersectan; chat colapsado no tapa el personaje en estado inicial. Al expandirlo, su contenido y controles se pueden usar y minimizar de nuevo.
- No colapsar el chat a mitad de escritura ni sobrescribir una preferencia explícita al redimensionar.
- En conexión perdida, el modal de entrega3 sigue por encima de toda la UI y bloquea los controles.
- No afirmar controles táctiles completos. No polling, no lectura de contraseñas del usuario ni almacenamiento nuevo.
- Datos sintéticos locales; sin Supabase de producción, merge ni despliegue. El usuario autorizó posteriormente el push de la rama y pidió detener la automatización al terminar. El controlador verifica navegador, administra sus servidores y publica la rama. Cada implementador trabaja sólo en sus archivos, no inicia servidores ni hace push.

### Task 1: Distribución de interfaz y chat adaptable

**Files:**
- Create: client/src/render/GameLayout.css, reglas de distribución compartidas importadas por los componentes afectados (para incluirlas también en fixtures con componentes reales).
- Modify: client/src/render/Hud.ts, SkillBar.ts, AdventureTracker.ts, Minimap.ts, ChatPanel.ts, ChatPanel.css, AudioPanel.css (y AudioPanel.ts sólo para importar GameLayout.css si es necesario).
- Test: client/src/render/ChatPanel.test.ts. Agregar pruebas DOM sólo para comportamiento nuevo, no comparar cadenas CSS; la geometría se verifica en navegador.
- Create: docs/interfaz-adaptable.md con comportamiento y límites, sin afirmar aceptación del navegador hasta reporte del controlador.

**Interfaces:** Mantener constructores/métodos públicos. Mantener data-player-hud, data-skill-bar, data-adventure-tracker, .aden-minimap, data-chat-panel y data-audio-panel. Produces: CSS por componente y estado explícito de expansión del chat; ninguna tarea posterior depende de métodos nuevos.

- [x] **Step 1: RED del chat compacto y preferencias.** Añadir matchMedia controlable en tests: query '(max-width: 900px), (max-height: 500px)'. En viewport compacto nuevo ChatPanel debe empezar minimizado, Enter conectado abre/focaliza. Elegir expandir mediante toggle/filtro/Enter es preferencia explícita; redimensionar no la revierte. Minimizar explícitamente tampoco se revierte; borrador y foco no desaparecen. Listener de media y ResizeObserver se limpian en dispose. Mock simple de MediaQueryList y emitir change; ver fallar antes de implementar.

```ts
expect(panel.el.querySelector('[data-chat-toggle]')?.getAttribute('aria-expanded')).toBe('false');
key(document.body, 'Enter');
expect(document.activeElement).toBe(input);
input.value = 'Busco grupo';
// change the mocked media query and emit change
expect(input.value).toBe('Busco grupo');
expect(panel.el.querySelector('[data-chat-toggle]')?.getAttribute('aria-expanded')).toBe('true');
```

- [x] **Step 2: Implementar chat adaptable.** Usar matchMedia con fallback cuando no existe (jsdom original). Cambios automáticos sólo antes de interacción explícita y sin input enfocado/borrador. El botón conserva aria-expanded y los no leídos. ResizeObserver posiciona respecto a HUD real: preferir variable --aden-hud-height compartida o bottom calculado desde getBoundingClientRect más separación; no sumar únicamente offsetHeight ignorando bottom responsive. Limpiar observadores/listeners. Mantener envío/eco/filtros sin cambios.

```ts
// CSS owns position, JS owns measured height only when required.
// Explicit expansion choices persist for this component's lifetime.
private expansionChosen = false;
```

- [x] **Step 3: Coordinar posiciones sin pelear inline/CSS.** Extraer sólo propiedades geométricas a clases de GameLayout.css; conservar paleta/theme, medallón y barras. Pantalla estrecha: reservar parte inferior para skills con scroll horizontal y scrollbar visible, HUD compacto encima, chat minimizado junto/sobre HUD sin tapar skills. Cabecera superior: radar/audio pequeños y objetivo de ancho legible; Cripta con scroll local y teclado (tabIndex/aria si región scrolleable). En paisaje bajo distribuir HUD izquierda, skills centro/derecha y objetivo superior con altura acotada; minimizar chat inicialmente para liberar escena. Mantener escritorio reconocible. Textos de misiones largos no deben ensanchar HUD; usar wrap y ocultar sólo duplicación del HUD si AdventureTracker conserva toda la información. No clamp irreversible. Banners diarios/anuncios con wrapping, box-sizing y región acotada, sin tapar habilidades. No cascada extensa de !important, ni mediciones por frame.

```css
/* Geometry belongs to stylesheet rather than hard-coded inline declarations. */
[data-skill-bar] { box-sizing: border-box; overflow-x: auto; overflow-y: hidden; }
[data-adventure-tracker] { overflow-y: auto; overscroll-behavior: contain; }
```

- [x] **Step 4: Verificar comportamiento y compilar.** Ejecutar enfocadas ChatPanel durante iteración, una suite cliente completa antes del commit, TypeScript y build: npm test --workspace @aden/client; node_modules/.bin/tsc.cmd --noEmit -p client/tsconfig.json; npm run build --workspace @aden/client. Escribir reporte con comandos/resultados/RED-GREEN. El controlador hará fixture local con Knight1, clase40 con seis skills, Cripta/historia larga, aviso diario, chat abrir/escribir/minimizar, audio y modal. No afirmar geometría verificada por jsdom.
- [x] **Step 5: Self-review y commit.** Diff acotado, controles accesibles, cleanup. Commit explícito de archivos de Task1; no agregar docs de controlador, fixtures ni artifacts. Devolver SHA y reporte para revisión independiente.

### Task 2: Formulario compatible con autofill

**Files:** Modify client/src/render/ClassSelect.ts, client/src/render/ClassSelect.test.ts y docs/interfaz-adaptable.md sólo sección de acceso.
**Interfaces:** Mantener LoginResult, create(errorMsg), remove y modo login inicial; nunca guardar credenciales. Sin dependencia funcional de Task1.

- [x] **Step 1: RED de valores actuales.** Probar que asignar nombre/password válidos sin evento input permite confirmar con click/submit; change, pageshow y focus refrescan feedback; espacios/nombre vacío y password corta no resuelven; doble submit resuelve una vez; remove retira listeners globales. Mantener cinco clases/apariencias existentes.
```ts
const result = select.create();
name.value = 'AutofillTemporal'; pass.value = 'prueba123';
// No synthetic input event: click must still reach submit validation.
enter.click();
expect(await result).toMatchObject({name: 'AutofillTemporal', mode: 'login'});
```
- [x] **Step 2: Implementar validación al enviar.** Botón activable sin depender de un disabled obsoleto basado en eventos; validar valores actuales en confirm y usar feedback claro español. input/change/focus/pageshow sincronizan feedback/estado cuando corresponda. Nunca colocar aria-disabled=true y aceptar activación simultáneamente. Evitar submit prematuro/duplicado y limpiar listeners/timer en remove. HTML constraints compatibles con máximos existentes y trim del nombre; no polling ni almacenamiento.
- [x] **Step 3: Pruebas enfocadas, tsc, self-review y commit.** npm test --workspace @aden/client -- src/render/ClassSelect.test.ts, TypeScript. No repetir suite completa de Task1 por este cambio aislado; documentar evidencia del comportamiento y commit explícito. Revisión independiente con diff Task2.
