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

function mac(root){
  root.innerHTML='<div class="calc"><div class="row"><label>من: <select id="mS"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>إلى: <select id="mD"><option>B</option><option>A</option><option>C</option><option>D</option></select></label><button class="btn2" id="mGo">إرسال</button><button class="btn2 ghost" id="mRs">تصفير الجدول</button></div><svg id="mSv" viewBox="0 0 400 150" style="width:100%;max-width:480px;display:block;margin:6px auto"></svg><table id="mT"></table><div id="mLog" style="min-height:48px"></div></div>';
  const H={A:'AA:AA',B:'BB:BB',C:'CC:CC',D:'DD:DD'},port={A:1,B:2,C:3,D:4};let tab={};
  const draw=(to=[],from=null)=>{const xs={A:50,B:150,C:250,D:350};let s='<rect x="40" y="55" width="320" height="34" rx="8" fill="#141d31" stroke="#3ddc97"/><text x="200" y="77" fill="#3ddc97" text-anchor="middle" font-size="14">Switch</text>';
   for(const k of 'ABCD'){const c=k===from?'#ffa94d':to.includes(k)?'#37e1ff':'#22304d';s+=`<line x1="${xs[k]}" y1="89" x2="${xs[k]}" y2="115" stroke="${c}" stroke-width="3"/><rect x="${xs[k]-22}" y="115" width="44" height="28" rx="6" fill="#0e1524" stroke="${c}" stroke-width="2"/><text x="${xs[k]}" y="134" fill="#dbe6ff" text-anchor="middle" font-size="14">${k}</text><text x="${xs[k]}" y="104" fill="#7e8fb3" font-size="10" text-anchor="middle">P${port[k]}</text>`;}
   $('#mSv').innerHTML=s;
   $('#mT').innerHTML='<tr><th>MAC</th><th>Port</th></tr>'+(Object.keys(tab).length?Object.entries(tab).map(([m,p])=>`<tr><td class="ltr">${m}</td><td>${p}</td></tr>`).join(''):'<tr><td colspan=2>(فاضي)</td></tr>');};
  const go=()=>{const s=$('#mS').value,d=$('#mD').value;if(s===d){$('#mLog').innerHTML='<p>اختار جهازين مختلفين.</p>';return;}
   let m=[`<p><b>1) Learning:</b> الـ Switch قرأ Source MAC ${H[s]} وسجّله على Port ${port[s]}.</p>`];const known=tab[H[s]]!==undefined;tab[H[s]]=port[s];
   let to;if(tab[H[d]]!==undefined){to=[d];m.push(`<p><b>2) Forwarding:</b> الـ Destination ${H[d]} موجود في الجدول (Port ${tab[H[d]]}) فبعت الـ frame للجهاز ${d} بس.</p>`);}
   else{to='ABCD'.split('').filter(x=>x!==s);m.push(`<p><b>2) Flooding:</b> الـ Destination ${H[d]} مش في الجدول، فالـ Switch بعت الـ frame لكل المنافذ ما عدا Port ${port[s]} (الأجهزة ${to.join(', ')}). بس ${d} هو اللي هيرد عليها.</p>`);}
   $('#mLog').innerHTML=m.join('');draw(to,s);};
  $('#mGo').onclick=go;$('#mRs').onclick=()=>{tab={};$('#mLog').innerHTML='';draw();};draw();
}

