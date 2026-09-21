import * as THREE from 'three';
import { SKILLS, skillRange } from '@aden/shared';
import { SkillEffects } from '../render/SkillEffects.js';
import { StatusEffects } from '../render/StatusEffects.js';
import { CharacterFactory } from '../render/CharacterFactory.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { DamageNumbers } from '../render/DamageNumbers.js';

const scene = new THREE.Scene(); scene.background = new THREE.Color('#101720');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight - 115); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.querySelector('#stage')!.append(renderer.domElement);
const labels = new CSS2DRenderer(); labels.setSize(innerWidth, innerHeight - 115);
labels.domElement.style.cssText = 'position:absolute;top:115px;pointer-events:none';
document.body.append(labels.domElement);
const camera = new THREE.PerspectiveCamera(42, innerWidth / (innerHeight - 115), .1, 100);
camera.position.set(10, 13, 16); camera.lookAt(0, 1, 0);
scene.add(new THREE.HemisphereLight(0xdcecff, 0x34402c, 3));
scene.add(new THREE.GridHelper(30, 30, 0x546577, 0x293442));
const factory = new CharacterFactory(); await factory.preload(['Mage', 'Knight']);
const caster = factory.create('Mage'), target = factory.create('Knight');
caster.root.position.x = -3; target.root.position.x = 3; scene.add(caster.root, target.root);
const fx = new SkillEffects(scene), statuses = new StatusEffects(scene), numbers = new DamageNumbers(scene);
const select = document.querySelector<HTMLSelectElement>('#skill')!;
for (const skill of Object.values(SKILLS)) select.add(new Option(skill.name, skill.id));
select.value = 'meteor';
let time = 0, age = 0;
function cast() {
  const s = SKILLS[select.value]; age = 0;
  const range = skillRange(s);
  target.root.position.x = Math.min(3, -3 + range);
  const from = { x: -3, z: 0 }, to = { x: target.root.position.x, z: 0 };
  const dest = s.dash === 'away' ? { x: -6, z: -2 } : s.dash === 'toTarget' ? { x: to.x - 1, z: 0 } : from;
  caster.root.position.set(dest.x, 0, dest.z);
  fx.cast(s.id, from, to, dest);
  statuses.remove('target'); statuses.remove('caster');
  document.querySelector('#info')!.textContent = `${s.name} · ${s.type === 'damage' || s.type === 'dot' ? `Alcance: ${range} m` : 'Sobre el héroe'} · Números ilustrativos`;
  if (s.type === 'damage' || s.type === 'dot') numbers.spawn(new THREE.Vector3(to.x, 2.5, 0), 38);
}
document.querySelector('#cast')!.addEventListener('click', cast); select.addEventListener('change', cast);
cast();
const clock = new THREE.Clock();
function frame() {
  const dt = clock.getDelta(); time += dt; age += dt * 1000;
  if (time > 2.8 && document.querySelector<HTMLInputElement>('#repeat')!.checked) { time = 0; cast(); }
  const s = SKILLS[select.value];
  statuses.sync('target', { stunMs: (s.stunMs ?? 0) - age, rootMs: (s.rootMs ?? 0) - age, poisonMs: (s.dotMs ?? 0) - age }, () => new THREE.Vector3(target.root.position.x, 2.4, 0));
  statuses.sync('caster', { atkBuffMs: s.buffStat === 'pAtk' ? (s.buffMs ?? 0) - age : 0, defBuffMs: s.buffStat === 'pDef' ? (s.buffMs ?? 0) - age : 0 }, () => new THREE.Vector3(caster.root.position.x, 2.4, caster.root.position.z));
  caster.mixer.update(dt); target.mixer.update(dt); fx.update(dt); statuses.update(dt); numbers.update(dt);
  renderer.render(scene, camera); labels.render(scene, camera); requestAnimationFrame(frame);
}
frame();
