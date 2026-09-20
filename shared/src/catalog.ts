export interface CatalogItem {
  id: string;
  name: string;
  type: "equipment" | "consumable" | "material";
  stackable: boolean;
  ref_origen: string;
  category: string;
  subcategory: string;
  classes: string[];
  hands: "1H" | "2H" | null;
  tier: number;
  description: string;
  allowedQualities: ("normal" | "magic" | "excellent")[];
  requiredLevel?: number;
  slot?: "weapon" | "armor" | "accessory" | "shield" | "helmet" | "gloves" | "pants" | "boots" | "wings" | "ring" | "pet";
  bonuses?: { pAtk?: number; pDef?: number; maxHp?: number; maxMp?: number };
  setId?: string;
  heal?: number;
  mana?: number;
  useEffect?: string;
  learnSkill?: string;
  ammo?: "arrow" | "bolt";
  petEffect?: "guardian" | "imp" | "mount";
}

const ITEMS: CatalogItem[] = [
  {
    "id": "aden_punal_del_umbral",
    "name": "Puñal del Umbral",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "kris",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 1,
    "description": "Daga corta, el arma cuerpo a cuerpo mas basica del juego.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 4
    }
  },
  {
    "id": "aden_hoja_del_primer_juramento",
    "name": "Hoja del Primer Juramento",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "short_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 2,
    "description": "Espada corta de una mano, arma inicial ligera.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 4,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 6
    }
  },
  {
    "id": "aden_aguja_de_la_frontera",
    "name": "Aguja de la Frontera",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "rapier",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 3,
    "description": "Estoque liviano de una mano, rapido pero de bajo dano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 6,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 8
    }
  },
  {
    "id": "aden_filo_del_verdugo",
    "name": "Filo del Verdugo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sword_of_assassin",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 4,
    "description": "Espada de asesino, una mano, agil.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 9,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 10
    }
  },
  {
    "id": "aden_espada_del_vigia",
    "name": "Espada del Vigía",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "blade",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight"
    ],
    "hands": "1H",
    "tier": 5,
    "description": "Espada equilibrada de una mano, muy usada en niveles medios.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 12
    }
  },
  {
    "id": "aden_gladio_de_las_cenizas",
    "name": "Gladio de las Cenizas",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "gladius",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight"
    ],
    "hands": "1H",
    "tier": 6,
    "description": "Espada corta estilo romano de una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 14
    }
  },
  {
    "id": "aden_corvo_de_la_marca_gris",
    "name": "Corvo de la Marca Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "falchion",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight"
    ],
    "hands": "1H",
    "tier": 7,
    "description": "Sable curvo de una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 17,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 16
    }
  },
  {
    "id": "aden_hoja_de_la_sierpe_palida",
    "name": "Hoja de la Sierpe Pálida",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "serpent_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight"
    ],
    "hands": "1H",
    "tier": 8,
    "description": "Espada con motivo de serpiente, una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 19,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 18
    }
  },
  {
    "id": "aden_filo_de_brasa_viva",
    "name": "Filo de Brasa Viva",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sword_of_salamander",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight"
    ],
    "hands": "1H",
    "tier": 9,
    "description": "Espada flamigera inspirada en la salamandra.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 22,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 21
    }
  },
  {
    "id": "aden_sable_del_astronomo",
    "name": "Sable del Astrónomo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "light_saber",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "mage"
    ],
    "hands": "1H",
    "tier": 10,
    "description": "Sable de energia; aporta dano magico, preferida por magos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 24,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 23
    }
  },
  {
    "id": "aden_mandoble_del_custodio",
    "name": "Mandoble del Custodio",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "2H",
    "tier": 11,
    "description": "Espada legendaria de dos manos, alto dano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 25
    }
  },
  {
    "id": "aden_espada_del_sol_herido",
    "name": "Espada del Sol Herido",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "heliacal_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "2H",
    "tier": 12,
    "description": "Espada solar de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 27
    }
  },
  {
    "id": "aden_gemela_de_los_caidos",
    "name": "Gemela de los Caídos",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "double_blade",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "2H",
    "tier": 13,
    "description": "Espada de doble hoja a dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 32,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 29
    }
  },
  {
    "id": "aden_mandoble_de_la_tormenta",
    "name": "Mandoble de la Tormenta",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "lightning_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "2H",
    "tier": 14,
    "description": "Espada de rayo a dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 35,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 31
    }
  },
  {
    "id": "aden_espadon_de_los_titanes",
    "name": "Espadón de los Titanes",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "giant_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "2H",
    "tier": 15,
    "description": "Espadon enorme de dos manos, dano muy alto y velocidad baja.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 37,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 33
    }
  },
  {
    "id": "aden_hoja_de_cristal_negro",
    "name": "Hoja de Cristal Negro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "crystal_sword",
    "category": "arma",
    "subcategory": "espada",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "2H",
    "tier": 16,
    "description": "Espada de cristal de dos manos; suele fabricarse en la Fragua de Dorne.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    }
  },
  {
    "id": "aden_destral_del_lenador_gris",
    "name": "Destral del Leñador Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "small_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 1,
    "description": "Hacha pequena de una mano, basica.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 6
    }
  },
  {
    "id": "aden_hacha_del_puno_rojo",
    "name": "Hacha del Puño Rojo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "hand_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 2,
    "description": "Hacha de mano de una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 5,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 9
    }
  },
  {
    "id": "aden_bifaz_del_bastion",
    "name": "Bifaz del Bastión",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "double_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 3,
    "description": "Hacha doble de una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 10,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 12
    }
  },
  {
    "id": "aden_hacha_de_la_estepa",
    "name": "Hacha de la Estepa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "tomahawk",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 4,
    "description": "Hacha arrojadiza tipo tomahawk, una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 16
    }
  },
  {
    "id": "aden_destral_silvano",
    "name": "Destral Silvano",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "elven_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "ranger"
    ],
    "hands": "1H",
    "tier": 5,
    "description": "Hacha elfica ligera.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 18,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 19
    }
  },
  {
    "id": "aden_hacha_de_guerra_de_aden",
    "name": "Hacha de Guerra de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "battle_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 6,
    "description": "Hacha de batalla de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 23,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 22
    }
  },
  {
    "id": "aden_hacha_del_rompefilas",
    "name": "Hacha del Rompefilas",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "nikkea_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 7,
    "description": "Hacha Nikkea de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 25
    }
  },
  {
    "id": "aden_hacha_del_juramento_roto",
    "name": "Hacha del Juramento Roto",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "larkan_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 8,
    "description": "Hacha Larkan de dos manos, alto dano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 31,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 29
    }
  },
  {
    "id": "aden_hacha_de_la_media_luna",
    "name": "Hacha de la Media Luna",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "crescent_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 9,
    "description": "Hacha de media luna a dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 36,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 32
    }
  },
  {
    "id": "aden_hacha_del_coloso",
    "name": "Hacha del Coloso",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "chaos_dragon_axe",
    "category": "arma",
    "subcategory": "hacha",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 10,
    "description": "Hacha del dragon del caos, arma de dos manos de alto nivel.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    }
  },
  {
    "id": "aden_maza_del_peregrino",
    "name": "Maza del Peregrino",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "mace",
    "category": "arma",
    "subcategory": "maza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 1,
    "description": "Maza de una mano, contundente.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 5
    }
  },
  {
    "id": "aden_estrella_del_alba_muerta",
    "name": "Estrella del Alba Muerta",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "morning_star",
    "category": "arma",
    "subcategory": "maza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 2,
    "description": "Maza con pinchos (lucero del alba), una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 13
    }
  },
  {
    "id": "aden_azote_de_los_encadenados",
    "name": "Azote de los Encadenados",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "flail",
    "category": "arma",
    "subcategory": "maza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "1H",
    "tier": 3,
    "description": "Mangual de una mano.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 20
    }
  },
  {
    "id": "aden_martillo_del_rompemuros",
    "name": "Martillo del Rompemuros",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "great_hammer",
    "category": "arma",
    "subcategory": "maza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 4,
    "description": "Gran martillo de dos manos, dano alto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 28
    }
  },
  {
    "id": "aden_lucero_de_obsidiana",
    "name": "Lucero de Obsidiana",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "crystal_morning_star",
    "category": "arma",
    "subcategory": "maza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 5,
    "description": "Lucero del alba de cristal; suele fabricarse en la Fragua de Dorne.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    }
  },
  {
    "id": "aden_pica_de_la_guardia",
    "name": "Pica de la Guardia",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "light_spear",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 1,
    "description": "Lanza ligera de dos manos, buen alcance.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 7
    }
  },
  {
    "id": "aden_lanza_del_camino_largo",
    "name": "Lanza del Camino Largo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spear",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 2,
    "description": "Lanza estandar de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 5,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 10
    }
  },
  {
    "id": "aden_lanza_de_sangre_antigua",
    "name": "Lanza de Sangre Antigua",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_lance",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 3,
    "description": "Lanza del dragon, dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 10,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 13
    }
  },
  {
    "id": "aden_tridente_del_coloso_hundido",
    "name": "Tridente del Coloso Hundido",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "giant_trident",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 4,
    "description": "Tridente gigante de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 16
    }
  },
  {
    "id": "aden_pica_de_la_sierpe",
    "name": "Pica de la Sierpe",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "serpent_spear",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 5,
    "description": "Lanza serpiente de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 18,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 19
    }
  },
  {
    "id": "aden_asta_de_doble_luna",
    "name": "Asta de Doble Luna",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "double_poleaxe",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 6,
    "description": "Hacha-lanza doble de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 23,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 23
    }
  },
  {
    "id": "aden_alabarda_del_bastion",
    "name": "Alabarda del Bastión",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "halberd",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 7,
    "description": "Alabarda de dos manos, largo alcance.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 26
    }
  },
  {
    "id": "aden_cuchilla_de_la_frontera",
    "name": "Cuchilla de la Frontera",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "berdysh",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 8,
    "description": "Berdiche (hacha-lanza) de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 31,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 29
    }
  },
  {
    "id": "aden_guadana_del_ultimo_trigo",
    "name": "Guadaña del Último Trigo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "great_scythe",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 9,
    "description": "Gran guadana de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 36,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 32
    }
  },
  {
    "id": "aden_pica_del_senor_de_brasa",
    "name": "Pica del Señor de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bill_of_balrog",
    "category": "arma",
    "subcategory": "lanza",
    "classes": [
      "barbarian",
      "knight"
    ],
    "hands": "2H",
    "tier": 10,
    "description": "Alabarda de Balrog, lanza de alto nivel a dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    }
  },
  {
    "id": "aden_arco_de_la_senda",
    "name": "Arco de la Senda",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "short_bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 1,
    "description": "Arco corto de dos manos, inicial.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 5
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_arco_del_fresno_gris",
    "name": "Arco del Fresno Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 2,
    "description": "Arco estandar de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 10
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_arco_de_la_arboleda_velada",
    "name": "Arco de la Arboleda Velada",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "elven_bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 3,
    "description": "Arco elfico de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 15
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_arco_del_batidor",
    "name": "Arco del Batidor",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "battle_bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 4,
    "description": "Arco de batalla de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 20
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_arco_de_la_fiera_moteada",
    "name": "Arco de la Fiera Moteada",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "tiger_bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 5,
    "description": "Arco del tigre de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 25
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_arco_de_luna_palida",
    "name": "Arco de Luna Pálida",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "silver_bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 6,
    "description": "Arco de plata de dos manos, alto nivel.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 30
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_arco_del_caos_silvestre",
    "name": "Arco del Caos Silvestre",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "chaos_nature_bow",
    "category": "arma",
    "subcategory": "arco",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 7,
    "description": "Arco de la naturaleza del caos; se fabrica en la Fragua de Dorne.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    },
    "ammo": "arrow"
  },
  {
    "id": "aden_ballesta_del_vigia",
    "name": "Ballesta del Vigía",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "crossbow",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 1,
    "description": "Ballesta de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 6
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_ballesta_del_sol_bajo",
    "name": "Ballesta del Sol Bajo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "golden_crossbow",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 2,
    "description": "Ballesta dorada de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 11
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_trueno_de_la_frontera",
    "name": "Trueno de la Frontera",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "arquebus",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 3,
    "description": "Arcabuz (ballesta) de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 16
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_ballesta_del_rayo_blanco",
    "name": "Ballesta del Rayo Blanco",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "light_crossbow",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 4,
    "description": "Ballesta de luz de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 21
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_ballesta_de_la_sierpe",
    "name": "Ballesta de la Sierpe",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "serpent_crossbow",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 5,
    "description": "Ballesta serpiente de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 25
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_ballesta_del_ala_azul",
    "name": "Ballesta del Ala Azul",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bluewing_crossbow",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 6,
    "description": "Ballesta ala azul de dos manos, alto nivel.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 30
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_ballesta_de_marea_dorada",
    "name": "Ballesta de Marea Dorada",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "aquagold_crossbow",
    "category": "arma",
    "subcategory": "ballesta",
    "classes": [
      "ranger"
    ],
    "hands": "2H",
    "tier": 7,
    "description": "Ballesta oro-agua de dos manos, tope de gama.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    },
    "ammo": "bolt"
  },
  {
    "id": "aden_baston_del_huesero",
    "name": "Bastón del Huesero",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "skull_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "1H",
    "tier": 1,
    "description": "Baston de craneo, inicial para magos; aumenta el dano magico.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 5
    }
  },
  {
    "id": "aden_cayado_del_heraldo",
    "name": "Cayado del Heraldo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "angelic_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 2,
    "description": "Baston angelical de dos manos.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 7,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 9
    }
  },
  {
    "id": "aden_vara_de_la_sierpe_sabia",
    "name": "Vara de la Sierpe Sabia",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "serpent_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 3,
    "description": "Baston serpiente.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 12,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 14
    }
  },
  {
    "id": "aden_baculo_de_la_tormenta",
    "name": "Báculo de la Tormenta",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "thunder_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 4,
    "description": "Baston del trueno.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 18,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 18
    }
  },
  {
    "id": "aden_vara_de_la_mirada_petrea",
    "name": "Vara de la Mirada Pétrea",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "gorgon_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 5,
    "description": "Baston gorgona.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 23,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 22
    }
  },
  {
    "id": "aden_baculo_del_arconte",
    "name": "Báculo del Arconte",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 6,
    "description": "Baston legendario, alto poder magico.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 29,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 26
    }
  },
  {
    "id": "aden_cayado_del_segundo_aliento",
    "name": "Cayado del Segundo Aliento",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "staff_of_resurrection",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 7,
    "description": "Baston de resurreccion, tope de gama magico.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 31
    }
  },
  {
    "id": "aden_baculo_del_caos_fulminante",
    "name": "Báculo del Caos Fulminante",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "chaos_lightning_staff",
    "category": "arma",
    "subcategory": "baston",
    "classes": [
      "mage"
    ],
    "hands": "2H",
    "tier": 8,
    "description": "Baston de rayo del caos; se fabrica en la Fragua de Dorne.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "weapon",
    "bonuses": {
      "pAtk": 35
    }
  },
  {
    "id": "aden_rodela_del_recluta",
    "name": "Rodela del Recluta",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "small_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 1,
    "description": "Rodela del Recluta ofrece defensa de tier 1 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "shield",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_broquel_de_la_guardia_gris",
    "name": "Broquel de la Guardia Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "buckler",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 2,
    "description": "Broquel de la Guardia Gris ofrece defensa de tier 2 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 4,
    "slot": "shield",
    "bonuses": {
      "pDef": 3
    }
  },
  {
    "id": "aden_escudo_del_astado",
    "name": "Escudo del Astado",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "horn_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 3,
    "description": "Escudo del Astado ofrece defensa de tier 3 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 7,
    "slot": "shield",
    "bonuses": {
      "pDef": 5
    }
  },
  {
    "id": "aden_escudo_de_la_cometa_negra",
    "name": "Escudo de la Cometa Negra",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "kite_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 4,
    "description": "Escudo de la Cometa Negra ofrece defensa de tier 4 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 9,
    "slot": "shield",
    "bonuses": {
      "pDef": 6
    }
  },
  {
    "id": "aden_egida_de_la_arboleda",
    "name": "Égida de la Arboleda",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "elven_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": "1H",
    "tier": 5,
    "description": "Égida de la Arboleda ofrece defensa de tier 5 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 12,
    "slot": "shield",
    "bonuses": {
      "pDef": 7
    }
  },
  {
    "id": "aden_escudo_de_los_sepultados",
    "name": "Escudo de los Sepultados",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "skull_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 6,
    "description": "Escudo de los Sepultados ofrece defensa de tier 6 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 15,
    "slot": "shield",
    "bonuses": {
      "pDef": 8
    }
  },
  {
    "id": "aden_rodela_del_circulo_de_aden",
    "name": "Rodela del Círculo de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "large_round_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 7,
    "description": "Rodela del Círculo de Aden ofrece defensa de tier 7 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 18,
    "slot": "shield",
    "bonuses": {
      "pDef": 10
    }
  },
  {
    "id": "aden_escudo_del_cerco_espinado",
    "name": "Escudo del Cerco Espinado",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spiked_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 8,
    "description": "Escudo del Cerco Espinado ofrece defensa de tier 8 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "shield",
    "bonuses": {
      "pDef": 11
    }
  },
  {
    "id": "aden_paves_de_la_muralla",
    "name": "Pavés de la Muralla",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "plate_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 9,
    "description": "Pavés de la Muralla ofrece defensa de tier 9 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 23,
    "slot": "shield",
    "bonuses": {
      "pDef": 12
    }
  },
  {
    "id": "aden_egida_de_la_sierpe",
    "name": "Égida de la Sierpe",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "serpent_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 10,
    "description": "Égida de la Sierpe ofrece defensa de tier 10 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 26,
    "slot": "shield",
    "bonuses": {
      "pDef": 14
    }
  },
  {
    "id": "aden_escudo_de_la_torre_vigia",
    "name": "Escudo de la Torre Vigía",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "tower_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "1H",
    "tier": 11,
    "description": "Escudo de la Torre Vigía ofrece defensa de tier 11 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 29,
    "slot": "shield",
    "bonuses": {
      "pDef": 15
    }
  },
  {
    "id": "aden_baluarte_del_cazawyrms",
    "name": "Baluarte del Cazawyrms",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_slayer_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "1H",
    "tier": 12,
    "description": "Baluarte del Cazawyrms ofrece defensa de tier 12 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 32,
    "slot": "shield",
    "bonuses": {
      "pDef": 16
    }
  },
  {
    "id": "aden_egida_del_sabio_caido",
    "name": "Égida del Sabio Caído",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "mage"
    ],
    "hands": "1H",
    "tier": 13,
    "description": "Égida del Sabio Caído ofrece defensa de tier 13 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "shield",
    "bonuses": {
      "pDef": 17
    }
  },
  {
    "id": "aden_gloria_del_juramento_carmesi",
    "name": "Gloria del Juramento Carmesí",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "crimson_glory",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": "1H",
    "tier": 14,
    "description": "Gloria del Juramento Carmesí ofrece defensa de tier 14 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 37,
    "slot": "shield",
    "bonuses": {
      "pDef": 19
    }
  },
  {
    "id": "aden_baluarte_de_brasa_viva",
    "name": "Baluarte de Brasa Viva",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "salamander_shield",
    "category": "escudo",
    "subcategory": "escudo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": "1H",
    "tier": 15,
    "description": "Baluarte de Brasa Viva ofrece defensa de tier 15 y ocupa la mano secundaria.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "shield",
    "bonuses": {
      "pDef": 20
    }
  },
  {
    "id": "aden_yelmo_de_la_senda_del_alba",
    "name": "Yelmo de la Senda del Alba",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "leather_helm",
    "category": "armadura",
    "subcategory": "set_leather",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 1,
    "description": "Yelmo de la Senda del Alba es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "helmet",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_senda_del_alba"
  },
  {
    "id": "aden_coraza_de_la_senda_del_alba",
    "name": "Coraza de la Senda del Alba",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "leather_armor",
    "category": "armadura",
    "subcategory": "set_leather",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 1,
    "description": "Coraza de la Senda del Alba es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "armor",
    "bonuses": {
      "pDef": 3,
      "maxHp": 10
    },
    "setId": "aden_la_senda_del_alba"
  },
  {
    "id": "aden_grebas_de_la_senda_del_alba",
    "name": "Grebas de la Senda del Alba",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "leather_pants",
    "category": "armadura",
    "subcategory": "set_leather",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 1,
    "description": "Grebas de la Senda del Alba es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "pants",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_senda_del_alba"
  },
  {
    "id": "aden_guantes_de_la_senda_del_alba",
    "name": "Guantes de la Senda del Alba",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "leather_gloves",
    "category": "armadura",
    "subcategory": "set_leather",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 1,
    "description": "Guantes de la Senda del Alba es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "gloves",
    "bonuses": {
      "pDef": 1
    },
    "setId": "aden_la_senda_del_alba"
  },
  {
    "id": "aden_botas_de_la_senda_del_alba",
    "name": "Botas de la Senda del Alba",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "leather_boots",
    "category": "armadura",
    "subcategory": "set_leather",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 1,
    "description": "Botas de la Senda del Alba es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "boots",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_senda_del_alba"
  },
  {
    "id": "aden_yelmo_de_el_juramento_de_aden",
    "name": "Yelmo de el Juramento de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bronze_helm",
    "category": "armadura",
    "subcategory": "set_bronze",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 2,
    "description": "Yelmo de el Juramento de Aden es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "helmet",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_juramento_de_aden"
  },
  {
    "id": "aden_coraza_de_el_juramento_de_aden",
    "name": "Coraza de el Juramento de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bronze_armor",
    "category": "armadura",
    "subcategory": "set_bronze",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 2,
    "description": "Coraza de el Juramento de Aden es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "armor",
    "bonuses": {
      "pDef": 6,
      "maxHp": 15
    },
    "setId": "aden_el_juramento_de_aden"
  },
  {
    "id": "aden_grebas_de_el_juramento_de_aden",
    "name": "Grebas de el Juramento de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bronze_pants",
    "category": "armadura",
    "subcategory": "set_bronze",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 2,
    "description": "Grebas de el Juramento de Aden es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "pants",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_juramento_de_aden"
  },
  {
    "id": "aden_guantes_de_el_juramento_de_aden",
    "name": "Guantes de el Juramento de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bronze_gloves",
    "category": "armadura",
    "subcategory": "set_bronze",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 2,
    "description": "Guantes de el Juramento de Aden es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "gloves",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_el_juramento_de_aden"
  },
  {
    "id": "aden_botas_de_el_juramento_de_aden",
    "name": "Botas de el Juramento de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bronze_boots",
    "category": "armadura",
    "subcategory": "set_bronze",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 2,
    "description": "Botas de el Juramento de Aden es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 8,
    "slot": "boots",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_juramento_de_aden"
  },
  {
    "id": "aden_yelmo_de_la_escama_de_brasa",
    "name": "Yelmo de la Escama de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "scale_helm",
    "category": "armadura",
    "subcategory": "set_scale",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 3,
    "description": "Yelmo de la Escama de Brasa es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "helmet",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_la_escama_de_brasa"
  },
  {
    "id": "aden_coraza_de_la_escama_de_brasa",
    "name": "Coraza de la Escama de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "scale_armor",
    "category": "armadura",
    "subcategory": "set_scale",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 3,
    "description": "Coraza de la Escama de Brasa es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "armor",
    "bonuses": {
      "pDef": 7,
      "maxHp": 20
    },
    "setId": "aden_la_escama_de_brasa"
  },
  {
    "id": "aden_grebas_de_la_escama_de_brasa",
    "name": "Grebas de la Escama de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "scale_pants",
    "category": "armadura",
    "subcategory": "set_scale",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 3,
    "description": "Grebas de la Escama de Brasa es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "pants",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_la_escama_de_brasa"
  },
  {
    "id": "aden_guantes_de_la_escama_de_brasa",
    "name": "Guantes de la Escama de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "scale_gloves",
    "category": "armadura",
    "subcategory": "set_scale",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 3,
    "description": "Guantes de la Escama de Brasa es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "gloves",
    "bonuses": {
      "pDef": 4
    },
    "setId": "aden_la_escama_de_brasa"
  },
  {
    "id": "aden_botas_de_la_escama_de_brasa",
    "name": "Botas de la Escama de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "scale_boots",
    "category": "armadura",
    "subcategory": "set_scale",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 3,
    "description": "Botas de la Escama de Brasa es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 14,
    "slot": "boots",
    "bonuses": {
      "pDef": 4
    },
    "setId": "aden_la_escama_de_brasa"
  },
  {
    "id": "aden_yelmo_de_el_bastion_de_ceniza",
    "name": "Yelmo de el Bastión de Ceniza",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "brass_helm",
    "category": "armadura",
    "subcategory": "set_brass",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 4,
    "description": "Yelmo de el Bastión de Ceniza es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "helmet",
    "bonuses": {
      "pDef": 7
    },
    "setId": "aden_el_bastion_de_ceniza"
  },
  {
    "id": "aden_coraza_de_el_bastion_de_ceniza",
    "name": "Coraza de el Bastión de Ceniza",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "brass_armor",
    "category": "armadura",
    "subcategory": "set_brass",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 4,
    "description": "Coraza de el Bastión de Ceniza es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "armor",
    "bonuses": {
      "pDef": 10,
      "maxHp": 25
    },
    "setId": "aden_el_bastion_de_ceniza"
  },
  {
    "id": "aden_grebas_de_el_bastion_de_ceniza",
    "name": "Grebas de el Bastión de Ceniza",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "brass_pants",
    "category": "armadura",
    "subcategory": "set_brass",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 4,
    "description": "Grebas de el Bastión de Ceniza es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "pants",
    "bonuses": {
      "pDef": 7
    },
    "setId": "aden_el_bastion_de_ceniza"
  },
  {
    "id": "aden_guantes_de_el_bastion_de_ceniza",
    "name": "Guantes de el Bastión de Ceniza",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "brass_gloves",
    "category": "armadura",
    "subcategory": "set_brass",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 4,
    "description": "Guantes de el Bastión de Ceniza es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "gloves",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_bastion_de_ceniza"
  },
  {
    "id": "aden_botas_de_el_bastion_de_ceniza",
    "name": "Botas de el Bastión de Ceniza",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "brass_boots",
    "category": "armadura",
    "subcategory": "set_brass",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 4,
    "description": "Botas de el Bastión de Ceniza es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "boots",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_bastion_de_ceniza"
  },
  {
    "id": "aden_yelmo_de_la_vigilia_de_hierro",
    "name": "Yelmo de la Vigilia de Hierro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "plate_helm",
    "category": "armadura",
    "subcategory": "set_plate",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 5,
    "description": "Yelmo de la Vigilia de Hierro es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "helmet",
    "bonuses": {
      "pDef": 9
    },
    "setId": "aden_la_vigilia_de_hierro"
  },
  {
    "id": "aden_coraza_de_la_vigilia_de_hierro",
    "name": "Coraza de la Vigilia de Hierro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "plate_armor",
    "category": "armadura",
    "subcategory": "set_plate",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 5,
    "description": "Coraza de la Vigilia de Hierro es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "armor",
    "bonuses": {
      "pDef": 13,
      "maxHp": 30
    },
    "setId": "aden_la_vigilia_de_hierro"
  },
  {
    "id": "aden_grebas_de_la_vigilia_de_hierro",
    "name": "Grebas de la Vigilia de Hierro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "plate_pants",
    "category": "armadura",
    "subcategory": "set_plate",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 5,
    "description": "Grebas de la Vigilia de Hierro es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "pants",
    "bonuses": {
      "pDef": 9
    },
    "setId": "aden_la_vigilia_de_hierro"
  },
  {
    "id": "aden_guantes_de_la_vigilia_de_hierro",
    "name": "Guantes de la Vigilia de Hierro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "plate_gloves",
    "category": "armadura",
    "subcategory": "set_plate",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 5,
    "description": "Guantes de la Vigilia de Hierro es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "gloves",
    "bonuses": {
      "pDef": 6
    },
    "setId": "aden_la_vigilia_de_hierro"
  },
  {
    "id": "aden_botas_de_la_vigilia_de_hierro",
    "name": "Botas de la Vigilia de Hierro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "plate_boots",
    "category": "armadura",
    "subcategory": "set_plate",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 5,
    "description": "Botas de la Vigilia de Hierro es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 27,
    "slot": "boots",
    "bonuses": {
      "pDef": 7
    },
    "setId": "aden_la_vigilia_de_hierro"
  },
  {
    "id": "aden_yelmo_de_la_sangre_del_wyrm",
    "name": "Yelmo de la Sangre del Wyrm",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_helm",
    "category": "armadura",
    "subcategory": "set_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 6,
    "description": "Yelmo de la Sangre del Wyrm es una pieza de tier 6; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "helmet",
    "bonuses": {
      "pDef": 11
    },
    "setId": "aden_la_sangre_del_wyrm"
  },
  {
    "id": "aden_coraza_de_la_sangre_del_wyrm",
    "name": "Coraza de la Sangre del Wyrm",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_armor",
    "category": "armadura",
    "subcategory": "set_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 6,
    "description": "Coraza de la Sangre del Wyrm es una pieza de tier 6; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "armor",
    "bonuses": {
      "pDef": 17,
      "maxHp": 35
    },
    "setId": "aden_la_sangre_del_wyrm"
  },
  {
    "id": "aden_grebas_de_la_sangre_del_wyrm",
    "name": "Grebas de la Sangre del Wyrm",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_pants",
    "category": "armadura",
    "subcategory": "set_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 6,
    "description": "Grebas de la Sangre del Wyrm es una pieza de tier 6; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "pants",
    "bonuses": {
      "pDef": 11
    },
    "setId": "aden_la_sangre_del_wyrm"
  },
  {
    "id": "aden_guantes_de_la_sangre_del_wyrm",
    "name": "Guantes de la Sangre del Wyrm",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_gloves",
    "category": "armadura",
    "subcategory": "set_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 6,
    "description": "Guantes de la Sangre del Wyrm es una pieza de tier 6; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "gloves",
    "bonuses": {
      "pDef": 8
    },
    "setId": "aden_la_sangre_del_wyrm"
  },
  {
    "id": "aden_botas_de_la_sangre_del_wyrm",
    "name": "Botas de la Sangre del Wyrm",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "dragon_boots",
    "category": "armadura",
    "subcategory": "set_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 6,
    "description": "Botas de la Sangre del Wyrm es una pieza de tier 6; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 34,
    "slot": "boots",
    "bonuses": {
      "pDef": 9
    },
    "setId": "aden_la_sangre_del_wyrm"
  },
  {
    "id": "aden_yelmo_de_la_sombra_de_nihil",
    "name": "Yelmo de la Sombra de Nihil",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "black_dragon_helm",
    "category": "armadura",
    "subcategory": "set_black_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 7,
    "description": "Yelmo de la Sombra de Nihil es una pieza de tier 7; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "helmet",
    "bonuses": {
      "pDef": 14
    },
    "setId": "aden_la_sombra_de_nihil"
  },
  {
    "id": "aden_coraza_de_la_sombra_de_nihil",
    "name": "Coraza de la Sombra de Nihil",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "black_dragon_armor",
    "category": "armadura",
    "subcategory": "set_black_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 7,
    "description": "Coraza de la Sombra de Nihil es una pieza de tier 7; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "armor",
    "bonuses": {
      "pDef": 19,
      "maxHp": 40
    },
    "setId": "aden_la_sombra_de_nihil"
  },
  {
    "id": "aden_grebas_de_la_sombra_de_nihil",
    "name": "Grebas de la Sombra de Nihil",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "black_dragon_pants",
    "category": "armadura",
    "subcategory": "set_black_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 7,
    "description": "Grebas de la Sombra de Nihil es una pieza de tier 7; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "pants",
    "bonuses": {
      "pDef": 14
    },
    "setId": "aden_la_sombra_de_nihil"
  },
  {
    "id": "aden_guantes_de_la_sombra_de_nihil",
    "name": "Guantes de la Sombra de Nihil",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "black_dragon_gloves",
    "category": "armadura",
    "subcategory": "set_black_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 7,
    "description": "Guantes de la Sombra de Nihil es una pieza de tier 7; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "gloves",
    "bonuses": {
      "pDef": 10
    },
    "setId": "aden_la_sombra_de_nihil"
  },
  {
    "id": "aden_botas_de_la_sombra_de_nihil",
    "name": "Botas de la Sombra de Nihil",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "black_dragon_boots",
    "category": "armadura",
    "subcategory": "set_black_dragon",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 7,
    "description": "Botas de la Sombra de Nihil es una pieza de tier 7; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "boots",
    "bonuses": {
      "pDef": 11
    },
    "setId": "aden_la_sombra_de_nihil"
  },
  {
    "id": "aden_yelmo_de_el_acolito_del_velo",
    "name": "Yelmo de el Acólito del Velo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pad_helm",
    "category": "armadura",
    "subcategory": "set_pad",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 1,
    "description": "Yelmo de el Acólito del Velo es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "helmet",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_el_acolito_del_velo"
  },
  {
    "id": "aden_coraza_de_el_acolito_del_velo",
    "name": "Coraza de el Acólito del Velo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pad_armor",
    "category": "armadura",
    "subcategory": "set_pad",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 1,
    "description": "Coraza de el Acólito del Velo es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "armor",
    "bonuses": {
      "pDef": 2,
      "maxHp": 10
    },
    "setId": "aden_el_acolito_del_velo"
  },
  {
    "id": "aden_grebas_de_el_acolito_del_velo",
    "name": "Grebas de el Acólito del Velo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pad_pants",
    "category": "armadura",
    "subcategory": "set_pad",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 1,
    "description": "Grebas de el Acólito del Velo es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "pants",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_el_acolito_del_velo"
  },
  {
    "id": "aden_guantes_de_el_acolito_del_velo",
    "name": "Guantes de el Acólito del Velo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pad_gloves",
    "category": "armadura",
    "subcategory": "set_pad",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 1,
    "description": "Guantes de el Acólito del Velo es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "gloves",
    "bonuses": {
      "pDef": 1
    },
    "setId": "aden_el_acolito_del_velo"
  },
  {
    "id": "aden_botas_de_el_acolito_del_velo",
    "name": "Botas de el Acólito del Velo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pad_boots",
    "category": "armadura",
    "subcategory": "set_pad",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 1,
    "description": "Botas de el Acólito del Velo es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "boots",
    "bonuses": {
      "pDef": 1
    },
    "setId": "aden_el_acolito_del_velo"
  },
  {
    "id": "aden_yelmo_de_el_oraculo_de_hueso",
    "name": "Yelmo de el Oráculo de Hueso",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bone_helm",
    "category": "armadura",
    "subcategory": "set_bone",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Yelmo de el Oráculo de Hueso es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "helmet",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_oraculo_de_hueso"
  },
  {
    "id": "aden_coraza_de_el_oraculo_de_hueso",
    "name": "Coraza de el Oráculo de Hueso",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bone_armor",
    "category": "armadura",
    "subcategory": "set_bone",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Coraza de el Oráculo de Hueso es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "armor",
    "bonuses": {
      "pDef": 5,
      "maxHp": 15
    },
    "setId": "aden_el_oraculo_de_hueso"
  },
  {
    "id": "aden_grebas_de_el_oraculo_de_hueso",
    "name": "Grebas de el Oráculo de Hueso",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bone_pants",
    "category": "armadura",
    "subcategory": "set_bone",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Grebas de el Oráculo de Hueso es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "pants",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_oraculo_de_hueso"
  },
  {
    "id": "aden_guantes_de_el_oraculo_de_hueso",
    "name": "Guantes de el Oráculo de Hueso",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bone_gloves",
    "category": "armadura",
    "subcategory": "set_bone",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Guantes de el Oráculo de Hueso es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "gloves",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_el_oraculo_de_hueso"
  },
  {
    "id": "aden_botas_de_el_oraculo_de_hueso",
    "name": "Botas de el Oráculo de Hueso",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "bone_boots",
    "category": "armadura",
    "subcategory": "set_bone",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Botas de el Oráculo de Hueso es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "boots",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_oraculo_de_hueso"
  },
  {
    "id": "aden_yelmo_de_el_enigma_de_umbra",
    "name": "Yelmo de el Enigma de Umbra",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sphinx_helm",
    "category": "armadura",
    "subcategory": "set_sphinx",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 3,
    "description": "Yelmo de el Enigma de Umbra es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "helmet",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_enigma_de_umbra"
  },
  {
    "id": "aden_coraza_de_el_enigma_de_umbra",
    "name": "Coraza de el Enigma de Umbra",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sphinx_armor",
    "category": "armadura",
    "subcategory": "set_sphinx",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 3,
    "description": "Coraza de el Enigma de Umbra es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "armor",
    "bonuses": {
      "pDef": 8,
      "maxHp": 20
    },
    "setId": "aden_el_enigma_de_umbra"
  },
  {
    "id": "aden_grebas_de_el_enigma_de_umbra",
    "name": "Grebas de el Enigma de Umbra",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sphinx_pants",
    "category": "armadura",
    "subcategory": "set_sphinx",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 3,
    "description": "Grebas de el Enigma de Umbra es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "pants",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_enigma_de_umbra"
  },
  {
    "id": "aden_guantes_de_el_enigma_de_umbra",
    "name": "Guantes de el Enigma de Umbra",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sphinx_gloves",
    "category": "armadura",
    "subcategory": "set_sphinx",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 3,
    "description": "Guantes de el Enigma de Umbra es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "gloves",
    "bonuses": {
      "pDef": 4
    },
    "setId": "aden_el_enigma_de_umbra"
  },
  {
    "id": "aden_botas_de_el_enigma_de_umbra",
    "name": "Botas de el Enigma de Umbra",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "sphinx_boots",
    "category": "armadura",
    "subcategory": "set_sphinx",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 3,
    "description": "Botas de el Enigma de Umbra es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "boots",
    "bonuses": {
      "pDef": 4
    },
    "setId": "aden_el_enigma_de_umbra"
  },
  {
    "id": "aden_yelmo_de_el_arconte_de_aden",
    "name": "Yelmo de el Arconte de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_helm",
    "category": "armadura",
    "subcategory": "set_legendary",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 4,
    "description": "Yelmo de el Arconte de Aden es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "helmet",
    "bonuses": {
      "pDef": 8
    },
    "setId": "aden_el_arconte_de_aden"
  },
  {
    "id": "aden_coraza_de_el_arconte_de_aden",
    "name": "Coraza de el Arconte de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_armor",
    "category": "armadura",
    "subcategory": "set_legendary",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 4,
    "description": "Coraza de el Arconte de Aden es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "armor",
    "bonuses": {
      "pDef": 12,
      "maxHp": 25
    },
    "setId": "aden_el_arconte_de_aden"
  },
  {
    "id": "aden_grebas_de_el_arconte_de_aden",
    "name": "Grebas de el Arconte de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_pants",
    "category": "armadura",
    "subcategory": "set_legendary",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 4,
    "description": "Grebas de el Arconte de Aden es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "pants",
    "bonuses": {
      "pDef": 8
    },
    "setId": "aden_el_arconte_de_aden"
  },
  {
    "id": "aden_guantes_de_el_arconte_de_aden",
    "name": "Guantes de el Arconte de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_gloves",
    "category": "armadura",
    "subcategory": "set_legendary",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 4,
    "description": "Guantes de el Arconte de Aden es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "gloves",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_arconte_de_aden"
  },
  {
    "id": "aden_botas_de_el_arconte_de_aden",
    "name": "Botas de el Arconte de Aden",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "legendary_boots",
    "category": "armadura",
    "subcategory": "set_legendary",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 4,
    "description": "Botas de el Arconte de Aden es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "boots",
    "bonuses": {
      "pDef": 6
    },
    "setId": "aden_el_arconte_de_aden"
  },
  {
    "id": "aden_yelmo_de_el_alma_primordial",
    "name": "Yelmo de el Alma Primordial",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "grand_soul_helm",
    "category": "armadura",
    "subcategory": "set_grand_soul",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 5,
    "description": "Yelmo de el Alma Primordial es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "helmet",
    "bonuses": {
      "pDef": 11
    },
    "setId": "aden_el_alma_primordial"
  },
  {
    "id": "aden_coraza_de_el_alma_primordial",
    "name": "Coraza de el Alma Primordial",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "grand_soul_armor",
    "category": "armadura",
    "subcategory": "set_grand_soul",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 5,
    "description": "Coraza de el Alma Primordial es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "armor",
    "bonuses": {
      "pDef": 16,
      "maxHp": 30
    },
    "setId": "aden_el_alma_primordial"
  },
  {
    "id": "aden_grebas_de_el_alma_primordial",
    "name": "Grebas de el Alma Primordial",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "grand_soul_pants",
    "category": "armadura",
    "subcategory": "set_grand_soul",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 5,
    "description": "Grebas de el Alma Primordial es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "pants",
    "bonuses": {
      "pDef": 11
    },
    "setId": "aden_el_alma_primordial"
  },
  {
    "id": "aden_guantes_de_el_alma_primordial",
    "name": "Guantes de el Alma Primordial",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "grand_soul_gloves",
    "category": "armadura",
    "subcategory": "set_grand_soul",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 5,
    "description": "Guantes de el Alma Primordial es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "gloves",
    "bonuses": {
      "pDef": 8
    },
    "setId": "aden_el_alma_primordial"
  },
  {
    "id": "aden_botas_de_el_alma_primordial",
    "name": "Botas de el Alma Primordial",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "grand_soul_boots",
    "category": "armadura",
    "subcategory": "set_grand_soul",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 5,
    "description": "Botas de el Alma Primordial es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "boots",
    "bonuses": {
      "pDef": 9
    },
    "setId": "aden_el_alma_primordial"
  },
  {
    "id": "aden_yelmo_de_la_raiz_errante",
    "name": "Yelmo de la Raíz Errante",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "vine_helm",
    "category": "armadura",
    "subcategory": "set_vine",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 1,
    "description": "Yelmo de la Raíz Errante es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "helmet",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_raiz_errante"
  },
  {
    "id": "aden_coraza_de_la_raiz_errante",
    "name": "Coraza de la Raíz Errante",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "vine_armor",
    "category": "armadura",
    "subcategory": "set_vine",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 1,
    "description": "Coraza de la Raíz Errante es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "armor",
    "bonuses": {
      "pDef": 2,
      "maxHp": 10
    },
    "setId": "aden_la_raiz_errante"
  },
  {
    "id": "aden_grebas_de_la_raiz_errante",
    "name": "Grebas de la Raíz Errante",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "vine_pants",
    "category": "armadura",
    "subcategory": "set_vine",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 1,
    "description": "Grebas de la Raíz Errante es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "pants",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_raiz_errante"
  },
  {
    "id": "aden_guantes_de_la_raiz_errante",
    "name": "Guantes de la Raíz Errante",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "vine_gloves",
    "category": "armadura",
    "subcategory": "set_vine",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 1,
    "description": "Guantes de la Raíz Errante es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "gloves",
    "bonuses": {
      "pDef": 1
    },
    "setId": "aden_la_raiz_errante"
  },
  {
    "id": "aden_botas_de_la_raiz_errante",
    "name": "Botas de la Raíz Errante",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "vine_boots",
    "category": "armadura",
    "subcategory": "set_vine",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 1,
    "description": "Botas de la Raíz Errante es una pieza de tier 1; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "boots",
    "bonuses": {
      "pDef": 1
    },
    "setId": "aden_la_raiz_errante"
  },
  {
    "id": "aden_yelmo_de_la_bruma_silvana",
    "name": "Yelmo de la Bruma Silvana",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "silk_helm",
    "category": "armadura",
    "subcategory": "set_silk",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 2,
    "description": "Yelmo de la Bruma Silvana es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "helmet",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_la_bruma_silvana"
  },
  {
    "id": "aden_coraza_de_la_bruma_silvana",
    "name": "Coraza de la Bruma Silvana",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "silk_armor",
    "category": "armadura",
    "subcategory": "set_silk",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 2,
    "description": "Coraza de la Bruma Silvana es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "armor",
    "bonuses": {
      "pDef": 5,
      "maxHp": 15
    },
    "setId": "aden_la_bruma_silvana"
  },
  {
    "id": "aden_grebas_de_la_bruma_silvana",
    "name": "Grebas de la Bruma Silvana",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "silk_pants",
    "category": "armadura",
    "subcategory": "set_silk",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 2,
    "description": "Grebas de la Bruma Silvana es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "pants",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_la_bruma_silvana"
  },
  {
    "id": "aden_guantes_de_la_bruma_silvana",
    "name": "Guantes de la Bruma Silvana",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "silk_gloves",
    "category": "armadura",
    "subcategory": "set_silk",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 2,
    "description": "Guantes de la Bruma Silvana es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "gloves",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_bruma_silvana"
  },
  {
    "id": "aden_botas_de_la_bruma_silvana",
    "name": "Botas de la Bruma Silvana",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "silk_boots",
    "category": "armadura",
    "subcategory": "set_silk",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 2,
    "description": "Botas de la Bruma Silvana es una pieza de tier 2; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 11,
    "slot": "boots",
    "bonuses": {
      "pDef": 2
    },
    "setId": "aden_la_bruma_silvana"
  },
  {
    "id": "aden_yelmo_de_el_vendaval_gris",
    "name": "Yelmo de el Vendaval Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wind_helm",
    "category": "armadura",
    "subcategory": "set_wind",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 3,
    "description": "Yelmo de el Vendaval Gris es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "helmet",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_vendaval_gris"
  },
  {
    "id": "aden_coraza_de_el_vendaval_gris",
    "name": "Coraza de el Vendaval Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wind_armor",
    "category": "armadura",
    "subcategory": "set_wind",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 3,
    "description": "Coraza de el Vendaval Gris es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "armor",
    "bonuses": {
      "pDef": 7,
      "maxHp": 20
    },
    "setId": "aden_el_vendaval_gris"
  },
  {
    "id": "aden_grebas_de_el_vendaval_gris",
    "name": "Grebas de el Vendaval Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wind_pants",
    "category": "armadura",
    "subcategory": "set_wind",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 3,
    "description": "Grebas de el Vendaval Gris es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "pants",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_vendaval_gris"
  },
  {
    "id": "aden_guantes_de_el_vendaval_gris",
    "name": "Guantes de el Vendaval Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wind_gloves",
    "category": "armadura",
    "subcategory": "set_wind",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 3,
    "description": "Guantes de el Vendaval Gris es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "gloves",
    "bonuses": {
      "pDef": 3
    },
    "setId": "aden_el_vendaval_gris"
  },
  {
    "id": "aden_botas_de_el_vendaval_gris",
    "name": "Botas de el Vendaval Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wind_boots",
    "category": "armadura",
    "subcategory": "set_wind",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 3,
    "description": "Botas de el Vendaval Gris es una pieza de tier 3; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 21,
    "slot": "boots",
    "bonuses": {
      "pDef": 4
    },
    "setId": "aden_el_vendaval_gris"
  },
  {
    "id": "aden_yelmo_de_el_eco_ancestral",
    "name": "Yelmo de el Eco Ancestral",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spirit_helm",
    "category": "armadura",
    "subcategory": "set_spirit",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 4,
    "description": "Yelmo de el Eco Ancestral es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "helmet",
    "bonuses": {
      "pDef": 7
    },
    "setId": "aden_el_eco_ancestral"
  },
  {
    "id": "aden_coraza_de_el_eco_ancestral",
    "name": "Coraza de el Eco Ancestral",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spirit_armor",
    "category": "armadura",
    "subcategory": "set_spirit",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 4,
    "description": "Coraza de el Eco Ancestral es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "armor",
    "bonuses": {
      "pDef": 10,
      "maxHp": 25
    },
    "setId": "aden_el_eco_ancestral"
  },
  {
    "id": "aden_grebas_de_el_eco_ancestral",
    "name": "Grebas de el Eco Ancestral",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spirit_pants",
    "category": "armadura",
    "subcategory": "set_spirit",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 4,
    "description": "Grebas de el Eco Ancestral es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "pants",
    "bonuses": {
      "pDef": 7
    },
    "setId": "aden_el_eco_ancestral"
  },
  {
    "id": "aden_guantes_de_el_eco_ancestral",
    "name": "Guantes de el Eco Ancestral",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spirit_gloves",
    "category": "armadura",
    "subcategory": "set_spirit",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 4,
    "description": "Guantes de el Eco Ancestral es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "gloves",
    "bonuses": {
      "pDef": 5
    },
    "setId": "aden_el_eco_ancestral"
  },
  {
    "id": "aden_botas_de_el_eco_ancestral",
    "name": "Botas de el Eco Ancestral",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "spirit_boots",
    "category": "armadura",
    "subcategory": "set_spirit",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 4,
    "description": "Botas de el Eco Ancestral es una pieza de tier 4; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 30,
    "slot": "boots",
    "bonuses": {
      "pDef": 6
    },
    "setId": "aden_el_eco_ancestral"
  },
  {
    "id": "aden_yelmo_de_el_juramento_verde",
    "name": "Yelmo de el Juramento Verde",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "guardian_helm",
    "category": "armadura",
    "subcategory": "set_guardian",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 5,
    "description": "Yelmo de el Juramento Verde es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "helmet",
    "bonuses": {
      "pDef": 10
    },
    "setId": "aden_el_juramento_verde"
  },
  {
    "id": "aden_coraza_de_el_juramento_verde",
    "name": "Coraza de el Juramento Verde",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "guardian_armor",
    "category": "armadura",
    "subcategory": "set_guardian",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 5,
    "description": "Coraza de el Juramento Verde es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "armor",
    "bonuses": {
      "pDef": 15,
      "maxHp": 30
    },
    "setId": "aden_el_juramento_verde"
  },
  {
    "id": "aden_grebas_de_el_juramento_verde",
    "name": "Grebas de el Juramento Verde",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "guardian_pants",
    "category": "armadura",
    "subcategory": "set_guardian",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 5,
    "description": "Grebas de el Juramento Verde es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "pants",
    "bonuses": {
      "pDef": 10
    },
    "setId": "aden_el_juramento_verde"
  },
  {
    "id": "aden_guantes_de_el_juramento_verde",
    "name": "Guantes de el Juramento Verde",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "guardian_gloves",
    "category": "armadura",
    "subcategory": "set_guardian",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 5,
    "description": "Guantes de el Juramento Verde es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "gloves",
    "bonuses": {
      "pDef": 7
    },
    "setId": "aden_el_juramento_verde"
  },
  {
    "id": "aden_botas_de_el_juramento_verde",
    "name": "Botas de el Juramento Verde",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "guardian_boots",
    "category": "armadura",
    "subcategory": "set_guardian",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 5,
    "description": "Botas de el Juramento Verde es una pieza de tier 5; su defensa forma parte del total equilibrado del conjunto.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "boots",
    "bonuses": {
      "pDef": 8
    },
    "setId": "aden_el_juramento_verde"
  },
  {
    "id": "aden_alas_de_la_vigilia",
    "name": "Alas de la Vigilia",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wings_of_elf",
    "category": "alas",
    "subcategory": "alas_nivel1",
    "classes": [
      "ranger",
      "rogue"
    ],
    "hands": null,
    "tier": 1,
    "description": "Alas rituales de nivel 40: +3% de ataque y absorción de daño, +5% de movimiento; no permiten atravesar los límites del mapa.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "wings",
    "bonuses": {
      "pAtk": 4,
      "pDef": 4,
      "maxHp": 20
    }
  },
  {
    "id": "aden_alas_del_firmamento_roto",
    "name": "Alas del Firmamento Roto",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wings_of_heaven",
    "category": "alas",
    "subcategory": "alas_nivel1",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Alas rituales de nivel 40: +3% de ataque y absorción de daño, +5% de movimiento; no permiten atravesar los límites del mapa.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "wings",
    "bonuses": {
      "pDef": 4,
      "maxMp": 30
    }
  },
  {
    "id": "aden_alas_del_exiliado",
    "name": "Alas del Exiliado",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "wings_of_satan",
    "category": "alas",
    "subcategory": "alas_nivel1",
    "classes": [
      "knight",
      "barbarian"
    ],
    "hands": null,
    "tier": 3,
    "description": "Alas rituales de nivel 40: +3% de ataque y absorción de daño, +5% de movimiento; no permiten atravesar los límites del mapa.",
    "allowedQualities": [
      "normal",
      "magic",
      "excellent"
    ],
    "requiredLevel": 40,
    "slot": "wings",
    "bonuses": {
      "pAtk": 4,
      "pDef": 4,
      "maxHp": 20
    }
  },
  {
    "id": "aden_anillo_de_escarcha_silente",
    "name": "Anillo de Escarcha Silente",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "ring_of_ice",
    "category": "anillo",
    "subcategory": "anillo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Reduce 20% del daño de hielo y la duración de raíces gélidas.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "ring",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_sello_del_veneno_antiguo",
    "name": "Sello del Veneno Antiguo",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "ring_of_poison",
    "category": "anillo",
    "subcategory": "anillo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 2,
    "description": "Reduce 20% del daño de veneno.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "ring",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_sortija_de_brasa",
    "name": "Sortija de Brasa",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "ring_of_fire",
    "category": "anillo",
    "subcategory": "anillo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 3,
    "description": "Reduce 20% del daño de fuego.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "ring",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_anillo_del_vendaval",
    "name": "Anillo del Vendaval",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "ring_of_wind",
    "category": "anillo",
    "subcategory": "anillo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 4,
    "description": "Reduce 20% del daño de viento y relámpagos.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "ring",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_sello_del_eter",
    "name": "Sello del Éter",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "ring_of_magic",
    "category": "anillo",
    "subcategory": "anillo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 5,
    "description": "Aumenta el maná máximo en 20.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "ring",
    "bonuses": {
      "maxMp": 20
    }
  },
  {
    "id": "aden_sortija_de_la_otra_faz",
    "name": "Sortija de la Otra Faz",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "transformation_ring",
    "category": "anillo",
    "subcategory": "anillo",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 6,
    "description": "Reliquia de metamorfosis: cambia la apariencia del portador a un espectro mientras está equipada.",
    "allowedQualities": [
      "normal"
    ],
    "requiredLevel": 1,
    "slot": "ring",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_colgante_del_trueno_gris",
    "name": "Colgante del Trueno Gris",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pendant_of_lightning",
    "category": "pendant",
    "subcategory": "pendant",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Reduce 20% del daño de relámpagos.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "accessory",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_medallon_de_la_pira",
    "name": "Medallón de la Pira",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pendant_of_fire",
    "category": "pendant",
    "subcategory": "pendant",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 2,
    "description": "Reduce 20% del daño de fuego.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "accessory",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_amuleto_del_invierno",
    "name": "Amuleto del Invierno",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pendant_of_ice",
    "category": "pendant",
    "subcategory": "pendant",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 3,
    "description": "Reduce 20% del daño de hielo y la duración de raíces gélidas.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "accessory",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_colgante_del_cefiro",
    "name": "Colgante del Céfiro",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pendant_of_wind",
    "category": "pendant",
    "subcategory": "pendant",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 4,
    "description": "Reduce 20% del daño de viento y relámpagos.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "accessory",
    "bonuses": {
      "pDef": 2
    }
  },
  {
    "id": "aden_medallon_de_la_voluntad",
    "name": "Medallón de la Voluntad",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "pendant_of_ability",
    "category": "pendant",
    "subcategory": "pendant",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 5,
    "description": "Aumenta el maná máximo en 25 y su regeneración en 1% por segundo.",
    "allowedQualities": [
      "normal",
      "excellent"
    ],
    "requiredLevel": 1,
    "slot": "accessory",
    "bonuses": {
      "maxMp": 25
    }
  },
  {
    "id": "aden_gema_del_pacto",
    "name": "Gema del Pacto",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "jewel_of_bless",
    "category": "joya",
    "subcategory": "joya",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Mejora un objeto un nivel de forma segura, hasta +6.",
    "allowedQualities": [],
    "useEffect": "upgrade_safe"
  },
  {
    "id": "aden_gema_del_azar",
    "name": "Gema del Azar",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "jewel_of_soul",
    "category": "joya",
    "subcategory": "joya",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 2,
    "description": "Mejora hasta +9: 50% de éxito, o 75% con Suerte. El fallo resta un nivel; el éxito puede otorgar Suerte.",
    "allowedQualities": [],
    "useEffect": "upgrade_risky"
  },
  {
    "id": "aden_prisma_del_caos",
    "name": "Prisma del Caos",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "jewel_of_chaos",
    "category": "joya",
    "subcategory": "joya",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 3,
    "description": "Otorga una habilidad a un arma. Con un arma +6 de tier 3 o más y 500 de oro, forja un arma ritual; con un arma ritual +9 y nivel 40, forja alas.",
    "allowedQualities": [],
    "useEffect": "chaos"
  },
  {
    "id": "aden_gema_del_pulso",
    "name": "Gema del Pulso",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "jewel_of_life",
    "category": "joya",
    "subcategory": "joya",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 4,
    "description": "65% de agregar +4 de ataque o defensa, hasta +28; el fallo conserva las opciones.",
    "allowedQualities": [],
    "useEffect": "add_option"
  },
  {
    "id": "aden_lumen_custodio",
    "name": "Lumen Custodio",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "guardian_angel",
    "category": "mascota",
    "subcategory": "pet",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Compañero guardián: reduce el daño recibido un 8% y regenera 1% de vida por segundo.",
    "allowedQualities": [
      "normal"
    ],
    "requiredLevel": 1,
    "slot": "pet",
    "petEffect": "guardian"
  },
  {
    "id": "aden_diablillo_de_ceniza",
    "name": "Diablillo de Ceniza",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "imp",
    "category": "mascota",
    "subcategory": "pet",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 2,
    "description": "Compañero ofensivo: aumenta el ataque un 8%.",
    "allowedQualities": [
      "normal"
    ],
    "requiredLevel": 1,
    "slot": "pet",
    "petEffect": "imp"
  },
  {
    "id": "aden_cuerno_del_corcel_umbrio",
    "name": "Cuerno del Corcel Umbrío",
    "type": "equipment",
    "stackable": false,
    "ref_origen": "horn_of_uniria",
    "category": "mascota",
    "subcategory": "montura",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Montura espiritual: aumenta la velocidad de movimiento un 20%.",
    "allowedQualities": [
      "normal"
    ],
    "requiredLevel": 1,
    "slot": "pet",
    "petEffect": "mount"
  },
  {
    "id": "aden_fruto_carmesi",
    "name": "Fruto Carmesí",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "apple",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Fruto Carmesí se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "heal": 12,
    "useEffect": "heal"
  },
  {
    "id": "aden_frasco_de_savia_menor",
    "name": "Frasco de Savia Menor",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "small_healing_potion",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 2,
    "description": "Frasco de Savia Menor se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "heal": 35,
    "useEffect": "heal"
  },
  {
    "id": "aden_tonico_de_sangre",
    "name": "Tónico de Sangre",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "healing_potion",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 3,
    "description": "Tónico de Sangre se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "heal": 70,
    "useEffect": "heal"
  },
  {
    "id": "aden_elixir_de_vida_plena",
    "name": "Elixir de Vida Plena",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "large_healing_potion",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 4,
    "description": "Elixir de Vida Plena se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "heal": 130,
    "useEffect": "heal"
  },
  {
    "id": "aden_vial_de_niebla_menor",
    "name": "Vial de Niebla Menor",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "small_mana_potion",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 5,
    "description": "Vial de Niebla Menor se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "mana": 30,
    "useEffect": "mana"
  },
  {
    "id": "aden_tonico_de_eter",
    "name": "Tónico de Éter",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "mana_potion",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 6,
    "description": "Tónico de Éter se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "mana": 65,
    "useEffect": "mana"
  },
  {
    "id": "aden_elixir_de_mana_pleno",
    "name": "Elixir de Maná Pleno",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "large_mana_potion",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 7,
    "description": "Elixir de Maná Pleno se consume para activar su efecto de recuperación o utilidad.",
    "allowedQualities": [],
    "mana": 125,
    "useEffect": "mana"
  },
  {
    "id": "aden_sal_de_purga",
    "name": "Sal de Purga",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "antidote",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 8,
    "description": "Elimina el veneno activo. No se consume si no estás envenenado.",
    "allowedQualities": [],
    "useEffect": "antidote"
  },
  {
    "id": "aden_malta_del_caminante",
    "name": "Malta del Caminante",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "ale",
    "category": "consumible",
    "subcategory": "pocion",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 9,
    "description": "Bebida de campaña: aumenta el ataque un 5% durante 15 segundos.",
    "allowedQualities": [],
    "useEffect": "ale"
  },
  {
    "id": "aden_sello_de_retorno",
    "name": "Sello de Retorno",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "town_portal_scroll",
    "category": "consumible",
    "subcategory": "pergamino",
    "classes": [
      "knight",
      "mage",
      "barbarian",
      "rogue",
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Te devuelve al pueblo, fuera del combate; no se consume si ya estás allí.",
    "allowedQualities": [],
    "useEffect": "town_portal"
  },
  {
    "id": "aden_tomo_del_orbe_arcano",
    "name": "Tomo del Orbe Arcano",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_energy_ball",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 1,
    "description": "Tomo del Orbe Arcano enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_energy_ball"
  },
  {
    "id": "aden_tomo_de_la_esfera_ignea",
    "name": "Tomo de la Esfera Ígnea",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_fire_ball",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 2,
    "description": "Tomo de la Esfera Ígnea enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_fire_ball"
  },
  {
    "id": "aden_tomo_de_la_onda_astral",
    "name": "Tomo de la Onda Astral",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_power_wave",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 3,
    "description": "Tomo de la Onda Astral enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_power_wave"
  },
  {
    "id": "aden_tomo_del_relampago",
    "name": "Tomo del Relámpago",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_lightning",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 4,
    "description": "Tomo del Relámpago enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_lightning"
  },
  {
    "id": "aden_tomo_del_meteoro",
    "name": "Tomo del Meteoro",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_meteorite",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 5,
    "description": "Tomo del Meteoro enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_meteorite"
  },
  {
    "id": "aden_tomo_de_escarcha",
    "name": "Tomo de Escarcha",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_ice",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 6,
    "description": "Tomo de Escarcha enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_ice"
  },
  {
    "id": "aden_tomo_del_tosigo",
    "name": "Tomo del Tósigo",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_poison",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 7,
    "description": "Tomo del Tósigo enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_poison"
  },
  {
    "id": "aden_tomo_de_la_llama",
    "name": "Tomo de la Llama",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_flame",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 8,
    "description": "Tomo de la Llama enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_flame"
  },
  {
    "id": "aden_tomo_del_paso_etereo",
    "name": "Tomo del Paso Etéreo",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_teleport",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 9,
    "description": "Tomo del Paso Etéreo enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_teleport"
  },
  {
    "id": "aden_tomo_del_torbellino",
    "name": "Tomo del Torbellino",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_twister",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 10,
    "description": "Tomo del Torbellino enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_twister"
  },
  {
    "id": "aden_tomo_del_espectro_hostil",
    "name": "Tomo del Espectro Hostil",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_evil_spirit",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 11,
    "description": "Tomo del Espectro Hostil enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_evil_spirit"
  },
  {
    "id": "aden_tomo_del_fuego_abisal",
    "name": "Tomo del Fuego Abisal",
    "type": "consumable",
    "stackable": true,
    "ref_origen": "scroll_of_hellfire",
    "category": "consumible",
    "subcategory": "pergamino_hechizo",
    "classes": [
      "mage"
    ],
    "hands": null,
    "tier": 12,
    "description": "Tomo del Fuego Abisal enseña de forma permanente el hechizo asociado a este tomo.",
    "allowedQualities": [],
    "useEffect": "learn_skill",
    "learnSkill": "tome_hellfire"
  },
  {
    "id": "aden_astiles_del_bosque_gris",
    "name": "Astiles del Bosque Gris",
    "type": "material",
    "stackable": true,
    "ref_origen": "arrows",
    "category": "municion",
    "subcategory": "flechas",
    "classes": [
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Astiles del Bosque Gris es munición apilable preparada para armas de proyectiles.",
    "allowedQualities": [],
    "ammo": "arrow"
  },
  {
    "id": "aden_virotes_de_la_vigilia",
    "name": "Virotes de la Vigilia",
    "type": "material",
    "stackable": true,
    "ref_origen": "bolts",
    "category": "municion",
    "subcategory": "virotes",
    "classes": [
      "ranger"
    ],
    "hands": null,
    "tier": 1,
    "description": "Virotes de la Vigilia es munición apilable preparada para armas de proyectiles.",
    "allowedQualities": [],
    "ammo": "bolt"
  }
];

export const CATALOG_ITEMS: Record<string, CatalogItem> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);