function arp(root){
  root.innerHTML='<div class="calc"><svg id="aSv" viewBox="0 0 400 130" style="width:100%;max-width:480px;display:block;margin:auto"></svg><div class="row"><button class="btn2" id="aN">الخطوة التالية</button><button class="btn2 ghost" id="aR">من الأول</button></div><div id="aT"></div></div>';
  const S=[
  ['الحالة الابتدائية','PC1 عنده IP لـ PC2 وعايز يبعتله ping. الـ ARP cache بتاعه فاضي. مش عارف MAC بتاع 192.168.1.20.',[],[],'-'],
  ['1) ARP Request (Broadcast)','Dest MAC = FF:FF:FF:FF:FF:FF | Src MAC = AA:AA | "Who has 192.168.1.20? Tell 192.168.1.10"',['B','C'],['B','C'],'-'],
  ['2) الـ Switch بيعمل Flood','الـ broadcast اتبعت لكل المنافذ. PC3 شاف إن الـ IP مش بتاعه فتجاهلها. PC2 عرف إنه المقصود.',['B','C'],['B'],'-'],
  ['3) ARP Reply (Unicast)','Dest MAC = AA:AA | Src MAC = BB:BB | "192.168.1.20 is at BB:BB". PC2 كمان سجّل MAC بتاع PC1.',['A'],['A'],'-'],
  ['4) تحديث الـ ARP cache','PC1 سجّل: 192.168.1.20 → BB:BB. الـ entry بتعيش كام دقيقة.',[],[],'192.168.1.20 → BB:BB'],
  ['5) الـ ICMP Echo (ping) مباشرة','دلوقتي الـ frame: Dest MAC = BB:BB | Src MAC = AA:AA | Payload: ICMP echo. Unicast، من غير broadcast.',['B'],['B'],'192.168.1.20 → BB:BB']];
  let i=0;const draw=()=>{const [t,d,hl,rcv,cache]=S[i];const x={A:70,B:200,C:330},nm={A:'PC1 AA:AA',B:'PC2 BB:BB',C:'PC3 CC:CC'};
   let s='<rect x="120" y="40" width="160" height="28" rx="8" fill="#141d31" stroke="#3ddc97"/><text x="200" y="59" fill="#3ddc97" text-anchor="middle" font-size="13">Switch</text>';
   for(const k of 'ABC'){const act=hl.includes(k)||(i===1&&k==='A')||(i===3&&k==='B')||(i===5&&k==='A');const c=rcv.includes(k)?'#ffa94d':act?'#37e1ff':'#22304d';s+=`<line x1="${x[k]}" y1="68" x2="${x[k]}" y2="95" stroke="${c}" stroke-width="3"/><rect x="${x[k]-42}" y="95" width="84" height="28" rx="6" fill="#0e1524" stroke="${c}" stroke-width="2"/><text x="${x[k]}" y="113" fill="#dbe6ff" text-anchor="middle" font-size="11">${nm[k]}</text>`;}
   $('#aSv').innerHTML=s;
   $('#aT').innerHTML=`<h3>${t}</h3><p class="ltr" style="text-align:right">${d}</p><p><b>ARP cache عند PC1:</b> <span class="ltr">${cache}</span></p>`;
   $('#aN').disabled=i===S.length-1;};
  $('#aN').onclick=()=>{if(i<S.length-1){i++;draw();}};$('#aR').onclick=()=>{i=0;draw();};draw();
}

