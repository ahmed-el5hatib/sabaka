import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Net,runCli,TYPES,maskLen} from './engine.js';
import {exec as iosExec,prompt as iosPrompt,help as iosHelp,complete as iosComplete,banner as iosBanner} from './cli.js';
const isTouch=matchMedia('(pointer:coarse)').matches; const isMobile=()=>matchMedia('(max-width:900px)').matches;

const $=s=>document.querySelector(s);
let net=new Net(), selected=null, tool='select', cableFrom=null, selLink=null;
const COL={pc:0x37e1ff,switch:0x3ddc97,router:0xffa94d,server:0xa77bff};
const KCOL={arp:'#ffd24d',icmp:'#37e1ff',reply:'#3ddc97',dhcp:'#ff6fb5',dns:'#b58cff'};
const hist={}, logs=[];

// ---------- scene ----------
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:900px)').matches?1.5:2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x060a12); scene.fog=new THREE.Fog(0x060a12,26,60);
const camera=new THREE.PerspectiveCamera(42,1,0.1,200); camera.position.set(0,16,16);
const controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.maxPolarAngle=Math.PI*0.47; controls.minDistance=5; controls.maxDistance=40; controls.target.set(0,0,0);
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}; controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
scene.add(new THREE.HemisphereLight(0x8fb4ff,0x0a1020,0.9));
const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(8,16,6); sun.castShadow=true; sun.shadow.mapSize.set(matchMedia('(max-width:900px)').matches?1024:2048,matchMedia('(max-width:900px)').matches?1024:2048);
Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:50}); sun.shadow.bias=-0.0004; scene.add(sun);
const rim=new THREE.PointLight(0x37e1ff,40,30); rim.position.set(-8,5,-8); scene.add(rim);
const rim2=new THREE.PointLight(0xa77bff,30,30); rim2.position.set(9,4,-6); scene.add(rim2);
// ground
const gtex=(()=>{const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');const gr=g.createRadialGradient(512,512,40,512,512,512);gr.addColorStop(0,'#14233f');gr.addColorStop(1,'#060a12');g.fillStyle=gr;g.fillRect(0,0,1024,1024);g.strokeStyle='rgba(80,140,230,.22)';g.lineWidth=1.5;for(let i=0;i<=40;i++){const p=i*1024/40;g.beginPath();g.moveTo(p,0);g.lineTo(p,1024);g.stroke();g.beginPath();g.moveTo(0,p);g.lineTo(1024,p);g.stroke();}
 g.strokeStyle='rgba(80,160,255,.45)';for(let i=0;i<=8;i++){const p=i*128;g.beginPath();g.moveTo(p,0);g.lineTo(p,1024);g.stroke();g.beginPath();g.moveTo(0,p);g.lineTo(1024,p);g.stroke();}
 const t=new THREE.CanvasTexture(c);t.anisotropy=8;return t;})();
const ground=new THREE.Mesh(new THREE.CircleGeometry(24,96),new THREE.MeshStandardMaterial({map:gtex,roughness:.55,metalness:.4}));
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
const ringE=new THREE.Mesh(new THREE.RingGeometry(23.6,24,96),new THREE.MeshBasicMaterial({color:0x37e1ff,transparent:true,opacity:.5,side:THREE.DoubleSide})); ringE.rotation.x=-Math.PI/2; ringE.position.y=.01; scene.add(ringE);
// stars/dust
{const n=500,pos=new Float32Array(n*3);for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*60;pos[i*3+1]=Math.random()*18+1;pos[i*3+2]=(Math.random()-.5)*60;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0x6fa8ff,size:.06,transparent:true,opacity:.6})));}

