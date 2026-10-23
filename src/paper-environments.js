// Original dry-brush landscapes, painted once and cached behind the moving rain.
const TAU = Math.PI * 2;
let paper, pigment;
function textures() {
  if (paper) return;
  const make = () => { const a = document.createElement('canvas'); a.width = a.height = 384; return a; };
  paper = make(); pigment = make();
  for (const [canvas, wash] of [[paper, false], [pigment, true]]) {
    const ctx = canvas.getContext('2d'), im = ctx.createImageData(384, 384);
    let seed = 918;
    for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const n = seed / 4294967296, i = (y * 384 + x) * 4;
      const cloud = Math.sin(x * .043 + Math.sin(y * .03) * 2) * Math.cos(y * .038) + Math.sin(x * .11 + y * .07) * .25;
      const bright = wash ? cloud + (n - .5) * .8 > 0 : n > .56;
      im.data[i] = bright ? 249 : 57; im.data[i + 1] = bright ? 244 : 57; im.data[i + 2] = bright ? 226 : 44;
      im.data[i + 3] = wash ? Math.abs(cloud * 42 + (n - .5) * 44) : n * 22;
    }
    ctx.putImageData(im, 0, 0);
  }
}
export function paperComposition(W, H) {
  return { portrait: W / H < .82, unit: Math.min(W, H), artTop: W / H < .82 ? .32 : .2 };
}
export function paintPaperScene(c, W, H, scene, brightness, random) {
  textures();
  const { portrait, unit: U, artTop } = paperComposition(W, H), cream = '#efe9d8', ink = '#354b43';
  const r = (a,b) => a + random() * (b-a);
  c.fillStyle = cream; c.fillRect(0,0,W,H);
  function mark(path,color,opacity=1) {
    c.save(); c.globalAlpha=opacity; path(); c.fillStyle=color; c.fill(); c.clip();
    c.globalAlpha*=.85; c.fillStyle=c.createPattern(pigment,'repeat');c.fillRect(0,0,W,H);
    c.fillStyle=cream;
    for(let i=0;i<130;i++){c.globalAlpha=r(.06,.23);c.fillRect(r(0,W),r(0,H),r(.4,7),r(.4,1.4));}
    c.restore();
  }
  function patch(x,y,rx,ry,color,phase=0,opacity=1) {
    mark(()=>{c.beginPath();for(let i=0;i<=100;i++){
      const a=i/100*TAU, k=1+Math.sin(a*7+phase)*.045+Math.sin(a*17+phase*2)*.017;
      const px=x+Math.cos(a)*rx*k,py=y+Math.sin(a)*ry*k;
      if(!i)c.moveTo(px,py);else c.lineTo(px,py);
    }c.closePath();},color,opacity);
  }
  function stroke(points,color,width=1) {
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  function brush(points,color,width) {
    const left=[],right=[];
    let sample=0;
    for(let j=0;j<points.length-1;j++){
      const a=points[Math.max(0,j-1)],b=points[j],d=points[j+1],e=points[Math.min(points.length-1,j+2)];
      const steps=Math.max(4,Math.ceil(Math.hypot(d[0]-b[0],d[1]-b[1])/8));
      const position=(k,t)=>.5*((2*b[k])+(-a[k]+d[k])*t+(2*a[k]-5*b[k]+4*d[k]-e[k])*t*t+(-a[k]+3*b[k]-3*d[k]+e[k])*t*t*t);
      for(let i=0;i<=steps;i++){
        const t=i/steps,x=position(0,t),y=position(1,t);
        const dx=position(0,Math.min(1,t+.01))-position(0,Math.max(0,t-.01));
        const dy=position(1,Math.min(1,t+.01))-position(1,Math.max(0,t-.01));
        const length=Math.hypot(dx,dy)||1, span=width*(.37+Math.sin(sample++*.63)*.025+r(-.016,.016));
        left.push([x-dy/length*span,y+dx/length*span]);right.push([x+dy/length*span,y-dx/length*span]);
      }
    }
    mark(()=>{c.beginPath();const outline=[...left,...right.reverse()];c.moveTo(...outline[0]);
      for(let i=1;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}c.closePath();},color,.68);
    c.save();c.globalAlpha=.24;
    // The pale, uneven bristle gaps leave paper showing through the pigment.
    for(let i=0;i<70;i++){
      const t=r(0,points.length-1),j=Math.floor(t),f=t-j,a=points[j],b=points[Math.min(j+1,points.length-1)];
      const x=a[0]+(b[0]-a[0])*f+r(-width*.34,width*.34),y=a[1]+(b[1]-a[1])*f;
      stroke([[x,y],[x+r(5,22),y-r(4,14)]],cream,r(.3,1.2));
    }c.restore();
  }
  function bird(x,y,size,angle,color=cream) {
    c.save();c.translate(x,y);c.rotate(angle);
    mark(()=>{c.beginPath();c.moveTo(-size,-size*.5);c.lineTo(-size*.18,-size*.1);c.lineTo(size*.1,-size*.85);c.lineTo(size*.28,-size*.1);c.lineTo(size,size*.35);c.lineTo(size*.22,size*.18);c.lineTo(-size*.08,size*.45);c.lineTo(-size*.2,size*.1);c.closePath();},color);c.restore();
  }
  function leaf(x,y,radius,color,phase) {
    const ry=radius*(portrait?.96:.73);patch(x,y,radius,ry,color,phase);
    c.save();c.globalAlpha=.2;
    for(let i=0;i<10;i++){const a=i/10*TAU+phase;stroke([[x,y],[x+Math.cos(a+.035)*radius*.5,y+Math.sin(a)*ry*.5],[x+Math.cos(a)*radius*.89,y+Math.sin(a)*ry*.89]],'#c7d5af',.7);}
    c.restore();patch(x,y,1.5,1.5,'#c7d5af');
  }
  if(scene==='pond') {
    brush([[W*.62,H*artTop],[W*.48,H*.62],[W*.56,H*1.1]],'#abc2a5',U*.7);
    const leaves=portrait?[[-.07,.45,.34],[.2,.53,.26],[.96,.43,.28],[.94,.68,.3],[-.05,.79,.34],[.1,1.03,.3],[.9,1.02,.35]]:[[-.02,.66,.33],[.13,.95,.29],[.87,.44,.26],[1.03,.77,.36],[.75,1.1,.26]];
    leaves.forEach(([x,y,size],i)=>leaf(x*W,y*H,size*U,['#285749','#3b7159','#1e5142','#477c61'][i%4],i*.7));
    const x=W*.58,y=H*.76;
    mark(()=>{c.beginPath();c.moveTo(x,y-U*.095);c.bezierCurveTo(x+U*.04,y-U*.02,x+U*.04,y+U*.07,x,y+U*.09);c.bezierCurveTo(x-U*.035,y+U*.05,x-U*.03,y-U*.04,x,y-U*.095);},'#293d36');
    patch(x,y+U*.015,U*.017,U*.047,'#7b8873');stroke([[x,y],[x-U*.07,y+U*.09]],ink,1.3);patch(x-U*.07,y+U*.09,U*.006,U*.018,ink,1);
    for(let i=0;i<9;i++){const x=W*r(.4,.7),y=H*r(.4,.95);stroke([[x,y],[x+2,y+7],[x,y+12]],i%3?'#6d947b66':'#aa795eaa',i%3?.6:1.6);}
  } else if(scene==='spring') {
    brush([[W*.95,H*.3],[W*.65,H*.48],[W*.82,H*.7],[W*.28,H*.92]],'#d69aa5',U*.46);
    brush([[W*.9,H*.35],[W*.5,H*.65],[W*.65,H*.92]],'#edd0ca',U*.22);
    const branch=[[W*.98,H*.44],[W*.78,H*.55],[W*.72,H*.68],[W*.38,H*.79],[W*.2,H*.94]];
    for(let j=0;j<3;j++){c.save();c.globalAlpha=.3;stroke(branch.map(([x,y])=>[x+j,y]),'#675b4d',2-j*.5);c.restore();}
    for(let i=0;i<(portrait?28:45);i++){
      const t=r(0,3.9),j=Math.floor(t),f=t-j,a=branch[j],b=branch[Math.min(j+1,4)],x=a[0]+(b[0]-a[0])*f+r(-U*.08,U*.08),y=a[1]+(b[1]-a[1])*f+r(-U*.05,U*.05),s=r(4,11)*U/450;
      for(let k=0;k<5;k++){const q=k/5*TAU;patch(x+Math.cos(q)*s*.7,y+Math.sin(q)*s*.7,s*.7,s*.6,['#d38d9e','#f0d8d1','#e9bcc3'][i%3],k);}
      patch(x,y,s*.16,s*.16,'#9b8159');
    }
    brush([[W*.59,H*.76],[W*.62,H*.9],[W*.48,H*1.1]],'#a8b8b4',U*.12);
  } else if(scene==='forest') {
    brush([[W*.96,H*.43],[W*.63,H*.59],[W*.85,H*.76],[W*.42,H*1.05]],'#ba924b',U*.6);
    brush([[W*.94,H*.53],[W*.71,H*.77],[W*.52,H*.93]],'#b8764c',U*.28);
    for(let i=0;i<(portrait?7:12);i++){
      const x=W*r(.58,1.12),y=H*r(.57,.91),h=U*r(.2,.5);
      stroke([[x,y+h*.3],[x-3,y-h*.6],[x+h*.08,y-h]],ink,r(1.1,2.4));
      for(let j=0;j<4;j++){const yy=y-h*j*.2,side=j%2?1:-1;stroke([[x,yy],[x+side*h*.2,yy-h*.16],[x+side*h*.3,yy-h*.2]],ink,.8);}
      for(let j=0;j<7;j++)patch(x+r(-h*.3,h*.3),y+r(-h,h*.05),h*r(.06,.18),h*r(.05,.14),['#b6954f','#c6a564','#a77b4f','#59664a'][j%4],j,.7);
    }
    brush([[W*.28,H*.8],[W*.5,H*.9],[W*.5,H*1.05]],'#a8b3a4',U*.25);
    for(let i=0;i<18;i++)patch(W*r(.12,.87),H*r(.76,.98),r(2,5),r(1,3),['#b1884e','#93644d','#b6a06c'][i%3],i,.7);
    bird(W*.7,H*.38,U*.028,-.4,ink);bird(W*.79,H*.33,U*.016,.15,ink);
  } else if(scene==='day') {
    mark(()=>{c.beginPath();c.moveTo(W*.55,H*artTop);for(let i=0;i<=30;i++)c.lineTo(W*(.5+Math.sin(i*.22)*.1)+r(-4,4),H*(artTop+i/30*.5));c.lineTo(W*1.1,H*.88);c.lineTo(W*1.1,H*artTop);c.closePath();},'#33768b');
    for(let i=0;i<7;i++)bird(W*r(.62,.94),H*r(artTop+.06,.7),U*r(.014,.045),r(-.8,.8));
    brush([[W*.72,H*.82],[W*.94,H*.72],[W*1.08,H*.93]],'#bd9e57',U*.37);
    brush([[W*.82,H*.95],[W*1.1,H*.87]],'#3c5752',U*.29);
    for(let i=0;i<18;i++){const x=W*r(.65,1.03),y=H*r(.78,.98);stroke([[x,y],[x+r(-12,12),y-U*r(.025,.1)]],ink,.7);}
    patch(W*.75,H*(artTop+.06),U*.036,U*.036,'#e0c67f');
  } else if(scene==='lake') {
    brush([[W*.95,H*.38],[W*.6,H*.56],[W*.9,H*.71]],'#a6bdc1',U*.65);
    brush([[W*.7,H*.7],[W*.32,H*.96],[W*.89,H*1.05]],'#c3d1cd',U*.52);
    for(let i=0;i<5;i++){const x=W*r(.7,1),y=H*r(.74,.95),h=U*r(.1,.35);stroke([[x,y],[x-3,y-h]],'#63786f',1.1);stroke([[x-2,y-h*.6],[x-U*.06,y-h*.7]],'#63786f',.7);}
    for(let i=0;i<12;i++){const x=W*r(.15,.9),y=H*r(.7,.97);stroke([[x,y],[x+U*r(.03,.12),y-1]],'#6d8d8a40',.6);}
    bird(W*.76,H*.35,U*.018,.2,'#697e76');
  } else {
    const left=W*(portrait?.25:.52),top=H*(portrait?.36:.2),right=W*.97,bottom=H*.82;
    mark(()=>{c.beginPath();c.moveTo(left,top+5);c.lineTo(right,top);c.lineTo(right-4,bottom);c.lineTo(left+2,bottom-6);c.closePath();},'#344f5b');
    brush([[right,H*.45],[left+U*.1,H*.68],[right,H*.76]],'#60757c',U*.24);
    stroke([[left+4,top],[left,bottom],[right,bottom],[right,top]],'#44524a',3);
    stroke([[(left+right)/2,top],[(left+right)/2,bottom]],'#b9b5a1',U*.012);
    stroke([[left,top+(bottom-top)*.52],[right,top+(bottom-top)*.52]],'#b9b5a1',U*.011);
    brush(portrait?[[W*.04,H*.84],[W*.42,H*.77],[W*.95,H*.9]]:[[W*.2,H*.95],[W*.65,H*.87],[W*1.07,H*.96]],'#b2a27d',U*.27);
    const x=W*(portrait?.3:.56),y=H*(portrait?.76:.9),bw=U*(portrait?.38:.32),bh=U*.12;
    mark(()=>{c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-bw*.3,y-bh,x-bw*.6,y-bh*.5);c.lineTo(x-bw*.55,y+bh*.45);c.quadraticCurveTo(x-bw*.2,y+bh*.2,x,y+bh*.7);c.quadraticCurveTo(x+bw*.25,y+bh*.1,x+bw*.55,y+bh*.2);c.lineTo(x+bw*.65,y-bh*.55);c.quadraticCurveTo(x+bw*.3,y-bh*.8,x,y);c.closePath();},'#e6dbc3');
    stroke([[x,y],[x,y+bh*.65]],'#8e8068',.8);
    for(let i=0;i<4;i++){stroke([[x-bw*.46,y-bh*.25+i*bh*.14],[x-bw*.12,y-bh*.03+i*bh*.14]],'#9c917f66',.5);stroke([[x+bw*.1,y-bh*.1+i*bh*.14],[x+bw*.47,y-bh*.22+i*bh*.14]],'#9c917f66',.5);}
  }
  c.save();c.globalAlpha=.8;c.fillStyle=c.createPattern(paper,'repeat');c.fillRect(0,0,W,H);c.restore();
  c.fillStyle=`rgba(59,57,45,${(1-brightness/100)*.14})`;c.fillRect(0,0,W,H);
}
