import {VIDEOS} from './config.js';
import {LESSONS} from './lessons.js';
const $=s=>document.querySelector(s);
const ip2n=s=>{const p=s.trim().split('.');if(p.length!==4||p.some(x=>!/^\d{1,3}$/.test(x)||+x>255))return null;return((+p[0]<<24)>>>0)+(+p[1]<<16)+(+p[2]<<8)+(+p[3]);};
const n2ip=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const mask=l=>l===0?0:(0xFFFFFFFF<<(32-l))>>>0;
const bits=(n,l)=>[0,1,2,3].map(o=>{let s='';for(let i=0;i<8;i++){const b=o*8+i;s+=`<span class="${b<l?'n':'h'}">${(n>>>(31-b))&1}</span>`;}return `<span class="oct">${s}</span>`;}).join('.');
function calc(root){
  root.innerHTML=`<div class="calc"><div class="row"><label>IP: <input type="text" id="cIp" value="192.168.1.77"></label><label class="ltr">/<b id="cL">26</b></label></div>
  <div class="row"><input type="range" id="cR" min="8" max="30" value="26"></div><div class="bar" id="cBar"></div>
  <div class="bits" id="cBits"></div><div style="font-size:13px;color:var(--mut)">الأزرق = Network bits، البرتقالي = Host bits</div><dl id="cOut"></dl></div>`;
  const upd=()=>{const l=+$('#cR').value;$('#cL').textContent=l;const n=ip2n($('#cIp').value);
    if(n===null){$('#cOut').innerHTML='<dt>خطأ</dt><dd>IP غير صحيح</dd>';return;}
    const m=mask(l),net=(n&m)>>>0,bc=(net|(~m>>>0))>>>0,hosts=Math.max(0,2**(32-l)-2);
    $('#cBar').innerHTML=`<i class="n" style="width:${l/32*100}%"></i><i class="h" style="width:${(32-l)/32*100}%"></i>`;
    $('#cBits').innerHTML=bits(n,l);
    const f=l>=31?'-':n2ip(net+1),la=l>=31?'-':n2ip(bc-1);
    $('#cOut').innerHTML=`<dt>Subnet mask</dt><dd>${n2ip(m)}</dd><dt>Network address</dt><dd>${n2ip(net)}</dd><dt>Broadcast</dt><dd>${n2ip(bc)}</dd><dt>أول Host</dt><dd>${f}</dd><dt>آخر Host</dt><dd>${la}</dd><dt>عدد الـ Hosts</dt><dd>${hosts}</dd><dt>Block size</dt><dd>${2**(32-l)}</dd>`;};
  $('#cIp').oninput=upd;$('#cR').oninput=upd;upd();
}
function quiz(root,qs){
  let done=0,ok=0;root.innerHTML=`<h2>اختبر نفسك</h2>`+qs.map((q,i)=>`<div class="q" data-i="${i}"><p><b>${i+1}.</b> ${q.q}</p>${q.o.map((o,j)=>`<label data-j="${j}"><input type="radio" name="q${i}" hidden> <span class="ltr">${o}</span></label>`).join('')}<div class="ex">${q.e}</div></div>`).join('')+`<p class="score" id="sc"></p>`;
  root.querySelectorAll('.q').forEach(el=>{const q=qs[+el.dataset.i];let a=false;el.querySelectorAll('label').forEach(l=>l.onclick=()=>{if(a)return;a=true;const j=+l.dataset.j;done++;if(j===q.a){ok++;l.classList.add('ok');}else{l.classList.add('bad');el.querySelector(`label[data-j="${q.a}"]`).classList.add('ok');}el.querySelector('.ex').classList.add('on');$('#sc').textContent=`النتيجة: ${ok} / ${qs.length}`+(done===qs.length?(ok===qs.length?' — ممتاز!':' — راجع الأجزاء اللي غلطت فيها وجرّب تاني'):'');});});
}

