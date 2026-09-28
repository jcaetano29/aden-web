import {expect,it} from 'vitest';
import {sweep} from './BossGeometry.js';
it('faces sculpted tube surfaces outward so claws and horns are solid',()=>{
  const geometry=sweep([[0,0,0],[0,0,2]],[.2,.2],8,8);
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
  for(let i=9;i<p.count-9;i++)expect(p.getX(i)*n.getX(i)+p.getY(i)*n.getY(i)).toBeGreaterThan(0);
  geometry.dispose();
});
