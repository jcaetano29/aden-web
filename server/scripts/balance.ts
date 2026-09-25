import { mkdirSync, writeFileSync } from 'node:fs';
import { CLASS_ORDER } from '@aden/shared';
import { BalanceSimulator, type Behavior, type FightResult } from '../src/sim/BalanceSimulator.js';
import { baselineScenarios, manaProfile } from '../src/sim/scenarios.js';

const OUT = '../artifacts/balance';
const sim = await BalanceSimulator.start();
try {
  mkdirSync(OUT, { recursive: true });
  if (process.argv.includes('--mana')) {
    const profile = manaProfile();
    const report = { max: sim.manaRun(profile, 'max'), primary: sim.manaRun(profile, 'primary') };
    writeFileSync(`${OUT}/mana.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } else {
    const rows: FightResult[] = [];
    for (const cls of CLASS_ORDER) for (const s of baselineScenarios(cls)) for (const b of ['attentive', 'stationary'] as Behavior[]) rows.push(sim.fight(s, b));
    writeFileSync(`${OUT}/baseline.json`, JSON.stringify(rows, null, 2));
    console.log('| Escenario | Clase | Conducta | Nivel | Enemigo | Resultado | s | Caída de vida % | Pociones |');
    console.log('|---|---|---|---:|---:|---|---:|---:|---:|');
    for (const r of rows) console.log(`| ${r.scenario} | ${r.className} | ${r.behavior} | ${r.level} | ${r.enemyLevel} | ${r.outcome} | ${r.seconds} | ${r.hpLostPct} | ${r.potions} |`);
  }
} finally {
  await sim.stop();
}