function topo(root){
  const T={star:{n:'Star',pros:'سهل الإدارة، عطل كابل واحد بيأثر على جهاز واحد بس، الأكثر استخداماً في الـ LAN.',cons:'الـ Switch المركزي نقطة فشل واحدة. محتاج كابلات كتير.',use:'كل شبكات المكاتب والبيوت.',
   edges:(c)=>c.map((_,i)=>[0,i+1])},
  bus:{n:'Bus',pros:'رخيص وبسيط (قديماً)، كابل واحد.',cons:'لو الكابل الرئيسي اتقطع الشبكة كلها تقع، collisions كتير، صعب اكتشاف الأعطال.',use:'قديم (Ethernet الأول). مش بيُستخدم دلوقتي.',edges:(c)=>c.slice(1).map((_,i)=>[i+1,i+2])},
  ring:{n:'Ring',pros:'كل جهاز بيمرّر للتالي، أداء متوقع.',cons:'قطع واحد ممكن يوقع الحلقة (إلا لو Dual ring).',use:'Token Ring (قديم) و FDDI وبعض شبكات الـ Fiber.',edges:(c)=>c.map((_,i)=>[i+1,((i+1)%c.length)+1])},
  mesh:{n:'Full Mesh',pros:'أعلى reliability: لو لينك وقع فيه طرق تانية.',cons:'غالي جداً: n(n−1)/2 كابل. لـ 5 أجهزة = 10 كابلات.',use:'قلب الإنترنت والـ WAN بين مواقع مهمة (غالباً Partial mesh).',edges:(c)=>{const e=[];for(let i=1;i<=c.length;i++)for(let j=i+1;j<=c.length;j++)e.push([i,j]);return e;}}};
  root.innerHTML='<div class="calc"><div class="row" id="tb"></div><svg id="tsv" viewBox="0 0 300 220" style="width:100%;max-width:380px;display:block;margin:auto"></svg><div id="tx"></div></div>';
  const N=5;const draw=k=>{const t=T[k];const c=[...Array(N)];const pts=[[150,110]];for(let i=0;i<N;i++){const a=i/N*Math.PI*2-Math.PI/2;pts.push([150+85*Math.cos(a),110+85*Math.sin(a)]);}
   let ed=t.edges(c);if(k==='star'){}else if(k!=='star'){pts[0]=null;}
   const P=i=>k==='star'?pts[i]:pts[i];let lines='';
   if(k==='star')lines=ed.map(([a,b])=>`<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="#37e1ff" stroke-width="2"/>`).join('');
   else lines=ed.map(([a,b])=>`<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="#37e1ff" stroke-width="2"/>`).join('');
   if(k==='bus'){lines=`<line x1="25" y1="110" x2="275" y2="110" stroke="#37e1ff" stroke-width="4"/>`+[0,1,2,3,4].map(i=>{const x=45+i*52,y=i%2?55:165;return `<line x1="${x}" y1="110" x2="${x}" y2="${y}" stroke="#37e1ff" stroke-width="2"/><rect x="${x-14}" y="${y-12}" width="28" height="24" rx="6" fill="#141d31" stroke="#3ddc97"/>`;}).join('');}
   let nodes='';if(k!=='bus'){for(let i=(k==='star'?0:1);i<=N;i++){const [x,y]=pts[i];nodes+=`<rect x="${x-14}" y="${y-12}" width="28" height="24" rx="6" fill="#141d31" stroke="${i===0?'#ffa94d':'#3ddc97'}" stroke-width="2"/>`;}}
   $('#tsv').innerHTML=lines+nodes;
   $('#tx').innerHTML=`<h3>${t.n}</h3><p><b>المميزات:</b> ${t.pros}</p><p><b>العيوب:</b> ${t.cons}</p><p><b>بيُستخدم في:</b> ${t.use}</p>`;
   document.querySelectorAll('#tb button').forEach(b=>b.classList.toggle('ghost',b.dataset.k!==k));};
  $('#tb').innerHTML=Object.keys(T).map(k=>`<button class="btn2 ghost" data-k="${k}">${T[k].n}</button>`).join('');
  $('#tb').onclick=e=>{const b=e.target.closest('button');if(b)draw(b.dataset.k);};draw('star');
}

function chunk(root){
  root.innerHTML='<div class="calc"><div class="row"><label>حجم الملف (KB): <input type="text" id="kF" value="3000" style="max-width:120px"></label><label>Bandwidth (Mbps): <input type="text" id="kB" value="100" style="max-width:100px"></label></div><div class="row"><label>MTU: <b id="kML">1500</b> byte</label><input type="range" id="kM" min="576" max="9000" step="1" value="1500"></div><div class="bar" id="kBar"></div><dl id="kO"></dl></div>';
  const u=()=>{const F=Math.max(0,+$('#kF').value||0)*1000,B=Math.max(0.001,+$('#kB').value||1),M=+$('#kM').value;$('#kML').textContent=M;const pay=M-40,n=Math.ceil(F/pay),oh=n*(40+18),tot=F+oh;
   $('#kBar').innerHTML=`<i class="n" style="width:${F/tot*100}%"></i><i class="h" style="width:${oh/tot*100}%"></i>`;
   $('#kO').innerHTML=`<dt>Payload لكل packet</dt><dd>${pay} byte (MTU − 40)</dd><dt>عدد الـ Packets</dt><dd>${n}</dd><dt>Overhead (IP+TCP+Eth)</dt><dd>${oh} byte (${(oh/tot*100).toFixed(1)}%)</dd><dt>زمن الإرسال النظري</dt><dd>${(tot*8/(B*1e6)).toFixed(3)} s</dd>`;};
  ['kF','kB','kM'].forEach(i=>$('#'+i).oninput=u);u();
}

