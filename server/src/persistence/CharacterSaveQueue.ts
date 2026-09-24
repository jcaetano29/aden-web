import type { CharacterSave } from './CharacterSave.js';

export interface CharacterSaveEntry { name:string; data:CharacterSave; }

/** Serial, atomic batches. Failed rows remain pending and are included in the
 * next batch, even if that batch was requested by just one departing player. */
export class CharacterSaveQueue {
  private pending=new Map<string,CharacterSave>();
  private tail:Promise<void>=Promise.resolve();
  constructor(
    private readonly write:(entries:CharacterSaveEntry[])=>Promise<void>,
    private readonly saved?:(names:string[])=>void,
  ) {}
  save(entries:CharacterSaveEntry[]):Promise<void> {
    for(const {name,data} of entries)this.pending.set(name,data);
    const flush=this.tail.catch(()=>{}).then(async()=>{
      const batch=[...this.pending].map(([name,data])=>({name,data}));
      if(!batch.length)return;
      await this.write(batch);
      const committed:string[]=[];
      for(const {name,data} of batch)if(this.pending.get(name)===data){this.pending.delete(name);committed.push(name);}
      this.saved?.(committed);
    });
    this.tail=flush;return flush;
  }
}
