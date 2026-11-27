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
const WID={calc};
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
