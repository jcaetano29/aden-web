import { POTION_COOLDOWN_MS,type PotionResource } from '@aden/shared';

/** Account expiries survive room/session changes for this server process. */
export class PotionRecovery {
  private readonly expiries=new Map<string,{hp:number;mp:number}>();
  constructor(private readonly now:()=>number=Date.now) {}
  remaining(account:string,resource:PotionResource):number {
    const entry=this.expiries.get(account);if(!entry)return 0;
    const now=this.now();
    if(Math.max(entry.hp,entry.mp)<=now){this.expiries.delete(account);return 0;}
    return Math.max(0,entry[resource]-now);
  }
  start(account:string,resource:PotionResource):void {
    const now=this.now();
    // Drop expired departed accounts without keeping timers or persistent records.
    for(const [key,entry] of this.expiries)if(Math.max(entry.hp,entry.mp)<=now)this.expiries.delete(key);
    const entry=this.expiries.get(account)??{hp:0,mp:0};
    entry[resource]=now+POTION_COOLDOWN_MS;this.expiries.set(account,entry);
  }
}
export const potionRecovery=new PotionRecovery();