function dora(root){
  root.innerHTML='<div class="calc"><div class="row"><button class="btn2" id="dM1">DHCP (DORA)</button><button class="btn2 ghost" id="dM2">DNS lookup</button></div><svg id="dSv" viewBox="0 0 400 130" style="width:100%;max-width:480px;display:block;margin:auto"></svg><div class="row"><button class="btn2" id="dN">الخطوة التالية</button><button class="btn2 ghost" id="dR">من الأول</button></div><div id="dT"></div></div>';
  const D=[
  ['الحالة الابتدائية','الجهاز لسه معندوش IP. مش عارف حاجة عن الشبكة.',null,'-'],
  ['1) Discover','Src IP 0.0.0.0 | Dst IP 255.255.255.255 | Dst MAC FF:FF:FF:FF:FF:FF. "في DHCP server؟"',[0,1],'-'],
  ['2) Offer','السيرفر بيعرض: 192.168.1.100/24، gw 192.168.1.1، DNS 192.168.1.5، lease 8 ساعات.',[1,0],'عرض: 192.168.1.100'],
  ['3) Request','الجهاز يقبل العرض ويبعت broadcast: "أنا واخد 192.168.1.100 من السيرفر ده".',[0,1],'عرض: 192.168.1.100'],
  ['4) Acknowledge','السيرفر يأكد ويسجّل الـ lease. الجهاز يبدأ يستخدم الإعدادات.',[1,0],'192.168.1.100/24 gw .1 dns .5']];
  const N=[
  ['الحالة الابتدائية','المستخدم كتب www.example.com. الـ cache فاضي.',null,'-'],
  ['1) سؤال للـ resolver','الجهاز يسأل الـ recursive resolver: "IP بتاع www.example.com؟" ويستنى إجابة نهائية.',[0,1],'-'],
  ['2) الـ resolver يسأل الـ Root','الـ Root يقول: "معرفش، اسأل سيرفرات .com".',[1,0],'-'],
  ['3) الـ resolver يسأل TLD','سيرفر .com يقول: "اسأل الـ authoritative بتاع example.com".',[1,0],'-'],
  ['4) الـ resolver يسأل الـ Authoritative','يرد: www.example.com A 93.184.216.34 ، TTL 300. الـ resolver بيحفظها في الـ cache 300 ثانية.',[1,0],'A 93.184.216.34 (TTL 300)'],
  ['5) الإجابة للجهاز','الـ resolver يرجّع الـ IP للجهاز، والجهاز يحفظه كمان. دلوقتي يفتح الاتصال.',[1,0],'A 93.184.216.34 (TTL 300)']];
  let m=1,i=0;
  const draw=()=>{const S=m===1?D:N;const [t,d,ar,c]=S[i];
   const a=m===1?['PC','DHCP server']:['PC','Resolver'];
   let s=`<rect x="30" y="45" width="100" height="40" rx="8" fill="#0e1524" stroke="#37e1ff" stroke-width="2"/><text x="80" y="70" fill="#dbe6ff" text-anchor="middle" font-size="13">${a[0]}</text><rect x="270" y="45" width="100" height="40" rx="8" fill="#0e1524" stroke="#3ddc97" stroke-width="2"/><text x="320" y="70" fill="#dbe6ff" text-anchor="middle" font-size="13">${a[1]}</text>`;
   if(ar){const x1=ar[0]?270:130,x2=ar[0]?130:270;s+=`<line x1="${x1}" y1="65" x2="${x2}" y2="65" stroke="#ffa94d" stroke-width="3"/><circle cx="${x2}" cy="65" r="5" fill="#ffa94d"/>`;}
   $('#dSv').innerHTML=s;
   $('#dT').innerHTML=`<h3>${t}</h3><p class="ltr" style="text-align:right">${d}</p><p><b>${m===1?'إعدادات الجهاز':'DNS cache'}:</b> <span class="ltr">${c}</span></p>`;
   $('#dN').disabled=i===S.length-1;};
  $('#dN').onclick=()=>{const S=m===1?D:N;if(i<S.length-1){i++;draw();}};$('#dR').onclick=()=>{i=0;draw();};
  $('#dM1').onclick=()=>{m=1;i=0;draw();};$('#dM2').onclick=()=>{m=2;i=0;draw();};draw();
}

