import { VEIL_QUESTS } from './veil.js';
import { MONASTERY_QUESTS } from './monastery.js';
import { QUEST_ORDER } from './act1.js';
export { QUEST_ORDER, CAMPAIGN_COMPLETE } from './act1.js';
export { nextQuestId } from './chapters.js';
export interface Quest {
  returnNpcId?: string;
  autoAdvance?: boolean;
  objective?: "kill" | "visit" | "interact" | "dungeon";
  targetId?: string;
  mapId?: string;
  hint?: string;
  rewardByClass?: Record<string, string>;
  rewardItemQty?: number;
  id: string;
  title: string;
  intro: string;
  done: string;
  mobTemplateId: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
  /** Etapa 21: pieza de equipo que entrega la misión al completarla (opcional). */
  rewardItemId?: string;
}

// Etapa 11: la cadena de misiones es la brújula del jugador — cada quest lo empuja
// una zona más al norte, del Bosque al Trono. El enemigo de cada quest vive en la
// zona correspondiente, así el marcador del minimapa siempre apunta "más profundo".
export const QUESTS: Record<string, Quest> = {
  q1: {
    id: "q1",
    title: "Los primeros huesos",
    intro: "Los viajeros de Bram llegaron heridos y sin su carga. Varek intentó volver por los remedios, pero los exploradores óseos dominan la entrada de Umbra. Derrotá a 6 para abrir paso. Elenya tiene pacientes esperando; hoy necesitamos algo más que otra espada de paso.",
    done: "Varek ya puede acercarse a la ruta. Este chaleco era de la reserva de la guardia: llevátelo. Bram insiste en algo extraño: los muertos dejaron las monedas y fueron detrás de una piedra que transportaba su caravana.",
    mobTemplateId: "skeleton_minion",
    amount: 6,
    rewardExp: 60,
    rewardGold: 25,
    rewardItemId: "leather_vest",
  },
  q2: {
    id: "q2",
    title: "La marea del bosque",
    intro: "La piedra pertenece al santuario; sus marcas también aparecen en las armas de los Guerreros Musgosos. Dorne las reconoció: eran guardianes del reino, antes de la caída de Nihil. Derrotá a 5 para debilitar su presencia en Umbra. Necesitamos averiguar qué siguen custodiando.",
    done: "La vieja guardia sigue obedeciendo una orden, incluso muerta. Dorne preparó esta arma para tu oficio: viene mejorada a +2. Equipala desde el inventario antes de volver al Bosque; lo que nos espera allí no es otro soldado.",
    mobTemplateId: "skeleton_warrior",
    amount: 5,
    rewardExp: 140,
    rewardGold: 70,
    rewardItemId: "iron_sword",
  },
  q3: {
    id: "q3",
    title: "Bajo las Ruinas",
    intro: "Los Guardianes de la Cripta todavía defienden las Ruinas como en vida. Varek reconoce su formación: protegen la entrada de algo. Derrotá a 6 para abrir paso. Mientras tanto, voy a buscar el símbolo de las dos llamas en los registros del reino.",
    done: "Encontré los nombres: Memoria y Fragua. Una llama conserva a los muertos; la otra les da forma. Tomá el Amuleto del Cazador: aumenta tu ataque y tu reserva de maná. El Centinela protege la entrada al lugar donde se unen.",
    mobTemplateId: "crypt_warrior",
    amount: 6,
    rewardExp: 320,
    rewardGold: 150,
    rewardItemId: "hunter_charm",
  },
  q4: {
    id: "q4",
    title: "El Centinela de Nihil",
    intro: "El Centinela de Nihil custodia el acceso a la Cripta. Los registros dicen que allí se conservaban los juramentos de los antiguos guardianes. Nihil fue a buscar algo más. Derrotá al Centinela para que podamos investigar qué hizo con las llamas.",
    done: "El Centinela cayó. Tomá esta Coraza de la Cripta de nuestras reservas: refuerza defensa y vida. Bajo las Ruinas están las dos llamas que buscábamos. Si cortamos su vínculo, podremos entender por qué el ejército vuelve a levantarse.",
    mobTemplateId: "crypt_sentinel",
    amount: 1,
    rewardExp: 600,
    rewardGold: 300,
    rewardItemId: "bone_blade",
  },
  q5: {
    id: "q5",
    title: "El Yermo Ardiente",
    intro: "Las llamas pueden volver a encenderse mientras Nihil mantenga su orden desde el Trono. En el Yermo, sus Verdugos Ardientes sostienen la patrulla que nos separa de él. Derrotá a 8. No es una prueba de valor: necesitamos espacio para preparar el último avance.",
    done: "La patrulla recibió el golpe que necesitábamos. Esta Guarda de Ceniza refuerza tu defensa y tu vida para lo que viene. Elenya pide que visites el santuario antes de seguir: pertenecía a los mismos guardianes, antes de que Nihil torciera su juramento.",
    mobTemplateId: "ash_warrior",
    amount: 8,
    rewardExp: 900,
    rewardGold: 450,
    rewardItemId: "ash_guard",
  },
  q6: {
    id: "q6",
    title: "El Rey Nihil",
    intro: "Nihil quiso conservar su vida y convirtió el juramento de sus guardianes en una condena. Ya viste cómo las llamas obedecen esa orden. Enfrentalo en su Trono. Por los viajeros de Bram, por quienes Elenya espera curar y por los que ya no pueden volver: hacé que Aden tenga un mañana.",
    done: "Nihil cayó. La maldición todavía deja ecos y habrá que vigilar las llamas, pero hoy Aden tiene un respiro. La Égida de Nihil es tuya: una armadura para proteger vidas, no para prolongar su condena. Pasá por la plaza; esta vez, la gente te espera para darte las gracias.",
    mobTemplateId: "skeleton_king",
    amount: 1,
    rewardExp: 1500,
    rewardGold: 800,
    rewardItemId: "nihil_aegis",
  },
};

