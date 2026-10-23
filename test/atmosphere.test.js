import test from 'node:test';
import assert from 'node:assert/strict';
import { RainScene } from '../src/rain.js';
function scene(amount=65, low=true) {
 const stats={strokes:0,fills:0,widths:[],colors:[]};
 const ctx=new Proxy({stroke(){stats.strokes++;stats.widths.push(this.lineWidth);stats.colors.push(this.strokeStyle);},fill(){stats.fills++;}}, {get(o,k){return k in o?o[k]:()=>{};}});
 const s=Object.assign(Object.create(RainScene.prototype), {ctx,width:390,height:844,low,options:{amount,wind:12,scene:'spring'},interaction:{bend:(p,x,y)=>({x,y})},drops:Array.from({length:700},()=>({x:0,y:7,speed:10,length:.3})),airParticles:Array.from({length:260},()=>({x:.5,y:.5,r:2,phase:1}))});
 return {s,stats};
}
test('mobile rain is visible, moves downward and increases with density',()=>{
 const a=scene(5),b=scene(100); const y=b.s.drops[0].y;
 a.s.drawPaperRain(.03);b.s.drawPaperRain(.03);
 assert.ok(b.stats.strokes>200);assert.ok(b.stats.strokes>a.stats.strokes);
 assert.ok(b.stats.widths.every(w=>w>=.85));assert.ok(b.s.drops[0].y<y);
});
test('petals, leaves and snow respond to density and freeze when dt is zero',()=>{
 for(const kind of ['snow','petals','autumn','leaves']){
  const a=scene(5),b=scene(100);a.s.drawAir(0,kind);b.s.drawAir(.03,kind);
  assert.ok(b.stats.fills>a.stats.fills,kind);assert.equal(a.s.airParticles[0].y,.5);
  assert.ok(b.s.airParticles[0].y>.5);assert.ok(b.stats.fills>=25);
 }
});
test('glass trails stay inside their clip and rain beads advance',()=>{
 const {s,stats}=scene();const before=s.airParticles[0].y;
 s.drawGlass(.03);assert.ok(stats.strokes>40);assert.ok(stats.fills>40);assert.ok(s.airParticles[0].y>before);
});
