# Licencias de assets 3D

## Personajes: Quaternius RPG Characters
- Autor: Quaternius
- Licencia: CC0 1.0 (dominio público, sin atribución obligatoria)
- Fuente: https://quaternius.com/packs/rpgcharacters.html
- Archivos: Knight.glb, Mage.glb, Barbarian.glb, Rogue.glb
- Originales: Warrior, Wizard, Monk y Rogue respectivamente.
- Uso: modelos riggeados y animados, convertidos a GLB con scripts/import-quaternius.cjs.

## Enemigos: Quaternius Ultimate Monsters
- Autor: Quaternius
- Licencia: CC0 1.0
- Fuente: https://quaternius.com/packs/ultimatemonsters.html
- Archivos: OrcBrute.glb (Orc), BoneWarden.glb (Orc Skull), ForestTroll.glb (Yeti), InfernalDemon.glb (Demon), DeathWraith.glb (Ghost Skull), AncientDrake.glb (Dragon Evolved).
- Uso: modelos riggeados con animaciones propias, convertidos a GLB sin modificar sus mallas.

CC0 no exige atribución; se incluye por buena práctica y trazabilidad.

## Reemplazos de los enemigos originales: acechador y caballero malditos
- Base: Rogue y Warrior de Quaternius RPG Characters (CC0 1.0).
- Fuente: https://quaternius.com/packs/rpgcharacters.html
- Archivos: DreadStalker.glb y DreadKnight.glb.
- Adaptaciones propias en RevenantDetails.ts: máscaras, casco, púas, hombreras y emblema; materiales oscuros y ojos emisivos. Se mantienen los esqueletos de animación del autor.
- Los antiguos modelos KayKit de abajo se conservan como recursos históricos, pero ya no se cargan ni se asignan a enemigos.

## Enemigos: KayKit Character Pack — Skeletons 1.0
- Autor: Kay Lousberg (KayKit)
- Licencia: CC0 1.0 (dominio público, sin atribución obligatoria)
- Fuente: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0
- Archivos: Skeleton_Minion.glb, Skeleton_Warrior.glb
- Uso: modelos low-poly riggeados y animados, formato glTF binario.

## Héroes modulares: muestra de caballero y mago

- Autor de las bases: Quaternius. **Ediciones Standard gratuitas, CC0 1.0**.
- [Universal Base Characters](https://quaternius.itch.io/universal-base-characters): cuerpos Superhero, ojos, cejas y cabello.
- [Modular Character Outfits — Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy): ropa Peasant/Ranger, adaptada y recortada.
- [Universal Animation Library](https://quaternius.itch.io/universal-animation-library): clips sin desplazamiento de raíz, adaptados a las matrices de reposo de cada cuerpo.
- [Fantasy Props MegaKit](https://quaternius.itch.io/fantasy-props-megakit): Sword_Bronze y Shield_Wooden.
- Archivos resultantes: `heroes/hero-male.glb`, `heroes/hero-female.glb`, `heroes/sword.glb`, `heroes/shield.glb`, `heroes/staff.glb`.
- Las ediciones gratuitas NO incluyen placas de caballero, ropa de mago ni bastón. Cuiraza, hombreras, grebas, brazales, casco, túnica y bastón de cristal son geometría original del proyecto, reproducible en `scripts/heroes/wardrobe.mjs`.
- Dos variantes de rostro por cuerpo se derivan de las mallas originales; no se escalan cabezas completas. Texturas de piel/cabello neutralizadas para tintes. Detalle de metal y tela: atlas generado existente del proyecto (`textures/hero-material-atlas.png`), sin nueva dependencia externa.
- Inventario con hashes de todos los archivos originales, correcciones de URI y licencias: `scripts/heroes/source-selection.json`. Exports y hashes: `heroes/provenance.json`. Originales descargados en `artifacts/source-models/heroes/` (ignorado por Git).
- No se incluyen ni se requieren archivos Pro o Source de pago.