const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.35,metalness:.6,...o});
const glow=(c,i=2)=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i,roughness:.3});
const box=(w,h,d,m,x=0,y=0,z=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);b.castShadow=b.receiveShadow=true;return b;};
function model(type){
  const g=new THREE.Group(), c=COL[type];
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.1,.12,48),M(0x16233f,{metalness:.5,roughness:.5})); base.position.y=.06; base.receiveShadow=true; g.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.035,12,64),glow(c,1.3)); ring.rotation.x=Math.PI/2; ring.position.y=.13; g.add(ring); g.userData.ring=ring;
  const dark=M(0x1a2236,{metalness:.7,roughness:.3}), steel=M(0x8da0c4,{metalness:.9,roughness:.25});
  if(type==='pc'){
    g.add(box(.9,.07,.55,steel,0,.18,.15)); g.add(box(.12,.4,.1,dark,0,.4,-.1));
    g.add(box(1.25,.8,.08,dark,0,.95,-.12));
    const sc=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.65),new THREE.MeshStandardMaterial({color:0x0a2a44,emissive:0x1b87c9,emissiveIntensity:1.1})); sc.position.set(0,.95,-.075); g.add(sc);
    g.add(box(.7,.04,.28,M(0x2a3550),0,.24,.55));
  } else if(type==='server'){
    for(let i=0;i<4;i++){ g.add(box(.95,.28,.8,dark,0,.3+i*.32,0)); g.add(box(.7,.05,.02,glow(c,1.6),-.05,.3+i*.32,.41)); const led=box(.07,.07,.02,glow(i%2?0x3ddc97:0xffd24d,3),.35,.3+i*.32,.41); g.add(led);}
    g.add(box(1.02,.05,.86,steel,0,1.62,0));
  } else if(type==='switch'){
    g.add(box(1.9,.3,.95,dark,0,.3,0)); g.add(box(1.92,.04,.97,steel,0,.47,0));
    for(let i=0;i<8;i++){ g.add(box(.17,.12,.04,M(0x050a14),-.78+i*.222,.3,.48)); g.add(box(.06,.04,.02,glow(0x3ddc97,3),-.78+i*.222,.4,.5)); }
  } else {
    const cy=new THREE.Mesh(new THREE.CylinderGeometry(.7,.78,.5,6),dark); cy.position.y=.4; cy.castShadow=true; g.add(cy);
    g.add(box(.9,.05,.9,glow(c,1.4),0,.67,0)); const cap=new THREE.Mesh(new THREE.CylinderGeometry(.55,.62,.08,6),steel);cap.position.y=.7;g.add(cap);
    for(const s of [-1,1]){ const an=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.9,8),steel); an.position.set(s*.5,1.15,-.3); an.rotation.z=-s*.2; g.add(an); const t=new THREE.Mesh(new THREE.SphereGeometry(.06),glow(c,3)); t.position.set(s*.5+(-s*.09),1.6,-.3); g.add(t);} 
    for(let k=0;k<4;k++){ const a=k*Math.PI/2; const ar=new THREE.Mesh(new THREE.ConeGeometry(.1,.25,3),glow(0xffffff,1.5)); ar.position.set(Math.cos(a)*.38,.74,Math.sin(a)*.38); ar.rotation.set(0,-a,-Math.PI/2); g.add(ar);}    
  }
  return g;
}
const nodes={}, linkMeshes={}, labels={};
function nodeFor(d){
  if(nodes[d.id]) return nodes[d.id];
  const g=model(d.type); g.userData.id=d.id; g.position.set(d.x,0,d.z); g.scale.setScalar(.01); g.userData.spawn=performance.now(); scene.add(g); nodes[d.id]=g;
  const l=document.createElement('div'); l.className='lbl'; const s=document.createElement('div'); s.className='lbl sub'; $('#labels').append(l,s); labels[d.id]=[l,s]; return g;
}
let stpInfo={roles:{}};
function syncScene(){
  try{ stpInfo=net.stp(); }catch(e){ stpInfo={roles:{}}; }
  for(const d of net.devices){ const g=nodeFor(d); g.position.x=d.x; g.position.z=d.z; }
  for(const id of Object.keys(nodes)) if(!net.dev(id)){ scene.remove(nodes[id]); labels[id].forEach(e=>e.remove()); delete nodes[id]; delete labels[id]; }
  for(const id of Object.keys(linkMeshes)) if(!net.links.find(l=>l.id===id)){ scene.remove(linkMeshes[id]); delete linkMeshes[id]; }
  for(const l of net.links){ let m=linkMeshes[l.id]; if(!m){ m=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1,10),glow(0x4aa8ff,1.4)); m.userData.link=l.id; scene.add(m); linkMeshes[l.id]=m; }
    const a=net.dev(l.a.dev),b=net.dev(l.b.dev); const A=new THREE.Vector3(a.x,.35,a.z),B=new THREE.Vector3(b.x,.35,b.z); m.position.copy(A).add(B).multiplyScalar(.5); m.scale.set(1,A.distanceTo(B),1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize()); const _s=stpInfo.roles; const blk=_s[l.a.dev+'|'+l.a.if]==='blocked'||_s[l.b.dev+'|'+l.b.if]==='blocked'; m.material.emissive.setHex(selLink===l.id?0xff5d73:(blk?0xffb020:0x2f8fe8)); m.scale.x=m.scale.z=blk?.55:1; }
  for(const d of net.devices){ const g=nodes[d.id]; g.userData.ring.material.emissiveIntensity=(selected===d.id||cableFrom===d.id)?4:1.1; g.userData.ring.material.color.setHex(cableFrom===d.id?0xffffff:COL[d.type]); g.userData.ring.material.emissive.setHex(cableFrom===d.id?0xffffff:COL[d.type]);
    const [l,s]=labels[d.id]; l.textContent=d.name; l.classList.toggle('sel',selected===d.id); const ip=net.primaryIp(d); s.textContent=d.type==='switch'?'':(ip||'no IP'); }
}
function resize(){ const r=$('#stage').getBoundingClientRect(); renderer.setSize(r.width,r.height,false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe($('#stage')); resize();

// ---------- picking / drag ----------
const ray=new THREE.Raycaster(), mouse=new THREE.Vector2(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function setMouse(e){const r=canvas.getBoundingClientRect();mouse.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mouse,camera);}
function pickDev(e){ setMouse(e); const hits=ray.intersectObjects(Object.values(nodes),true); for(const h of hits){ let o=h.object; while(o&&!o.userData.id) o=o.parent; if(o) return o.userData.id; } return null; }
function pickLink(e){ setMouse(e); const h=ray.intersectObjects(Object.values(linkMeshes),false)[0]; return h?h.object.userData.link:null; }
function groundPt(e){ setMouse(e); const v=new THREE.Vector3(); return ray.ray.intersectPlane(plane,v)?v:null; }
const snap=v=>Math.round(v*2)/2;
let drag=null, lp=null; const ptrs=new Set();
canvas.addEventListener('pointerdown',e=>{
  ptrs.add(e.pointerId); if(ptrs.size>1){ cancelDrag(); return; }
  if(e.button!==0) return; const id=pickDev(e);
  if(tool==='cable'){ if(!id) return; if(!cableFrom){cableFrom=id;toast('اختار الجهاز التاني');} else { const r=net.connect(cableFrom,id); if(r.err) toast(r.err,true); else {toast('تم التوصيل ✔');} cableFrom=null; changed(); } syncScene(); return; }
  if(id){ select(id); const p=groundPt(e); const d=net.dev(id); drag={id,dx:d.x-p.x,dz:d.z-p.z,moved:false,sx:e.clientX,sy:e.clientY}; controls.enabled=false; canvas.setPointerCapture(e.pointerId); clearTimeout(lp); if(e.pointerType==='touch') lp=setTimeout(()=>{ if(drag&&!drag.moved){ const i=drag.id; cancelDrag(); if(navigator.vibrate) navigator.vibrate(20); openTerm(i); } },550); }
  else { const l=pickLink(e); selLink=l; if(l){ select(null); toast(isTouch?'كابل متحدد — احذفه من تبويب الجهاز':'كابل متحدد — اضغط Del لحذفه'); if(isMobile()) setSheet('side'); } else select(null,true); syncScene(); }
});
canvas.addEventListener('pointermove',e=>{ if(!drag) return; if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<9) return; clearTimeout(lp); const p=groundPt(e); if(!p) return; const d=net.dev(drag.id); d.x=Math.max(-20,Math.min(20,snap(p.x+drag.dx))); d.z=Math.max(-20,Math.min(20,snap(p.z+drag.dz))); drag.moved=true; syncScene(); });
function cancelDrag(){ clearTimeout(lp); if(drag){ if(drag.moved) save(); drag=null; } controls.enabled=true; }
const endPtr=e=>{ ptrs.delete(e.pointerId); cancelDrag(); };
canvas.addEventListener('pointerup',endPtr); canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('dblclick',e=>{ const id=pickDev(e); if(id&&net.dev(id).type!=='switch'||id) openTerm(id); });
canvas.addEventListener('dragover',e=>e.preventDefault());
canvas.addEventListener('drop',e=>{ e.preventDefault(); const t=e.dataTransfer.getData('text/plain'); if(!TYPES[t]) return; const p=groundPt(e)||new THREE.Vector3(); addDev(t,snap(p.x),snap(p.z)); });
document.querySelectorAll('.dev').forEach(el=>{ el.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',el.dataset.type)); el.addEventListener('click',()=>{ const p=freeSpot(); addDev(el.dataset.type,p.x,p.z); if(isMobile()) setSheet(null); }); });
function freeSpot(){ const cx=snap(controls.target.x),cz=snap(controls.target.z); for(let r=0;r<12;r++){ for(let a=0;a<16;a++){ const ang=a/16*Math.PI*2; const x=snap(cx+Math.cos(ang)*r*1.5),z=snap(cz+Math.sin(ang)*r*1.5*.8); if(Math.abs(x)<19&&Math.abs(z)<19&&net.devices.every(d=>Math.hypot(d.x-x,d.z-z)>2.6)) return {x,z}; if(r===0) break; } } return {x:cx,z:cz}; }
function addDev(t,x,z){ const d=net.add(t,x,z); select(d.id); changed(); }
function setTool(t){ tool=t; cableFrom=null; $('#tCable').classList.toggle('on',t==='cable'); $('#tSelect').classList.toggle('on',t==='select'); canvas.style.cursor=t==='cable'?'crosshair':''; syncScene(); }
$('#tCable').onclick=()=>setTool(tool==='cable'?'select':'cable'); $('#tSelect').onclick=()=>setTool('select');
addEventListener('keydown',e=>{ if(/INPUT|SELECT/.test(e.target.tagName)) return; if(e.key==='Delete'||e.key==='Backspace'){ if(selected){net.removeDevice(selected);selected=null;changed();} else if(selLink){net.removeLink(selLink);selLink=null;changed();} } if(e.key==='c')setTool('cable'); if(e.key==='v'||e.key==='Escape')setTool('select'); });
function toast(t,err){ const el=$('#toast'); el.textContent=t; el.className='show'+(err?' err':''); clearTimeout(toast.t); toast.t=setTimeout(()=>el.className='',2200); }

// ---------- packet animation ----------
const runners=[]; let batches=[], batchActive=0, curTag=null;
const speed=()=>+$('#speed').value;
function playSteps(steps,failAt){
  // اجمع الخطوات المتتالية المتشابهة في batch واحد
  batches=[]; for(const s of steps){ const last=batches[batches.length-1]; if(last&&last[0].kind===s.kind&&last[0].label===s.label) last.push(s); else batches.push([s]); }
  batches.failAt=failAt; startNext();
}
function startNext(){
  const b=batches.shift(); if(!b){ if(batches.failAt){ flash(batches.failAt); batches.failAt=null;} return; }
  batchActive=b.length;
  for(const s of b){ const pts=s.path.filter(id=>nodes[id]).map(id=>new THREE.Vector3(nodes[id].position.x,.7,nodes[id].position.z)); if(pts.length<2){batchActive--;continue;}
    const col=KCOL[s.kind]||'#fff'; const m=new THREE.Mesh(new THREE.SphereGeometry(.2,16,16),new THREE.MeshBasicMaterial({color:col})); const halo=new THREE.Mesh(new THREE.SphereGeometry(.45,16,16),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.22})); m.add(halo); scene.add(m);
    const lb=document.createElement('div'); lb.className='pk'; lb.style.background=col; lb.textContent=s.label; $('#labels').append(lb);
    runners.push({m,pts,lb,t:0,seg:0}); }
  if(batchActive<=0) startNext();
}
function flash(d){ const g=nodes[d.id]; if(!g) return; g.userData.flash=performance.now(); toast('✖ '+(batches.reason||'الباكت وقع عند '+d.name),true); }
function fit(){ if(!net.devices.length) return; let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; net.devices.forEach(d=>{x0=Math.min(x0,d.x);x1=Math.max(x1,d.x);z0=Math.min(z0,d.z);z1=Math.max(z1,d.z);}); const cx=(x0+x1)/2,cz=(z0+z1)/2,ext=Math.max(x1-x0,(z1-z0)*1.6,6); resize(); const dist=Math.min(48,(ext*.8/Math.max(.55,camera.aspect*.55)+3)*(camera.aspect<.8?1.35:1)); controls.target.set(cx,0,cz); camera.position.set(cx,dist*.62,cz+dist*.78); }
let topv=false; $('#bView').onclick=()=>{ topv=!topv; fit(); if(topv){camera.position.y*=1.6;camera.position.z=controls.target.z+1;} };

// ---------- terminal ----------
let termDev=null; const hidx={}; const isIos=d=>d.type==='router'||d.type==='switch';
const HOSTCMDS=['ip set','ip dns','dhcp','ipconfig','ping','traceroute','nslookup','arp','help','clear','dhcp-server','dns-add'];
const curPrompt=d=>isIos(d)?iosPrompt(d):d.name+'>';
function openTerm(id){ const d=net.dev(id); if(!d) return; termDev=id; $('#term').classList.remove('hidden'); document.body.classList.add('term-open'); if(!hist[id]&&isIos(d)) iosBanner(d).forEach(l=>pushTerm(id,l,'mut')); updTermHead(); renderTerm(); fitTerm(); if(!isTouch) $('#termIn').focus(); }
function updTermHead(){ const d=net.dev(termDev); if(!d) return; $('#termName').textContent=d.name+' ('+d.type+')'; $('#prompt').textContent=curPrompt(d); }
function closeTerm(){ $('#term').classList.add('hidden'); document.body.classList.remove('term-open'); }
function renderTerm(){ const o=$('#termOut'); o.innerHTML=''; (hist[termDev]||[]).forEach(x=>{ const l=document.createElement('div'); l.className=x.c||''; l.textContent=x.t; o.append(l);}); o.scrollTop=1e9; }
function pushTerm(id,t,c){ (hist[id]=hist[id]||[]).push({t,c}); }
const errCls=l=>/^(%|✖)|failed|فشل/.test(l)?'err':'';
$('#termX').onclick=closeTerm;
function submit(d,v){ const p=curPrompt(d); pushTerm(d.id,p+' '+v,'cmd'); (cmdHist[d.id]=cmdHist[d.id]||[]).push(v); hidx[d.id]=null;
  const r=isIos(d)?iosExec(net,d,v):runCli(net,d,v); r.out.forEach(l=>pushTerm(d.id,l,errCls(l))); updTermHead(); renderTerm(); afterCli(d,r); }
const cmdHist={};
function termHelp(d,v){ v=v.replace(/\?+$/,'').trimEnd(); pushTerm(d.id,curPrompt(d)+' '+v+'?','cmd'); if(isIos(d)) iosHelp(d,v).forEach(l=>pushTerm(d.id,l,'')); else runCli(net,d,'help').out.forEach(l=>pushTerm(d.id,l,'')); renderTerm(); }
function termTab(d,inp){ if(isIos(d)){ const r=iosComplete(d,inp.value); if(r.options.length>1){ pushTerm(d.id,curPrompt(d)+' '+inp.value,'cmd'); pushTerm(d.id,r.options.join('   '),'mut'); renderTerm(); } inp.value=r.line; } else { const v=inp.value; const m=HOSTCMDS.filter(c=>c.startsWith(v)); if(m.length===1) inp.value=m[0]+' '; else if(m.length>1) { pushTerm(d.id,m.join('   '),'mut'); renderTerm(); } } }
function termKey(k){ const inp=$('#termIn'); const d=net.dev(termDev); if(!d) return;
  if(k==='tab') termTab(d,inp); else if(k==='help') termHelp(d,inp.value); else if(k==='ctrlz'){ if(isIos(d)){ pushTerm(d.id,curPrompt(d)+' ^Z','cmd'); const r=iosExec(net,d,'end'); updTermHead(); renderTerm(); afterCli(d,r); } inp.value=''; }
  else if(k==='up'||k==='down'){ const h=cmdHist[d.id]||[]; if(!h.length) return; let ix=hidx[d.id]; if(ix==null) ix=h.length; ix=k==='up'?Math.max(0,ix-1):Math.min(h.length,ix+1); hidx[d.id]=ix; inp.value=h[ix]||''; }
  if(!isTouch) inp.focus(); }
$('#termKeys').addEventListener('click',e=>{ const b=e.target.closest('[data-k]'); if(b) termKey(b.dataset.k); });
$('#termIn').addEventListener('keydown',e=>{ const d=net.dev(termDev); if(!d) return;
  if(e.key==='Enter'){ const v=e.target.value; e.target.value=''; if(!v.trim()) { pushTerm(d.id,curPrompt(d),'cmd'); renderTerm(); return; } if(v.trim()==='clear'){ hist[termDev]=[]; renderTerm(); return; } submit(d,v); }
  else if(e.key==='Tab'){ e.preventDefault(); termKey('tab'); } else if(e.key==='?'){ e.preventDefault(); termKey('help'); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); termKey('up'); } else if(e.key==='ArrowDown'){ e.preventDefault(); termKey('down'); }
  else if(e.ctrlKey&&(e.key==='z'||e.key==='Z')){ e.preventDefault(); termKey('ctrlz'); } });
