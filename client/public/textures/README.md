# Materiales de Aden

`aden-material-atlas.png` es un atlas original generado con la herramienta integrada
de imágenes de Codex el 20 de septiembre de 2026. No contiene recursos extraídos
de Lineage II ni MU Online. Los modelos KayKit conservan sus licencias originales
en `../models/LICENSES.md`.

La cuadrícula 4 × 4 se lee de izquierda a derecha, de arriba abajo:

1. Sillería, madera, pizarra, paja.
2. Revoque, adoquín, tela ornamental, piedra con musgo.
3. Pasto, tierra de bosque, escombros, basalto volcánico.
4. Acero grabado, cuero, hojas, hueso.

El cliente descarga el atlas una sola vez y prepara mapas de color, relieve y
rugosidad de 512 × 512 por material. El relieve es una aproximación derivada de la
luminancia, no una reconstrucción física de la superficie. Los bordes opuestos
se mezclan en una franja estrecha para permitir repetición. Los colores usan sRGB;
los datos de relieve/rugosidad permanecen lineales. Si la carga falla o supera
15 segundos se utilizan materiales procedurales.

Los personajes conservan su textura de colores y sus UV originales. Un shader
añade detalle triplanar en coordenadas del modelo y distingue metal, tela, cuero
y hueso según el color base. Es una aproximación artística: las proporciones y
las siluetas de los modelos siguen siendo las originales.

## Prompt utilizado (herramienta integrada, sin CLI)

Create a production game texture atlas, exactly square image, a perfectly regular
4 by 4 grid of 16 square material tiles, edge-to-edge with absolutely NO gaps,
borders, labels, text, objects or perspective. Each tile occupies exactly 25
percent of width and height. High fidelity realistic medieval dark fantasy MMORPG
surface textures inspired by Lineage II. All surfaces orthographic straight on,
uniform diffuse lighting, no cast shadows, no vignettes. Each individual square
is a repeatable material texture. Row 1 left to right: weathered gray limestone
ashlar masonry with narrow mortar; dark aged oak vertical planks with grain;
overlapping blue gray slate roof shingles; warm dry bundled thatch. Row 2: aged
ivory lime plaster; irregular pale gray medieval flagstone pavement tightly
fitted; burgundy woven fabric subtle gold filigree; cracked ancient stone with
moss in crevices. Row 3: natural desaturated green grass mixed with earth and fine
dry leaves viewed directly overhead; dark forest earth with scattered leaves
roots moss viewed overhead; gray ruined gravel ground with small rubble viewed
overhead; black volcanic basalt with very subtle deep ember fissures viewed
overhead. Row 4: aged brushed silver steel with small engraved fantasy scrollwork;
dark brown worn leather with fine grain; dense natural olive green leaf surface;
aged ivory bone with fine cracks. Fine rich microdetail, natural organic variation,
restrained medieval palette. This is ONE functional texture atlas asset for a 3D
game, precise equal tile grid is essential. Save the generated image for use in
the project.
