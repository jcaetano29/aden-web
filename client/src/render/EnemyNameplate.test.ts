// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Nameplates } from './Nameplates.js';

describe('enemy threat labels', () => {
  it('shows level and rank before combat and updates when the player grows', () => {
    const root = new THREE.Group(), plates = new Nameplates();
    plates.add('mob','Bestia',root);
    plates.setEnemy('mob','Bestia',7,'elite',1);
    const el=(root.children[0] as any).element as HTMLElement;
    expect(el.textContent).toContain('Nv. 7');
    expect(el.textContent).toContain('Élite');
    expect(el.textContent).toContain('Fuera de tu alcance');
    expect(el.textContent).toContain('☠');
    plates.setEnemy('mob','Bestia',7,'elite',7);
    expect(el.textContent).not.toContain('Fuera de tu alcance');
    expect(el.textContent).not.toContain('☠');
    expect(el.textContent).toContain('Nv. 7');
  });
});