function fitTerm(){ const t=$('#term'); if(!document.body.classList.contains('term-open')||!isMobile()){ t.style.height=''; t.style.top=''; return; } const vv=window.visualViewport; if(vv){ t.style.height=vv.height+'px'; t.style.top=vv.offsetTop+'px'; } }
if(window.visualViewport){ visualViewport.addEventListener('resize',()=>{ fitTerm(); const o=$('#termOut'); o.scrollTop=1e9; }); visualViewport.addEventListener('scroll',fitTerm); }
function afterCli(d,r){ if(r.changed) updTermHead(); if(r.steps&&r.steps.length){ if(r.r&&r.r.reason) batches.reason=r.r.reason; playSteps(r.steps,r.r&&!r.r.ok?r.r.at:null); logSteps(d,r); }
  if(r.tag) achieved[r.tag]=true; changed(true); renderChal(true); }
function logSteps(d,r){ const seen=[]; for(const s of r.steps){ logs.unshift({k:s.kind,t:`${s.label}: ${s.path.map(i=>net.dev(i)?.name||'?').join(' → ')}`}); } logs.length=Math.min(logs.length,80); renderLog(); }
const achieved={};

// ---------- inspector ----------
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function select(id,keepLink){ selected=id; if(!keepLink&&id) selLink=null; if(id) showTab('insp'); if(id&&isMobile()&&!isTouch){} renderInsp(); syncScene(); }
function renderInsp(){
  const el=$('#insp'); const d=selected&&net.dev(selected);
  if(!d&&selLink){ el.innerHTML=`<div class="card"><h5>كابل متحدد</h5><button class="btn2 danger" data-act="dellink">احذف الكابل</button></div>`; return; }
  if(!d){ el.innerHTML=`<div class="card"><h5>مرحباً في Sabaka 3D</h5><p class="mut">ابني الشبكة بنفسك: اسحب أجهزة من القايمة، وصلها بالكابل، وظبط الـ IPs. دوس مرتين على أي جهاز تفتح الـ CLI.</p><p class="mut">جرب زرار «مثال» فوق لشبكة جاهزة بـ router وVLAN وسيرفر.</p></div><div class="card"><h5>اختصارات</h5><p class="mut">اسحب بالزر الأيسر للدوران · الأيمن للتحريك · العجلة للزووم<br>C كابل · V تحديد · Del حذف</p></div>`; return; }
  const h=[`<div class="card"><h5>${esc(d.type.toUpperCase())}</h5><div class="row two"><span>الاسم</span><input class="f" data-k="name" value="${esc(d.name)}"></div><button class="btn2" data-act="term">افتح الـ CLI</button></div>`];
  if(d.type==='switch'){ const s=net.stp(); const ro=d.ifaces.filter(i=>s.roles[d.id+'|'+i.name]).map(i=>{const r=s.roles[d.id+'|'+i.name]; return `<div class="row two"><span>${i.name}</span><span style="color:${r==='blocked'?'#ffb020':r==='root'?'#4ade80':'#7dd3fc'}">${r==='root'?'Root FWD':r==='blocked'?'Blocked (loop)':'Designated FWD'}</span></div>`;}).join(''); h.push(`<div class="card"><h5>STP</h5><div class="row two"><span>Root Bridge</span><b>${s.root?esc(s.root.name)+(s.root===d?' (هذا الجهاز)':''):'-'}</b></div><div class="row two"><span>Priority</span><input class="f" data-k="stpPrio" value="${d.stpPrio??32768}"></div>${ro}</div>`); }
  if(d.type==='pc'||d.type==='server'){ const i=d.ifaces[0];
    h.push(`<div class="card"><h5>الشبكة (${i.name})</h5><div class="row two"><span>IP</span><input class="f" data-if="${i.name}" data-k="ip" value="${esc(i.ip)}" placeholder="192.168.1.10"></div><div class="row two"><span>Mask</span><input class="f" data-if="${i.name}" data-k="mask" value="${esc(i.mask)}" placeholder="255.255.255.0"></div><div class="row two"><span>Gateway</span><input class="f" data-k="gateway" value="${esc(d.gateway)}"></div><div class="row two"><span>DNS</span><input class="f" data-k="dns" value="${esc(d.dns)}"></div><button class="btn2" data-act="dhcp">احصل على IP (DHCP)</button><div class="mut">MAC: ${i.mac}</div></div>`);
    if(d.type==='server'){ const p=d.dhcp; h.push(`<div class="card"><h5>DHCP Server</h5><div class="row dhcp"><span>شغال</span><select class="f" data-dhcp="on"><option value="0">لا</option><option value="1" ${p.on?'selected':''}>نعم</option></select></div><div class="row dhcp"><span>أول IP</span><input class="f" data-dhcp="start" value="${esc(p.start)}"></div><div class="row dhcp"><span>العدد</span><input class="f" data-dhcp="count" value="${p.count}"></div><div class="row dhcp"><span>Gateway</span><input class="f" data-dhcp="gw" value="${esc(p.gw)}"></div><div class="row dhcp"><span>DNS</span><input class="f" data-dhcp="dns" value="${esc(p.dns)}"></div></div>
      <div class="card"><h5>DNS Records</h5>${Object.entries(d.dnsRecords).map(([n,v])=>`<div class="row two"><span>${esc(n)}</span><span class="mut" dir="ltr">${v} <a href="#" data-delrec="${esc(n)}">✕</a></span></div>`).join('')||'<div class="mut">مفيش سجلات</div>'}<div class="row two"><input class="f" id="dnN" placeholder="web.lab"><input class="f" id="dnI" placeholder="10.0.0.5"></div><button class="btn2" data-act="dnsadd">+ أضف</button></div>`); }
  }
  if(d.type==='router'){
    h.push(`<div class="card"><h5>البورتات</h5>${d.ifaces.map(i=>`<div class="row"><span>${i.name}<br><span class="pill ${i.link?'up':''}">${i.link?'up':'down'}</span></span><input class="f" data-if="${i.name}" data-k="ip" value="${esc(i.ip)}" placeholder="IP" ${i.subs&&i.subs.length?'disabled':''}><input class="f" data-if="${i.name}" data-k="mask" value="${esc(i.mask)}" placeholder="mask" ${i.subs&&i.subs.length?'disabled':''}></div>`).join('')}</div>
    <div class="card"><h5>Sub-interfaces (router-on-a-stick)</h5>${net.l3(d).filter(x=>x.phys).map(x=>`<div class="row two"><span dir="ltr">${x.name}</span><span class="mut" dir="ltr">${x.ip}/${maskLen(x.mask)} <a href="#" data-delsub="${x.phys.name}|${x.vlan}">✕</a></span></div>`).join('')||'<div class="mut">مفيش</div>'}<div class="row"><select class="f" id="sP">${d.ifaces.map(i=>`<option>${i.name}</option>`).join('')}</select><input class="f" id="sV" placeholder="VLAN"><input class="f" id="sI" placeholder="IP"></div><div class="row two"><span>Mask</span><input class="f" id="sM" value="255.255.255.0"></div><button class="btn2" data-act="subadd">+ أضف sub-interface</button></div>
    <div class="card"><h5>Static Routes</h5>${d.routes.map((r,k)=>`<div class="row two"><span dir="ltr">${r.net}/${maskLen(r.mask)}</span><span class="mut" dir="ltr">via ${r.nh} <a href="#" data-delroute="${k}">✕</a></span></div>`).join('')||'<div class="mut">مفيش</div>'}<div class="row"><input class="f" id="rN" placeholder="net"><input class="f" id="rM" placeholder="mask"><input class="f" id="rH" placeholder="next-hop"></div><button class="btn2" data-act="routeadd">+ أضف route</button></div>`);
  }
  if(d.type==='switch'){
    h.push(`<div class="card"><h5>البورتات / VLAN</h5>${d.ifaces.map(i=>`<div class="row"><span>${i.name}<br><span class="pill ${i.link?'up':''}">${i.link?'up':'down'}</span></span><select class="f" data-if="${i.name}" data-k="mode"><option value="access">access</option><option value="trunk" ${i.mode==='trunk'?'selected':''}>trunk</option></select>${i.mode==='trunk'?`<input class="f" data-if="${i.name}" data-k="allowed" value="${esc(i.allowed||'')}" placeholder="كل الـ VLANs">`:`<input class="f" data-if="${i.name}" data-k="vlan" value="${i.vlan}">`}</div>`).join('')}</div>`);
  }
  h.push(`<button class="btn2 danger" data-act="del">احذف الجهاز</button>`); el.innerHTML=h.join('');
}
$('#insp').addEventListener('change',e=>{ const t=e.target; const d=net.dev(selected); if(!d) return;
  if(t.dataset.k==='name'){ d.name=t.value||d.name; }
  else if(t.dataset.dhcp){ const k=t.dataset.dhcp; d.dhcp[k]=k==='on'?t.value==='1':k==='count'?+t.value||1:t.value.trim(); }
  else if(t.dataset.if){ const i=net.iface(d,t.dataset.if); const k=t.dataset.k; if(k==='vlan') i.vlan=+t.value||1; else i[k]=t.value.trim(); if(k==='mode') renderInsp(); d.dhcpClient=false; }
  else if(t.dataset.k==='stpPrio'){ const p=parseInt(t.value,10); if(p>=0&&p<=61440&&p%4096===0) d.stpPrio=p; else toast('الـ priority لازم يكون من مضاعفات 4096 (4096, 8192, ... 61440)',true); }
  else if(t.dataset.k){ d[t.dataset.k]=t.value.trim(); }
  changed(); });
