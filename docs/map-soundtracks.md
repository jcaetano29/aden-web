# Música de los mapas

Seis composiciones originales de fantasía medieval instrumental, creadas mediante síntesis Web Audio. Cada una tiene 32 compases con melodía, armonía, bajo, variaciones de registro y una sección más despejada. No hay grabaciones, servicios externos ni archivos musicales que descargar al entrar a un mapa.

| Mapa | Pieza | Ciclo | Carácter |
| --- | --- | --- | --- |
| Pueblo de Aden | Lumbre del hogar | 74 s | Arpa, flauta y cuerdas cálidas; compás ternario |
| Bosque de Umbra | Susurros de Umbra | 113 s | Flauta modal, arpegios, viento suave y aves |
| Ruinas de Nihil | Memoria de la piedra | 124 s | Campanas veladas, cuerdas y viento |
| Yermo Ceniciento | Bajo la ceniza | 101 s | Modo frigio, cuerdas graves, metales suaves y tambores |
| Trono del Rey Nihil | Corona de sombras | 107 s | Marcha lenta, coro sintético, metales y timbales |
| Cripta de las Dos Llamas | Las dos llamas | 128 s | Coro sin palabras, campanas, gotas y reverberación larga |

## En el juego

- El mapa autoritativo del personaje selecciona la pieza al entrar o viajar.
- Fundido de cuatro segundos entre mapas. En viajes consecutivos se acorta la cola anterior a 80 ms y se conserva el último destino pedido, con un máximo de dos escenas de audio.
- Botón **Música y sonido**, debajo del minimapa: volúmenes separados de música, ambiente y efectos. **N** silencia o activa todo; **Escape** cierra el mezclador.
- Los ajustes se guardan en `aden.audio.v1` en el navegador. Storage bloqueado o malformado conserva los valores predeterminados.
- El primer gesto habilita el contexto. Los siguientes permiten recuperarlo si el navegador rechaza o interrumpe la reproducción. Al ocultar la pestaña se suspenden contexto y programación; al regresar se reanudan sin acumular notas.
- El panel de misiones se desplaza debajo del control de audio y conserva su desplazamiento dentro de la pantalla.

## Escuchar sin iniciar sesión

Con Vite en ejecución, abrir `/soundtrack-preview.html`. Permite elegir los seis mapas, ver sus escenarios y escuchar las transiciones sin requisitos de nivel. Es una página local de desarrollo, como las otras vistas previas del repositorio; el build del juego no la publica.

## Código

- `client/src/audio/score.ts`: partituras y perfiles de cada mapa.
- `instruments.ts`: timbres aditivos, envolventes, estéreo y reverberación.
- `Soundscape.ts`: programación por reloj de audio, repetición, ambientes y liberación de voces.
- `AudioEngine.ts`, `settings.ts`, `lifecycle.ts`: mezcla, persistencia, efectos existentes y ciclo de vida.
- `client/src/render/AudioPanel.ts` y CSS: controles accesibles y recuperación del foco, sin bloquear los atajos al cerrar.

## Verificación

- Tests de cobertura de mapas, estructura musical, preferencias, rechazo de autoplay, suspensión/reanudación con operaciones pendientes, limpieza, cambios rápidos y continuidad en el punto de repetición.
- Render completo de las seis partituras más diez segundos del siguiente ciclo en `OfflineAudioContext`: muestras finitas, ningún segundo silencioso tras el inicio, señal en la unión y picos menores de 0,088 con la mezcla predeterminada. La comprobación es técnica; la valoración musical final se hace escuchando.
- Chrome real: señal antes de silenciar y cero después; ajustes restaurados al recargar; doce cambios de mapa sin acumulación de voces; sin errores de página. Mezclador revisado a 1440×960, 390×844 y 900×540.
- Juego completo con servidor temporal en memoria: crear personaje, comenzar, entrar a Aden, viajar a Umbra, cambiar la pieza y usar **N**, sin errores de página.
- Scripts: `scripts/verify-audio.cjs` (controles, render y WAVs) y `scripts/verify-audio-game.cjs` (flujo real, servidor de prueba en 2571). Aceptan como primer argumento la ruta a Playwright si no está instalado en el proyecto. El primero acepta como segundo argumento el origen de Vite; por defecto ambos usan `http://127.0.0.1:5174`.
- WAVs, capturas e informes se escriben en `artifacts/audio/`, ignorado por Git. No forman parte del bundle.

Los cambios se limitan a la ambientación sonora y sus controles; no alteran el servidor, la progresión ni la geometría de los mapas.
