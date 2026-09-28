import * as THREE from 'three';
/** Capture the repository model itself, with a stable camera and transparent background. */
export function captureWeaponIcon(renderer:THREE.WebGLRenderer,model:THREE.Object3D):string {
 const scene=new THREE.Scene();const copy=model.clone(true);copy.rotation.set(.12,-.28,-.3);scene.add(copy);scene.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(copy),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());copy.position.sub(center);
 const extent=Math.max(size.x,size.y,size.z)*.60;const camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,.01,20);camera.position.set(0,0,5);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xeaf4ff,0x44505c,2.2));const key=new THREE.DirectionalLight(0xffeccf,3.5);key.position.set(-3,5,4);scene.add(key);
 renderer.setClearColor(0,0);renderer.setSize(128,128,false);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');
}