$('#insp').addEventListener('click',e=>{ const t=e.target.closest('[data-act],[data-delrec],[data-delroute],[data-delsub]'); if(!t) return; e.preventDefault(); const d=net.dev(selected); if(!d&&t.dataset.act==='dellink'&&selLink){ net.removeLink(selLink); selLink=null; changed(); return; } if(!d) return;
  if(t.dataset.delrec){ delete d.dnsRecords[t.dataset.delrec]; changed(); return; }
  if(t.dataset.delsub){ const [pn,v]=t.dataset.delsub.split('|'); const i=net.iface(d,pn); i.subs=i.subs.filter(x=>x.vlan!==+v); changed(); return; }
  if(t.dataset.delroute){ d.routes.splice(+t.dataset.delroute,1); changed(); return; }
  const a=t.dataset.act;
  if(a==='term') openTerm(d.id);
  else if(a==='del'){ net.removeDevice(d.id); selected=null; changed(); }
  else if(a==='dhcp'){ openTerm(d.id); runTerm(d,'dhcp'); }
  else if(a==='dnsadd'){ const n=$('#dnN').value.trim().toLowerCase(), i=$('#dnI').value.trim(); if(n&&i){ d.dnsRecords[n]=i; changed(); } }
  else if(a==='subadd'){ const r=runCli(net,d,`ip sub ${$('#sP').value} ${$('#sV').value} ${$('#sI').value} ${$('#sM').value}`); if(r.out.some(x=>x.startsWith('✖'))) toast(r.out[0],true); else changed(); }
  else if(a==='routeadd'){ const r=runCli(net,d,`route add ${$('#rN').value} ${$('#rM').value} ${$('#rH').value}`); if(r.out.some(x=>x.startsWith('✖'))) toast(r.out[0],true); else changed(); }
});
function runTerm(d,cmd){ if(termDev!==d.id) openTerm(d.id); submit(d,cmd); }

