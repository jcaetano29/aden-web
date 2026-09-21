import * as THREE from 'three';
import type { CharacterGender } from '@aden/shared';
import { modelForClass } from '../assets/manifest.js';
import { CharacterFactory, type Character } from './CharacterFactory.js';
import { selectClip } from './animation.js';

/** A single renderer shared by all ten selections; stopped while login is visible. */
export class HeroPreview {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(33, 1, .1, 50);
  private readonly observer: ResizeObserver;
  private character?: Character;
  private frame = 0;
  private previous = 0;
  private visible = false;
  private dragX?: number;
  private yaw = -.2;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly host: HTMLElement, private readonly factory: CharacterFactory) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute('aria-label', 'Vista previa 3D del personaje');
    this.renderer.domElement.setAttribute('role', 'img');
    this.host.append(this.renderer.domElement);
    this.camera.position.set(0, 1.75, 6.1); this.camera.lookAt(0, 1.3, 0);
    this.scene.add(new THREE.HemisphereLight(0xc9e2ff, 0x373023, 2.3));
    const key = new THREE.DirectionalLight(0xffe3b3, 3.3); key.position.set(3, 5, 5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9ccaff, 3); rim.position.set(-3, 3, -2); this.scene.add(rim);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.05, .12, 64), new THREE.MeshStandardMaterial({ color: 0x263440, roughness: .55, metalness: .5 }));
    plinth.position.y = -.075; this.scene.add(plinth);
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(.92, .012, 6, 64), new THREE.MeshStandardMaterial({ color: 0xb39157, metalness: .7, roughness: .3 }));
    rimRing.rotation.x = Math.PI / 2; rimRing.position.y = -.025; this.scene.add(rimRing);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
  }
  private pointerDown = (e: PointerEvent) => { this.dragX = e.clientX; this.renderer.domElement.setPointerCapture(e.pointerId); };
  private pointerMove = (e: PointerEvent) => { if (this.dragX === undefined) return; this.rotate((e.clientX - this.dragX) * .012); this.dragX = e.clientX; };
  private pointerUp = () => { this.dragX = undefined; };
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }
  show(classId: string, gender: CharacterGender) {
    if (this.character) { this.scene.remove(this.character.root); this.character.mixer.stopAllAction(); this.character.mixer.uncacheRoot(this.character.root); }
    this.character = this.factory.create(modelForClass(classId, gender));
    this.character.root.rotation.y = this.yaw;
    const idle = selectClip(this.character.clipNames, 'idle'); if (idle) this.character.play(idle, true);
    this.scene.add(this.character.root);
    this.host.dataset.model = modelForClass(classId, gender);
    this.renderer.domElement.setAttribute('aria-label', `Vista previa 3D: ${classId}, ${gender === 'female' ? 'femenino' : 'masculino'}`);
  }
  rotate(delta: number) { this.yaw += delta; if (this.character) this.character.root.rotation.y = this.yaw; }
  setVisible(visible: boolean) {
    if (this.visible === visible) return;
    this.visible = visible; cancelAnimationFrame(this.frame);
    if (visible) { this.resize(); this.previous = performance.now(); this.frame = requestAnimationFrame(this.render); }
  }
  private render = (now: number) => {
    if (!this.visible) return;
    const dt = Math.min((now - this.previous) / 1000, .05); this.previous = now;
    if (!this.reducedMotion) this.character?.mixer.update(dt);
    this.renderer.render(this.scene, this.camera); this.frame = requestAnimationFrame(this.render);
  };
  dispose() {
    this.visible = false; cancelAnimationFrame(this.frame); this.observer.disconnect();
    if (this.character) { this.character.mixer.stopAllAction(); this.character.mixer.uncacheRoot(this.character.root); this.scene.remove(this.character.root); }
    this.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown); canvas.removeEventListener('pointermove', this.pointerMove);
    canvas.removeEventListener('pointerup', this.pointerUp); canvas.removeEventListener('pointercancel', this.pointerUp);
    this.renderer.dispose(); canvas.remove();
  }
}