function vlan(root){
  const hosts=['PC1','PC2','PC3','PC4'];const st={PC1:10,PC2:10,PC3:20,PC4:20};
  root.innerHTML='<div class="calc"><div class="row" id="vH"></div><div id="vO"></div></div>';
  const col={10:'#37e1ff',20:'#ffa94d',30:'#3ddc97'};
  const draw=()=>{$('#vH').innerHTML=hosts.map(h=>`<label>${h}: <select data-h="${h}">${[10,20,30].map(v=>`<option value="${v}" ${st[h]===v?'selected':''}>VLAN ${v}</option>`).join('')}</select></label>`).join('');
   document.querySelectorAll('#vH select').forEach(s=>s.onchange=()=>{st[s.dataset.h]=+s.value;draw();});
   let rows='';for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=hosts[i],b=hosts[j],ok=st[a]===st[b];rows+=`<tr><td>${a} ↔ ${b}</td><td style="color:${ok?'#3ddc97':'#ff5d73'}">${ok?'يتكلموا مباشرة (L2)':'معزولين: محتاجين Router'}</td></tr>`;}
   let bd='';[10,20,30].forEach(v=>{const m=hosts.filter(h=>st[h]===v);if(m.length)bd+=`<span style="display:inline-block;margin:4px;padding:6px 12px;border:1px solid ${col[v]};color:${col[v]};border-radius:8px">VLAN ${v}: ${m.join(', ')}</span>`;});
   $('#vO').innerHTML=`<p><b>Broadcast domains:</b> ${bd}</p><table><tr><th>الزوج</th><th>النتيجة</th></tr>${rows}</table>`;};
  draw();
}

function route(root){
  const R=[['10.0.0.0',8,'via 192.168.1.2'],['10.1.0.0',16,'via 192.168.1.3'],['10.1.5.0',24,'via 192.168.1.4'],['192.168.1.0',24,'connected g0/0'],['0.0.0.0',0,'via 192.168.1.1 (default)']];
  root.innerHTML='<div class="calc"><div class="row"><label>Destination IP: <input type="text" id="rI" value="10.1.5.9"></label></div><table id="rT"></table><p id="rR"></p></div>';
  const upd=()=>{const n=ip2n($('#rI').value);if(n===null){$('#rT').innerHTML='';$('#rR').textContent='IP غير صحيح';return;}
   let best=-1;R.forEach(([a,l],i)=>{if(((n&mask(l))>>>0)===ip2n(a)&&(best<0||l>R[best][1]))best=i;});
   $('#rT').innerHTML='<tr><th>Route</th><th>Next hop</th><th>يتطابق؟</th></tr>'+R.map(([a,l,v],i)=>{const m=((n&mask(l))>>>0)===ip2n(a);return `<tr style="${i===best?'background:#0e3a2c':''}"><td class="ltr">${a}/${l}</td><td class="ltr">${v}</td><td>${m?(i===best?'✔ الأطول = المختار':'يتطابق'):'لا'}</td></tr>`;}).join('');
   $('#rR').innerHTML=best<0?'<b>مفيش route:</b> الـ packet بتتمسح (Destination unreachable).':`<b>القرار:</b> الراوتر هيبعتها ${R[best][2]} لأن /${R[best][1]} هي أطول prefix متطابق.`;};
  $('#rI').oninput=upd;upd();
}