// ---------- mobile sheets ----------
function setSheet(n){ document.body.classList.toggle('sheet-pal',n==='pal'); document.body.classList.toggle('sheet-side',n==='side'); document.querySelectorAll('#mnav [data-m]').forEach(b=>b.classList.toggle('on',(n==='pal'&&b.dataset.m==='pal')||(n==='side'&&['insp','chal'].includes(b.dataset.m)&&b.dataset.m===curTab))); }
let curTab='insp';
$('#mnav').addEventListener('click',e=>{ const b=e.target.closest('[data-m]'); if(!b) return; const m=b.dataset.m; const open=document.body.classList.contains('sheet-pal')?'pal':document.body.classList.contains('sheet-side')?'side':null;
  if(m==='pal') setSheet(open==='pal'?null:'pal');
  else if(m==='cable'){ setTool(tool==='cable'?'select':'cable'); b.classList.toggle('on',tool==='cable'); setSheet(null); if(tool==='cable') toast('اختار جهاز وبعدين الجهاز التاني'); }
  else if(m==='cli'){ const id=selected||net.devices[0]?.id; if(!selected) toast('اخترت أول جهاز. اضغط على جهاز عشان تفتح الـ CLI بتاعه'); if(id){ select(id); openTerm(id); setSheet(null); } }
  else if(m==='insp'||m==='chal'){ showTab(m); setSheet(open==='side'&&curTab===m?null:'side'); }
  else if(m==='more'){ document.body.classList.toggle('menu-open'); } });

