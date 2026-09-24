/** Fixed PvE tiers. At six levels below an enemy, neither damage nor control penetrates. */
export function pvePower(playerLevel: number, enemyLevel: number): { outgoing: number; incoming: number } {
  const gap = enemyLevel - playerLevel;
  return {
    outgoing: gap >= 6 ? 0 : gap === 5 ? 0.15 : gap === 4 ? 0.4 : gap === 3 ? 0.7 : 1,
    incoming: 1 + Math.max(0, gap - 2) * 0.35,
  };
}

export function enemyThreat(playerLevel: number, enemyLevel: number) {
  const gap = enemyLevel - playerLevel;
  if (gap >= 6) return { label: 'Fuera de tu alcance', color: '#ff6868', symbol: '☠' };
  if (gap >= 3) return { label: 'Peligroso', color: '#ffaf55', symbol: '▲' };
  if (gap <= -3) return { label: 'Inferior', color: '#91d78b', symbol: '' };
  return { label: 'A tu nivel', color: '#ffe083', symbol: '' };
}