function dv(root){
  root.innerHTML='<div class="calc"><div class="row"><label>cost اللينك المباشر R1–R4: <b id="dC">100</b></label><input type="range" id="dR" min="1" max="100" value="100"></div><svg id="dS" viewBox="0 0 400 190" style="width:100%;max-width:460px;display:block;margin:auto"></svg><div id="dX"></div></div>';
  const P={R1:[40,95],R2:[140,35],R3:[260,35],R4:[360,95]};
  const upd=()=>{const c=+$('#dR').value;$('#dC').textContent=c;const ospfDirect=c<30,tie=c===30;
   const line=(a,b,col,w,lbl)=>`<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${col}" stroke-width="${w}"/>`+(lbl?`<text x="${(P[a][0]+P[b][0])/2}" y="${(P[a][1]+P[b][1])/2-6}" fill="#7e8fb3" font-size="11" text-anchor="middle">${lbl}</text>`:'');
   let s='';const rip='#37e1ff',osp='#ffa94d';
   s+=line('R1','R4',ospfDirect?osp:'#22304d',ospfDirect?4:2,'cost '+c);
   [['R1','R2'],['R2','R3'],['R3','R4']].forEach(([a,b])=>s+=line(a,b,ospfDirect?'#22304d':osp,ospfDirect?2:4,'10'));
   s+=`<line x1="40" y1="108" x2="360" y2="108" stroke="${rip}" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>`;
   for(const k in P)s+=`<rect x="${P[k][0]-22}" y="${P[k][1]-14}" width="44" height="28" rx="7" fill="#0e1524" stroke="#3ddc97" stroke-width="2"/><text x="${P[k][0]}" y="${P[k][1]+5}" fill="#dbe6ff" font-size="13" text-anchor="middle">${k}</text>`;
   s+=`<text x="200" y="170" fill="${rip}" font-size="12" text-anchor="middle">خط متقطع أزرق = اختيار RIP (hop واحد)</text><text x="200" y="186" fill="${osp}" font-size="12" text-anchor="middle">برتقالي = اختيار OSPF</text>`;
   $('#dS').innerHTML=s;
   $('#dX').innerHTML=`<p><b>RIP:</b> بيختار اللينك المباشر دايماً (1 hop أقل من 3 hops) حتى لو بطيء جداً.</p><p><b>OSPF:</b> المباشر cost ${c} مقابل 10+10+10 = 30 → ${ospfDirect?'بيختار <b>المباشر</b> لأنه أرخص.':tie?'تعادل: ممكن يوزّع الحمل (ECMP).':'بيختار الطريق <b>الأطول (3 hops)</b> لأن مجموعه 30 أقل من '+c+'.'}</p>`;};
  $('#dR').oninput=upd;upd();
}

function acl(root){
  const R=[['deny','tcp','192.168.1.0','0.0.0.255','any',null,23],['permit','tcp','192.168.1.0','0.0.0.255','any',null,80],['permit','icmp','any',null,'any',null,null]];
  root.innerHTML='<div class="calc"><div class="row"><label>Source IP: <input type="text" id="xS" value="192.168.1.5" style="max-width:170px"></label><label>Dest IP: <input type="text" id="xD" value="8.8.8.8" style="max-width:170px"></label></div><div class="row"><label>Protocol: <select id="xP"><option>tcp</option><option>udp</option><option>icmp</option></select></label><label>Dest port: <input type="text" id="xT" value="23" style="max-width:90px"></label></div><table id="xR"></table><p id="xV"></p></div>';
  const m=(ip,a,w)=>a==='any'||(w===null?ip2n(ip)===ip2n(a):((ip2n(ip)&~ip2n(w))>>>0)===((ip2n(a)&~ip2n(w))>>>0));
  const upd=()=>{const s=$('#xS').value,d=$('#xD').value,p=$('#xP').value,t=+$('#xT').value;if(ip2n(s)===null||ip2n(d)===null){$('#xV').textContent='IP غير صحيح';return;}
   let hit=-1;const rows=R.map((r,i)=>{const ok=m(s,r[2],r[3])&&m(d,r[4],r[5])&&r[1]===p&&(r[6]===null||(p!=='icmp'&&r[6]===t));if(ok&&hit<0)hit=i;return [r,ok];});
   $('#xR').innerHTML='<tr><th>#</th><th>القاعدة</th><th>يتطابق؟</th></tr>'+rows.map(([r,ok],i)=>`<tr style="${i===hit?'background:'+(r[0]==='permit'?'#0e3a2c':'#3a1220'):''}"><td>${i+1}</td><td class="ltr">${r[0]} ${r[1]} ${r[2]}${r[3]?' '+r[3]:''} ${r[4]}${r[6]?' eq '+r[6]:''}</td><td>${i===hit?'✔ أول تطابق':ok?'يتطابق (بس اتجاهل)':'لا'}</td></tr>`).join('')+`<tr style="${hit<0?'background:#3a1220':''}"><td>—</td><td class="ltr">deny any any (implicit)</td><td>${hit<0?'✔ اتنفذت':'لا'}</td></tr>`;
   const act=hit<0?'deny':R[hit][0];$('#xV').innerHTML=`<b>القرار:</b> <span style="color:${act==='permit'?'#3ddc97':'#ff5d73'}">${act==='permit'?'PERMIT (يعدّي)':'DENY (يتمنع)'}</span>${hit<0?' (بسبب الـ implicit deny)':''}`;};
  ['xS','xD','xP','xT'].forEach(i=>$('#'+i).oninput=upd);upd();
}

