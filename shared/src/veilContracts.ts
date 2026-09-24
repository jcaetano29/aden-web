export const VEIL_CONTRACTS_COMPLETE='veil_contracts_complete';
export interface VeilContract {
  id:string; title:string; intro:string; done:string; objectId:string; mapId:string;
  rewardGold:number; rewardItemId:string; rewardQty:number;
}
export const VEIL_CONTRACTS:readonly VeilContract[]=[
  {id:'b_veil_supplies',title:'Provisiones para el regreso',objectId:'boren_supplies',mapId:'marismas',
    intro:'Recuperá la caja de provisiones junto a la pasarela oriental (1216, 169), en las Marismas. Volvé al puesto de Boren.',
    done:'Con esto los viajeros podrán comer mientras se recuperan. Llevá estas pociones para el camino.',rewardGold:150,rewardItemId:'greater_potion',rewardQty:3},
  {id:'b_veil_identity',title:'Un nombre entre el barro',objectId:'boren_identity',mapId:'marismas',
    intro:'Buscá la placa del viajero al oeste de la caravana (1177, 119), en las Marismas. Su familia todavía espera noticias. Volvé con Boren.',
    done:'Taren. Ahora puedo decirle a su familia dónde buscarlo. No era un nombre más en una lista.',rewardGold:250,rewardItemId:'aden_vial_de_niebla_menor',rewardQty:2},
  {id:'b_veil_tool',title:'La herramienta del archivo',objectId:'boren_tool',mapId:'monasterio',
    intro:'Cuando Maera abra la ruta al Monasterio, recuperá la herramienta del archivo oriental (1236, 454). Boren podrá reparar los carros de regreso. Entregala en las Marismas.',
    done:'Las ruedas volverán a girar y todos tendrán lugar en el viaje a casa. Conservá este amuleto: ya hiciste suficiente por nosotros.',rewardGold:350,rewardItemId:'veil_charm',rewardQty:1},
];
export function getVeilContract(id:string):VeilContract|undefined {return VEIL_CONTRACTS.find(c=>c.id===id);}
export function nextVeilContract(id:string):string {
  if(id===VEIL_CONTRACTS_COMPLETE)return id;
  return VEIL_CONTRACTS[VEIL_CONTRACTS.findIndex(c=>c.id===id)+1]?.id??VEIL_CONTRACTS_COMPLETE;
}