function showTab(n){ curTab=n==='log'?'chal':n; document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===n)); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('hidden',t.id!==n)); }
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function renderLog(){ $('#log').innerHTML=logs.length?logs.map(l=>`<div class="logrow"><span class="k" style="background:${KCOL[l.k]||'#fff'}"></span>${esc(l.t)}</div>`).join(''):'<p class="mut">ابعت ping أو dhcp وهتلاقي الباكتات هنا خطوة بخطوة.</p>'; }
const hosts=()=>net.devices.filter(d=>d.type==='pc'||d.type==='server');
function pairs(){ const hs=hosts(),o=[]; for(let i=0;i<hs.length;i++)for(let j=i+1;j<hs.length;j++)o.push([hs[i],hs[j]]); return o; }
const quiet=(a,b)=>{ const ip=net.primaryIp(b); if(!ip) return null; return net.ping(a,ip); };
const CH=[
 {t:'أول ping',d:'وصّل جهازين PC بـ Switch، ادّيهم IPs في نفس الـ subnet، وخلّي الـ ping ينجح.',f:()=>pairs().some(([a,b])=>net.links.length&&[a,b].every(h=>net.primaryIp(h))&&quiet(a,b)?.ok&&!quiet(a,b).hops.some(h=>h.type==='router')&&quiet(a,b).steps.some(s=>s.path.some(i=>net.dev(i)?.type==='switch')))},
 {t:'Subnetting بـ Router',d:'اعمل شبكتين مختلفتين وصلهم بـ Router (gateway صح)، وخلي PC من كل شبكة يعملوا ping لبعض.',f:()=>pairs().some(([a,b])=>{const r=quiet(a,b);return r&&r.ok&&r.hops.some(h=>h.type==='router');})},
 {t:'DHCP',d:'شغّل DHCP server وخلي PC ياخد IP لوحده.',f:()=>hosts().some(h=>h.type==='pc'&&h.dhcpClient&&h.ifaces[0].ip)},
 {t:'DNS',d:'سجّل اسم في DNS server وخلي PC يعمل ping بالاسم.',f:()=>hosts().some(h=>h.dns&&net.devices.some(s=>Object.keys(s.dnsRecords).some(n=>net.ping(h,n).ok)))},
 {t:'VLAN',d:'قسّم switch لـ VLAN مختلفتين: جهازين في VLAN واحدة يشوفوا بعض (ping ينجح) وجهاز من VLAN تانية ميعرفش يوصل.',f:()=>{const ps=pairs();return ps.some(([a,b])=>quiet(a,b)?.ok&&net.devices.some(s=>s.type==='switch'&&s.ifaces.some(i=>i.vlan!==1)))&&ps.some(([a,b])=>net.primaryIp(a)&&net.primaryIp(b)&&quiet(a,b)&&quiet(a,b).type==='l2'||quiet(a,b)?.reason?.includes('VLAN'));}},
 {t:'Static Routing (راوترين)',d:'وصّل راوترين ورا بعض واعمل static routes بحيث PC على الطرفين يوصلوا لبعض (3 subnets أو أكتر).',f:()=>pairs().some(([a,b])=>{const r=quiet(a,b);return r&&r.ok&&r.hops.filter(h=>h.type==='router').length>=2;})},
 {t:'Traceroute',d:'شغّل traceroute من PC لجهاز بعيد عن طريق router وشوف الـ hops.',f:()=>!!achieved['trace-ok']&&net.devices.some(d=>d.type==='router')},

 {t:'Router-on-a-stick',d:'اعمل VLAN 10 و20 على switch واحد، خلّي البورت ناحية الراوتر trunk، واعمل sub-interface لكل VLAN على الراوتر (ip sub). بعدين PC من VLAN 10 يعمل ping لـ PC في VLAN 20.',f:()=>net.devices.some(r=>r.type==='router'&&r.ifaces.some(i=>(i.subs||[]).length>=2))&&pairs().some(([a,b])=>{const r=quiet(a,b);return r&&r.ok&&r.hops.some(h=>h.type==='router')&&a.ifaces[0].link&&net.peer(a,a.ifaces[0]).dev===net.peer(b,b.ifaces[0]).dev;})},

 {t:'STP: Root Bridge',d:'وصّل 3 switches في مثلث (لفّة). خلّي switch معين هو الـ Root بتقليل الـ priority (spanning-tree vlan 1 priority 4096) وشوف STP بيقفل لينك واحد (برتقالي) والـ ping لسه شغال.',f:()=>net.devices.some(d=>d.type==='switch'&&(d.stpPrio??32768)<32768&&net.stp().root===d)&&Object.values(net.stp().roles).includes('blocked')&&pairs().some(([x,y])=>quiet(x,y)?.ok)},
 {t:'RIP',d:'وصّل 3 راوترات ورا بعض مع PC على الطرفين (زر RIP بيجهزهم). شغّل router rip على كل راوتر (network ...) من غير ولا static route، وخلّي الـ ping بين الـ PCs ينجح.',f:()=>net.devices.filter(d=>d.type==='router'&&d.rip&&d.rip.on&&!(d.routes||[]).length).length>=3&&pairs().some(([x,y])=>{const r=quiet(x,y);return r&&r.ok&&r.hops.filter(h=>h.type==='router').length>=3;})},
 {t:'ACL',d:'زر ACL بيجهز راوتر وPCين وسيرفر. اكتب access-list يمنع PC1 (192.168.1.10) من السيرفر، وطبّقها بـ ip access-group على بورت الراوتر، وPC2 يفضل يوصل للسيرفر.',f:()=>net.devices.some(r=>r.type==='router'&&Object.values(r.acls||{}).some(x=>x.rules.some(q=>q.act==='deny')))&&net.devices.some(s=>s.type==='server'&&net.primaryIp(s)&&hosts().filter(h=>h.type==='pc'&&net.primaryIp(h)).some(h=>!quiet(h,s)?.ok)&&hosts().filter(h=>h.type==='pc'&&net.primaryIp(h)).some(h=>quiet(h,s)?.ok))},
 {t:'CLI بأسلوب IOS',d:'من الـ CLI بتاع الراوتر: اكتب enable ثم configure terminal، افتح interface، ادي IP بـ ip address، وبعدين اعمل ping من PC لعنوان الراوتر ويرد.',f:()=>!!achieved['ios-ip']&&!!achieved['ping-ok']},
];
let chDone=new Set();
function renderChal(ev){ if(ev) CH.forEach((c,i)=>{ let ok=false; try{ok=!!c.f();}catch(e){} if(ok) chDone.add(i);}); localStorage.setItem('sabaka-ch',JSON.stringify([...chDone]));
  $('#chalCount').textContent=chDone.size+'/'+CH.length; $('#chal').innerHTML=CH.map((c,i)=>`<div class="ch ${chDone.has(i)?'ok':''}"><span class="n">${chDone.has(i)?'✓':i+1}</span><div><b>${c.t}</b><small>${c.d}</small></div></div>`).join('')+'<p class="mut">التحدي بيتصحح لوحده بحسب حالة الشبكة الحالية.</p>'; }

