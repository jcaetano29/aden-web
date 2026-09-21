// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Nameplates } from './Nameplates.js';
import type { ChatMessage } from '@aden/shared';

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'one', channel: 'local', text: 'Hola vecinos', senderId: 'a', senderName: 'Ana', mapId: 'pueblo', timestamp: 10000, ...overrides,
});

function setup() {
  let now = 0;
  const plates = new Nameplates(() => now);
  const character = new THREE.Object3D(); character.userData.visualHeight = 3;
  plates.add('a', 'Ana', character);
  const label = character.children[0] as CSS2DObject;
  return { plates, character, label, advance: (ms: number) => { now += ms; plates.updateChat('pueblo'); } };
}

describe('proximity speech bubbles', () => {
  it('anchors safe literal text above the character, follows it, fades and expires', () => {
    const { plates, character, label, advance } = setup();
    plates.showChat(message({ text: '<img src=x> ¡Hola!' }));
    const bubble = label.element.querySelector<HTMLElement>('[data-chat-bubble]')!;
    expect(bubble.textContent).toBe('<img src=x> ¡Hola!');
    expect(bubble.querySelector('img')).toBeNull();
    expect(label.parent).toBe(character);
    character.position.set(10, 0, 15);
    expect(label.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([10, 3.5, 15]);
    advance(4400); expect(bubble.style.opacity).toBe('1');
    advance(300); expect(Number(bubble.style.opacity)).toBeGreaterThan(0); expect(Number(bubble.style.opacity)).toBeLessThan(1);
    advance(300); expect(label.element.querySelector('[data-chat-bubble]')).toBeNull();
    expect(label.element.textContent).toBe('Ana');
  });

  it('replaces the previous bubble and restarts its lifetime without stacking', () => {
    const { plates, label, advance } = setup();
    plates.showChat(message()); advance(4000);
    plates.showChat(message({ id: 'two', text: 'Vamos al bosque' }));
    advance(1000);
    expect(label.element.querySelectorAll('[data-chat-bubble]')).toHaveLength(1);
    expect(label.element.textContent).toContain('Vamos al bosque');
    advance(4000); expect(label.element.querySelector('[data-chat-bubble]')).toBeNull();
  });

  it('ignores global messages and unknown senders, and clears bubbles across maps or disconnects', () => {
    const { plates, character, label } = setup();
    plates.showChat(message({ channel: 'global' }));
    plates.showChat(message({ senderId: 'missing' }));
    expect(label.element.querySelector('[data-chat-bubble]')).toBeNull();
    plates.showChat(message()); plates.updateChat('bosque');
    expect(label.element.querySelector('[data-chat-bubble]')).toBeNull();
    plates.showChat(message()); character.visible = false; plates.updateChat('pueblo');
    expect(label.element.querySelector('[data-chat-bubble]')).toBeNull();
    character.visible = true; plates.showChat(message()); plates.remove('a');
    expect(character.children).toHaveLength(0);
    plates.showChat(message()); expect(character.children).toHaveLength(0);
  });
});
