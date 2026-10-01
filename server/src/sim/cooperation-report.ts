import { BalanceSimulator } from './BalanceSimulator.js';
import { cooperationScenarios, forgeScenarios, invasionScenarios, minesScenarios } from './scenarios.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASS_ORDER, MOB_COMBAT, POTION_COOLDOWN_MS } from '@aden/shared';

/** Desde server: npx tsx src/sim/cooperation-report.ts [reporte.json].
 * Por defecto guarda docs/balance/party-cooperation/cooperation-results.json. Una sala y ejecuciones secuenciales. */
const sim = await BalanceSimulator.start(2613);
try {
  const rows = cooperationScenarios().flatMap(s => [1, 2, 3].flatMap(seed => [false, true].map(cooperation => ({
    encounter: s.encounter, composition: s.composition, seed, cooperation,
    ...sim.fightGroup(s.scenario, s.group, seed, 1200, { cooperation }),
  }))));
  const invasions = invasionScenarios().flatMap(s => [1, 2, 3].map(seed => ({
    encounter: s.name, seed, targetSeconds: s.target,
    group: sim.fightGroup(s.scenario, s.group, seed),
    solo: sim.fightGroup(s.scenario, s.group.filter(p => p.className === s.soloClass), seed),
  })));
  const soloBosses = [minesScenarios, forgeScenarios].flatMap(set => CLASS_ORDER.flatMap(cls => [1, 2, 3].map(seed => ({
    seed, ...sim.fight(set(cls).find(s => ['halden', 'vharzul'].includes(s.templateId))!, 'attentive', seed),
  }))));
  const report = JSON.stringify({
    note: 'Mismo motor, party y encuentro con o sin decisiones de apoyo de los bots. No reproduce el motor anterior ni sustituye partidas humanas. Protections cuenta aplicaciones de Guardia, no daño prevenido; healing es vida realmente recuperada en compañeros.',
    isolation: { clockAdvanceBetweenFightsMs: POTION_COOLDOWN_MS, reason: 'Vencen las recargas de pociones del intento anterior antes de reutilizar nombres de bots.' },
    balance: {
      reason: 'Los beneficios cooperativos acortaron los combates. Se ajustó sólo la vida de estos invasores para conservar los intervalos originales; la mejora PvE del caballero mantiene la viabilidad individual con el límite original de 1,5 veces la mediana.',
      invaderHp: Object.fromEntries(['crimson_dragon', 'veil_specter', 'ember_colossus'].map(id => [id, MOB_COMBAT[id].maxHp])),
    },
    rows, invasions, soloBosses,
  }, null, 2);
  const output = process.argv[2] ?? fileURLToPath(new URL('../../../docs/balance/party-cooperation/cooperation-results.json', import.meta.url));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, report);
  console.log(`Informe guardado en ${output}`);
} finally {
  await sim.stop();
}
