import * as THREE from 'three';

export type V3 = readonly [number,number,number];
/** Tapered sculpted sweep. Used for curved horns, tails, necks and wing fingers. */
export function sweep(points:readonly V3[], radii:readonly number[], segments=24, sides=10):THREE.BufferGeometry {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const frames=curve.computeFrenetFrames(segments,false), positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++) {
    const t=i/segments,p=curve.getPoint(t),at=t*(radii.length-1),lo=Math.floor(at);
    const r=THREE.MathUtils.lerp(radii[lo],radii[Math.min(lo+1,radii.length-1)],at-lo);
    for(let j=0;j<=sides;j++) {
      const a=j/sides*Math.PI*2;
      const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
      positions.push(v.x,v.y,v.z);uv.push(j/sides,t);
      if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function capeGeometry(width:number,height:number):THREE.BufferGeometry {
  const g=new THREE.PlaneGeometry(width,height,18,20), p=g.getAttribute('position');
  for(let i=0;i<p.count;i++) {
    const t=(height/2-p.getY(i))/height,x=p.getX(i);
    p.setXYZ(i,x*(.6+.6*t),-t*height,Math.sin(x*16)*(.025+.025*t)-t*.3-Math.sin(t*Math.PI)*.13);
  }
  g.computeVertexNormals();return g;
}

/** Per-character ownership: disposing a boss never invalidates another instance. */
export class BossParts {
  private geometries=new Set<THREE.BufferGeometry>();
  private materials=new Set<THREE.Material>();
  readonly nodes:THREE.Object3D[]=[];
  material<T extends THREE.Material>(m:T):T {this.materials.add(m);return m;}
  mesh(parent:THREE.Object3D,name:string,g:THREE.BufferGeometry,m:THREE.Material,position:V3=[0,0,0],scale:V3=[1,1,1]):THREE.Mesh {
    this.geometries.add(g);const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);this.nodes.push(mesh);return mesh;
  }
  dispose():void {
    this.nodes.forEach(o=>o.removeFromParent());this.geometries.forEach(g=>g.dispose());
    const textures=new Set<THREE.Texture>();
    this.materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);m.dispose();});
    textures.forEach(t=>t.dispose());this.geometries.clear();this.materials.clear();this.nodes.length=0;
  }
}