function nat(root){
  root.innerHTML='<div class="calc"><div class="row"><label>الجهاز: <select id="nH"><option>192.168.1.10</option><option>192.168.1.11</option><option>192.168.1.12</option></select></label><button class="btn2" id="nG">اتصال جديد</button><button class="btn2 ghost" id="nR">تصفير</button></div><table id="nT"></table><p id="nM" style="color:var(--mut)"></p></div>';
  let rows=[],port=1024,src=51000;
  const draw=()=>{$('#nT').innerHTML='<tr><th>Inside local</th><th>Inside global</th><th>Outside</th></tr>'+(rows.length?rows.map(r=>`<tr><td class="ltr">${r[0]}</td><td class="ltr" style="color:#ffa94d">${r[1]}</td><td class="ltr">93.184.216.34:80</td></tr>`).join(''):'<tr><td colspan=3>(الجدول فاضي)</td></tr>');
   $('#nM').textContent=rows.length?`${rows.length} اتصال بيطلعوا كلهم من عنوان public واحد 41.1.1.1 والتمييز بالـ port.`:'';};
  $('#nG').onclick=()=>{rows.push([$('#nH').value+':'+(src++),'41.1.1.1:'+(port++)]);draw();};$('#nR').onclick=()=>{rows=[];port=1024;src=51000;draw();};draw();
}

function stp(root){
  const S=[['SW1',32768,'00:1A:00:00:00:01'],['SW2',32768,'00:1A:00:00:00:02'],['SW3',32768,'00:1A:00:00:00:03']];
  root.innerHTML='<div class="calc"><table id="sT"></table><p id="sR"></p></div>';
  const draw=()=>{const key=s=>s[1]*1e15+parseInt(s[2].replace(/:/g,''),16);let w=0;S.forEach((s,i)=>{if(key(s)<key(S[w]))w=i;});
   $('#sT').innerHTML='<tr><th>Switch</th><th>Priority</th><th>MAC</th><th>Bridge ID</th></tr>'+S.map((s,i)=>`<tr style="${i===w?'background:#0e3a2c':''}"><td>${s[0]}${i===w?' (Root)':''}</td><td><select data-i="${i}">${[4096,8192,16384,32768,61440].map(p=>`<option ${p===s[1]?'selected':''}>${p}</option>`).join('')}</select></td><td class="ltr">${s[2]}</td><td class="ltr">${s[1]}.${s[2]}</td></tr>`).join('');
   document.querySelectorAll('#sT select').forEach(e=>e.onchange=()=>{S[+e.dataset.i][1]=+e.value;draw();});
   const ties=S.filter(s=>s[1]===S[w][1]).length;
   $('#sR').innerHTML=`<b>الـ Root:</b> ${S[w][0]}. ${ties>1?'في تعادل في الـ Priority فاتقارن الـ MAC الأقل.':'الـ Priority الأقل كسب من غير ما نحتاج MAC.'}`;};
  draw();
}
const WID={calc,topo,chunk,osi,mac,arp,vlan,route,dv,acl,nat,stp,dora};
function show(id){
  const L=LESSONS.find(x=>x.id===id)||LESSONS[0];history.replaceState(null,'','#'+L.id);
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.id===L.id));
  { const on=document.querySelector('#nav a.on'), box=$('#nav'); if(on&&box&&box.scrollWidth>box.clientWidth+4){ box.scrollLeft=on.offsetLeft-box.clientWidth/2+on.offsetWidth/2; } }
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