// ---------- persistence ----------
function save(){ try{localStorage.setItem('sabaka',JSON.stringify(net.toJSON()));}catch(e){} }
function changed(light){ syncScene(); if(!light||true) renderInsp(); renderChal(); save(); }
$('#bSave').onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(net.toJSON(),null,1)],{type:'application/json'})); a.download='topology.sabaka.json'; a.click(); };
$('#bLoad').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ loadNet(JSON.parse(await f.text())); toast('تم فتح الـ topology'); }catch(x){ toast('ملف غير صالح',true);} };
$('#bClear').onclick=()=>{ if(!net.devices.length||confirm('تمسح كل حاجة؟')){ loadNet(new Net().toJSON()); } };
function loadNet(o){ chDone=new Set(); for(const id of Object.keys(nodes)){ scene.remove(nodes[id]); labels[id].forEach(e=>e.remove()); delete nodes[id]; delete labels[id]; } for(const id of Object.keys(linkMeshes)){ scene.remove(linkMeshes[id]); delete linkMeshes[id]; } net=Net.from(o); setTimeout(fit,0); selected=null; selLink=null; for(const k in hist) delete hist[k]; $('#term').classList.add('hidden'); changed(); }
$('#bVlan').onclick=()=>{ loadNet(vlanExample()); toast('مثال: VLAN + router-on-a-stick'); };
$('#bExample').onclick=()=>{ loadNet(example()); toast('مثال: شبكتين + Router + DHCP/DNS'); };
$('#bStp').onclick=()=>{ loadNet(stpExample()); toast('مثال: 3 switches في لفّة — STP بيقفل لينك'); };
function stpExample(){
  const n=new Net(); const s=[n.add('switch',-6,0,'SW1'),n.add('switch',6,0,'SW2'),n.add('switch',0,-5,'SW3')];
  const p=[n.add('pc',-8,4,'PC1'),n.add('pc',8,4,'PC2')];
  n.connect(s[0].id,s[1].id); n.connect(s[1].id,s[2].id); n.connect(s[2].id,s[0].id); n.connect(p[0].id,s[0].id); n.connect(p[1].id,s[1].id);
  const R=(d,l)=>runCli(n,d,l); R(p[0],'ip set 10.0.0.1 255.255.255.0'); R(p[1],'ip set 10.0.0.2 255.255.255.0'); return n.toJSON(); }
$('#bRip').onclick=()=>{ loadNet(ripExample()); toast('مثال: 3 راوترات بيتعلموا الـ routes لوحدهم بـ RIP'); };
function ripExample(){
  const n=new Net(); const r=[n.add('router',-8,0,'R1'),n.add('router',0,-3,'R2'),n.add('router',8,0,'R3')];
  const a=n.add('pc',-10,4,'PC1'), b=n.add('pc',10,4,'PC3'); n.connect(r[0].id,r[1].id); n.connect(r[1].id,r[2].id); n.connect(a.id,r[0].id); n.connect(b.id,r[2].id);
  const X=(d,l)=>iosExec(n,d,l); const cfg=(d,ls)=>{ X(d,'enable'); X(d,'conf t'); ls.forEach(l=>X(d,l)); X(d,'end'); };
  cfg(r[0],['int g0/0','ip address 10.0.12.1 255.255.255.0','no shutdown','int g0/1','ip address 192.168.1.1 255.255.255.0','no shutdown']);
  cfg(r[1],['int g0/0','ip address 10.0.12.2 255.255.255.0','no shutdown','int g0/1','ip address 10.0.23.2 255.255.255.0','no shutdown']);
  cfg(r[2],['int g0/0','ip address 10.0.23.3 255.255.255.0','no shutdown','int g0/1','ip address 192.168.3.1 255.255.255.0','no shutdown']);
  const R=(d,l)=>runCli(n,d,l); R(a,'ip set 192.168.1.10 255.255.255.0 192.168.1.1'); R(b,'ip set 192.168.3.10 255.255.255.0 192.168.3.1'); return n.toJSON(); }