Object.assign(QUESTS, VEIL_QUESTS);
Object.assign(QUESTS, MONASTERY_QUESTS);

Object.assign(QUESTS, {
  q_supplies: { id: "q_supplies", title: "Provisiones extraviadas", objective: "interact", targetId: "bosque_chest_1", mapId: "bosque", mobTemplateId: "", amount: 1, rewardExp: 80, rewardGold: 20, rewardItemId: "health_potion", rewardItemQty: 3, intro: "Bram abandonó el cofre al oeste de la entrada del Bosque. Recuperá sus provisiones: Elenya necesita los remedios. Entre la carga también hay una piedra tallada del santuario. Quiero entender por qué interesó tanto a los muertos.", done: "Elenya ya tiene los remedios. Te dejó tres pociones para que puedas volver. La piedra lleva dos llamas grabadas; Bram la encontró junto al santuario de Umbra. No parece un simple adorno.", hint: "Buscá el cofre de Bram al oeste de la llegada del Bosque (250, 40). Acercate y hacé clic; después volvé con Rowan." },
  q_shrine: { id: "q_shrine", title: "Una luz entre los árboles", objective: "interact", targetId: "bosque_shrine", mapId: "bosque", mobTemplateId: "", amount: 1, rewardExp: 100, rewardGold: 30, intro: "El santuario de Umbra tiene el mismo grabado que la piedra de Bram. Acercate y activalo. Si todavía responde, tal vez esos símbolos nos digan qué buscan los guardianes de Nihil.", done: "El santuario respondió. Esas dos llamas también figuran en los registros de las Ruinas. Su bendición es breve, pero la pista permanece: los muertos buscan algo que perteneció al reino, antes de la maldición.", hint: "Activá el santuario cerca de la llegada del Bosque (300, 30) y volvé con Rowan. Su bendición de ataque dura 30 segundos; podés renovarla cuando esté disponible." },
  q_alpha: { id: "q_alpha", title: "El rugido de Umbra", objective: "kill", mapId: "bosque", mobTemplateId: "umbra_alpha", amount: 1, rewardExp: 180, rewardGold: 70, rewardItemId: "aden_sello_del_veneno_antiguo", intro: "Varek vio al Alfa de Umbra rondando las piedras del noroeste. Las bestias también parecen atraídas por los lugares antiguos. Derrotalo para que la guardia pueda investigar. Revisá el arma de Dorne, tus pociones y lo que aprendiste antes de enfrentarlo.", done: "La guardia pudo examinar las piedras: otra vez, las dos llamas. Tomá este Sello del Veneno Antiguo de nuestras reservas; equipado como anillo reduce el daño de veneno. Ya tenemos una dirección: las Ruinas, donde empezó la búsqueda de Nihil.", hint: "El Alfa está al noroeste del Bosque (260, -42). Revisá tu equipo en I, prepará pociones y apartate de sus golpes anunciados. Volvé con Rowan al vencerlo." },
  q_ruins: { id: "q_ruins", title: "Tras la piedra caída", objective: "visit", targetId: "ruinas", mapId: "ruinas", mobTemplateId: "", amount: 1, rewardExp: 200, rewardGold: 60, intro: "Nihil partió hacia las Ruinas buscando la inmortalidad. Ahora sus guardianes siguen símbolos que nacieron allí. Viajá a las Ruinas de Nihil con M y reconocé la entrada. Necesitamos descubrir qué relación tienen esas dos llamas con su ejército.", done: "Los guardianes siguen custodiando las Ruinas. Bajo esas piedras está la Cripta de las Dos Llamas. Antes de investigar su interior, tenemos que abrirnos paso entre los defensores.", hint: "Abrí M y viajá a Ruinas de Nihil (nivel 3). Volvé con Rowan después de reconocer la entrada." },
  q_crypt: { id: "q_crypt", title: "Las Dos Llamas", objective: "dungeon", targetId: "cripta", mapId: "cripta", mobTemplateId: "crypt_warden", amount: 1, rewardExp: 600, rewardGold: 250, intro: "En la Cripta, la Memoria retiene a los muertos y la Fragua les da cuerpo. Despejá sus dos salas y activá cada sello para alcanzar al Custodio del Corazón. Necesitamos quebrar el vínculo que protege y descubrir quién sigue alimentándolo.", done: "El Custodio cayó, pero su orden venía del Trono. Nihil ató las llamas a su voluntad: romper el vínculo nos da tiempo, no una victoria definitiva. Si recibiste el arma del Custodio, equipala para probar su habilidad. Dorne puede orientarte antes de cruzar el Yermo.", hint: "M → Cripta (nivel 5). Despejá seis criaturas por sala y activá sus sellos; después vencé al Custodio. Salí de los círculos rojos. La expedición es compartida; al morir volvés al pueblo." },
  q_ash_shrine: { id: "q_ash_shrine", title: "La última llama", objective: "interact", targetId: "yermo_shrine", mapId: "yermo", mobTemplateId: "", amount: 1, rewardExp: 300, rewardGold: 120, rewardItemId: "greater_potion", intro: "Activá el santuario de la entrada del Yermo. Los guardianes acudían allí antes de marchar: su llama protegía a quienes todavía vivían. Recordar ese propósito es nuestra respuesta a Nihil. Después volvé para preparar el viaje al Trono.", done: "El santuario todavía responde a los vivos. Elenya te dejó una Poción Mayor. Su bendición es temporal; llevá también equipo y provisiones. Ya no vamos al Trono buscando respuestas: sabemos a quién debemos detener.", hint: "Activá el santuario del Yermo (300, 335) y volvé con Rowan. La bendición de ataque dura 30 segundos; el Trono requiere nivel 9." },
} satisfies Record<string, Quest>);

for (const [id, mapId] of Object.entries({ q1: "bosque", q2: "bosque", q3: "ruinas", q4: "ruinas", q5: "yermo", q6: "trono" })) {
  QUESTS[id].mapId = mapId;
  QUESTS[id].objective = "kill";
  QUESTS[id].hint = `Viajá con M a ${mapId}; buscá los enemigos marcados y volvé con Rowan al completar el objetivo.`;
}
QUESTS.q2.rewardItemId = undefined;
QUESTS.q2.rewardByClass = {
  knight: "aden_punal_del_umbral", barbarian: "aden_destral_del_lenador_gris", rogue: "aden_punal_del_umbral",
  mage: "aden_baston_del_huesero", ranger: "aden_arco_de_la_senda",
};
QUESTS.q4.rewardItemId = "crypt_plate";

export function getQuest(id: string): Quest {
  const quest = QUESTS[id];
  if (!quest) {
    throw new Error(`Unknown quest: ${id}`);
  }
  return quest;
}

export function firstQuestId(): string {
  return QUEST_ORDER[0];
}
