// @vitest-environment jsdom
import { it, expect } from 'vitest';
import type { CastleView } from '@aden/shared';
import { CastleBanner } from './CastleBanner.js';

it('shows registration to everyone, the match only inside, and the collapse warning', () => {
  const parent = document.createElement('div'), banner = new CastleBanner(parent);
  const root = parent.firstElementChild as HTMLElement;
  const base: CastleView = { phase: 'registration', bracket: 'menor', startsAt: 200_000, endsAt: 800_000, registered: 3, alive: 0, monsters: 0, ring: 0, collapseAt: 0, myPoints: null };
  banner.update(base, false, 50_000);
  expect(parent.textContent).toContain('Castillo del Caos Menor');
  expect(parent.textContent).toContain('02:30');
  expect(parent.textContent).toContain('Custodio');
  const active: CastleView = { ...base, phase: 'active', startsAt: 0, endsAt: 600_000, alive: 3, monsters: 9, myPoints: 4 };
  banner.update(active, true, 80_000);
  expect(parent.textContent).toContain('Quedan 3');
  expect(parent.textContent).toContain('Tus puntos: 4');
  expect(parent.textContent).toContain('08:40');
  banner.update({ ...active, collapseAt: 83_000 }, true, 80_000);
  expect(parent.textContent).toContain('¡El borde se derrumba!');
  banner.update({ ...active, ring: 1, collapseAt: 83_000 }, true, 80_000);
  expect(parent.textContent).toContain('¡El anillo medio se derrumba!');
  banner.update(active, false, 80_000);
  expect(root.style.display).toBe('none');
  banner.update(null, false, 0);
  expect(root.style.display).toBe('none');
});