$('#bAcl').onclick=()=>{ loadNet(aclExample()); toast('مثال: ACL — امنع PC1 من السيرفر وسيب PC2'); };
function aclExample(){
  const n=new Net(); const r=n.add('router',0,-2,'R1'), s1=n.add('switch',-5,1,'SW1'), s2=n.add('switch',5,1,'SW2');
  const a=n.add('pc',-8,5,'PC1'), b=n.add('pc',-3,5,'PC2'), s=n.add('server',8,5,'SRV1');
  n.connect(r.id,s1.id); n.connect(r.id,s2.id); n.connect(a.id,s1.id); n.connect(b.id,s1.id); n.connect(s.id,s2.id);
  const X=(d,l)=>iosExec(n,d,l); ['enable','conf t','int g0/0','ip address 192.168.1.1 255.255.255.0','no shutdown','int g0/1','ip address 192.168.2.1 255.255.255.0','no shutdown','end'].forEach(l=>X(r,l));
  const R=(d,l)=>runCli(n,d,l); R(a,'ip set 192.168.1.10 255.255.255.0 192.168.1.1'); R(b,'ip set 192.168.1.11 255.255.255.0 192.168.1.1'); R(s,'ip set 192.168.2.5 255.255.255.0 192.168.2.1'); return n.toJSON(); }
function vlanExample(){
  const n=new Net(); const sw=n.add('switch',0,2,'SW1'), r=n.add('router',0,-3,'R1');
  const p=[n.add('pc',-6,4,'PC1'),n.add('pc',-3,5,'PC2'),n.add('pc',3,5,'PC3'),n.add('pc',6,4,'PC4')];
  n.connect(r.id,sw.id); p.forEach(x=>n.connect(x.id,sw.id)); const R=(d,l)=>runCli(n,d,l);
  R(sw,'vlan fa0/2 10');R(sw,'vlan fa0/3 10');R(sw,'vlan fa0/4 20');R(sw,'vlan fa0/5 20');R(sw,'trunk fa0/1');
  R(r,'ip sub g0/0 10 192.168.10.1 255.255.255.0');R(r,'ip sub g0/0 20 192.168.20.1 255.255.255.0');
  R(p[0],'ip set 192.168.10.11 255.255.255.0 192.168.10.1');R(p[1],'ip set 192.168.10.12 255.255.255.0 192.168.10.1');
  R(p[2],'ip set 192.168.20.11 255.255.255.0 192.168.20.1');R(p[3],'ip set 192.168.20.12 255.255.255.0 192.168.20.1'); return n.toJSON(); }
function example(){
  const n=new Net(); const sw1=n.add('switch',-5,0,'SW1'), r=n.add('router',0,-1,'R1'), sw2=n.add('switch',5,0,'SW2');
  const a=n.add('pc',-8,3,'PC1'), b=n.add('pc',-5,4,'PC2'), c=n.add('pc',-2,3,'PC3'), s=n.add('server',8,3,'SRV1'), d=n.add('pc',5,4,'PC4');
  [[a,sw1],[b,sw1],[c,sw1],[sw1,r],[r,sw2],[s,sw2],[d,sw2]].forEach(([x,y])=>n.connect(x.id,y.id));
  const R=(dv,l)=>runCli(n,dv,l);
  R(r,'ip set g0/0 192.168.1.1 255.255.255.0'); R(r,'ip set g0/1 192.168.2.1 255.255.255.0');
  R(a,'ip set 192.168.1.10 255.255.255.0 192.168.1.1'); R(b,'ip set 192.168.1.11 255.255.255.0 192.168.1.1');
  R(s,'ip set 192.168.2.5 255.255.255.0 192.168.2.1'); R(s,'dns-add web.lab 192.168.2.5'); R(s,'dhcp-server 192.168.2.100 20 192.168.2.1 192.168.2.5');
  a.dns='192.168.2.5'; return n.toJSON();
}
// ---------- main loop ----------
const clock=new THREE.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),.05), now=performance.now();
  controls.update();
  for(const id in nodes){ const g=nodes[id]; const age=(now-g.userData.spawn)/400; const s=age>=1?1:1-Math.pow(1-Math.max(age,.01),3)*-1+0; g.scale.setScalar(age>=1?1:Math.max(.01,1-Math.pow(1-age,3)*(1-1)) * Math.min(1,age*1.2+.01));
    if(g.userData.flash){ const k=(now-g.userData.flash)/1000; if(k>1.2) g.userData.flash=0; else { g.userData.ring.material.color.setHex(Math.floor(k*6)%2?0xff5d73:0xffffff); g.userData.ring.material.emissive.setHex(Math.floor(k*6)%2?0xff5d73:0xffffff); g.userData.ring.material.emissiveIntensity=6; } } 
    g.position.y=selected===id?.05+Math.sin(now/300)*.03:0; }
  const v=new THREE.Vector3(), r=canvas.getBoundingClientRect();
  const proj=(p,off)=>{ v.copy(p); v.y+=off; v.project(camera); return [(v.x*.5+.5)*r.width,(-v.y*.5+.5)*r.height]; };
  for(const d of net.devices){ const g=nodes[d.id]; const [l,s]=labels[d.id]; const [x,y]=proj(g.position,2.0); l.style.left=x+'px'; l.style.top=(y-8)+'px'; const [x2,y2]=proj(g.position,-.05); s.style.left=x2+'px'; s.style.top=(y2+2)+'px'; }
  for(let i=runners.length-1;i>=0;i--){ const q=runners[i]; const a=q.pts[q.seg],b=q.pts[q.seg+1]; const len=a.distanceTo(b); q.t+=dt*speed()*6/Math.max(len,.1); 
    if(q.t>=1){ q.seg++; q.t=0; if(q.seg>=q.pts.length-1){ scene.remove(q.m); q.lb.remove(); runners.splice(i,1); if(--batchActive<=0) startNext(); continue; } }
    const A=q.pts[q.seg],B=q.pts[q.seg+1]; q.m.position.lerpVectors(A,B,q.t); q.m.position.y+=Math.sin(q.t*Math.PI)*.15; const [x,y]=proj(q.m.position,0); q.lb.style.left=x+'px'; q.lb.style.top=y+'px'; q.m.scale.setScalar(1+.15*Math.sin(now/90)); }
  renderer.render(scene,camera); requestAnimationFrame(frame);
}
// init
try{ const s=localStorage.getItem('sabaka'); net=s?Net.from(JSON.parse(s)):Net.from(example()); }catch(e){ net=Net.from(example()); }
if(!net.devices.length) net=Net.from(example());
window.__net=()=>net; window.__app={aclExample,ripExample,stpExample,openTerm,runTerm,select,example,loadNet,vlanExample};
syncScene(); renderInsp(); renderChal(); renderLog(); fit(); frame();