function osi(root){
  const Ls=[[7,'Application','الخدمات اللي المستخدم/البرنامج بيتعامل معاها مباشرة: طلب صفحة، إرسال إيميل، ترجمة اسم.','HTTP, HTTPS, DNS, DHCP, SMTP, FTP, SSH','Data','المتصفح، السيرفر'],
  [6,'Presentation','شكل وتمثيل البيانات: ترميز (UTF-8)، ضغط، تشفير (TLS).','TLS/SSL, JPEG, ASCII/UTF-8','Data','—'],
  [5,'Session','فتح وإدارة وإنهاء الجلسات (حوار بين طرفين).','NetBIOS, RPC, sessions','Data','—'],
  [4,'Transport','توصيل بيانات من برنامج لبرنامج: ports، ترقيم، موثوقية (TCP) أو سرعة (UDP).','TCP, UDP','Segment','Firewall (L4)'],
  [3,'Network','عنونة منطقية (IP) واختيار الطريق بين شبكات مختلفة.','IP, ICMP, OSPF, RIP','Packet','Router, L3 Switch'],
  [2,'Data Link','توصيل frame بين جهازين على نفس اللينك: MAC، كشف الأخطاء.','Ethernet, Wi-Fi 802.11, ARP*, STP, VLAN 802.1Q','Frame','Switch, Bridge, NIC'],
  [1,'Physical','نقل الـ bits كإشارات: جهد كهربي، ضوء، راديو، شكل الكونكتور.','RJ-45, Fiber, 1000BASE-T','Bits','Hub, Cable, Repeater']];
  const H=['HTTP','TCP','IP','Eth'];
  root.innerHTML='<div class="calc"><div id="oL" style="display:grid;gap:6px"></div><div id="oX" style="margin-top:12px"></div></div>';
  const cols=['#a77bff','#a77bff','#a77bff','#ff5d73','#ffa94d','#3ddc97','#37e1ff'];
  const pick=i=>{const [n,nm,desc,pr,pdu,dev]=Ls[i];
   document.querySelectorAll('#oL button').forEach((b,j)=>{b.style.outline=j===i?'2px solid #fff':'none';});
   let st='';const layers=n>=5?[['Data (HTTP)',cols[0]]]:[];
   const stack=[['HTTP data','#a77bff']];if(n<=4)stack.unshift(['TCP hdr','#ff5d73']);if(n<=3)stack.unshift(['IP hdr','#ffa94d']);if(n<=2)stack.unshift(['Eth hdr','#3ddc97']);
   const tr=n<=2?[['FCS','#3ddc97']]:[];
   const parts=n===1?['<span style="direction:ltr;font-family:monospace;color:#37e1ff;letter-spacing:2px">0101 1100 1010 0011 ...</span>']:[...stack,...tr].map(([t,c])=>`<span style="background:${c}22;border:1px solid ${c};color:${c};padding:4px 10px;border-radius:7px;font-family:monospace;font-size:13px">${t}</span>`);
   $('#oX').innerHTML=`<h3>Layer ${n}: ${nm}</h3><p>${desc}</p><p><b>أمثلة بروتوكولات:</b> <span class="ltr">${pr}</span></p><p><b>الـ PDU:</b> ${pdu} &nbsp; <b>الأجهزة:</b> ${dev}</p><div style="direction:ltr;display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${parts.join('')}</div>`;};
  $('#oL').innerHTML=Ls.map(([n,nm],i)=>`<button class="btn2 ghost" data-i="${i}" style="text-align:start;border-right:6px solid ${cols[i]}">${n} &nbsp; ${nm}</button>`).join('');
  $('#oL').onclick=e=>{const b=e.target.closest('button');if(b)pick(+b.dataset.i);};pick(3);
}
const WID={calc,topo,chunk,osi};
function show(id){
  const L=LESSONS.find(x=>x.id===id)||LESSONS[0];history.replaceState(null,'','#'+L.id);
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.id===L.id));
  const art=$('#art');
  art.innerHTML=`<div class="hero"><h1>${L.title}</h1><p>${L.sub}</p></div><div class="video" id="vid"></div>`+L.sections.map((s,i)=>`<section class="s" id="sec${i}">${s.html}${s.widget?'<div data-w="'+s.widget+'"></div>':''}</section>`).join('')
   +`<section class="s"><h2>جرّب بنفسك في المحاكي</h2><p>${L.tryText}</p><a class="btn2" href="index.html?ex=${L.ex}">افتح المثال في المحاكي</a></section><section class="s quiz" id="quiz"></section>`;
  art.querySelectorAll('[data-w]').forEach(e=>WID[e.dataset.w](e));
  quiz($('#quiz'),L.quiz);
  const v=VIDEOS[L.id];if(v&&/^[\w-]{6,20}$/.test(v)){const d=$('#vid');d.classList.add('on');d.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${v}" allowfullscreen loading="lazy" title="${L.title}"></iframe>`;}
  scrollTo(0,0);
}
$('#nav').innerHTML=LESSONS.map((l,i)=>`<a href="#${l.id}" data-id="${l.id}" class="${l.soon?'soon':''}"><em>${i+1}</em><span>${l.nav}</span></a>`).join('');
$('#nav').onclick=e=>{const a=e.target.closest('a');if(a&&!a.classList.contains('soon')){e.preventDefault();show(a.dataset.id);}};
show(location.hash.slice(1)||LESSONS[0].id);
