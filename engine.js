// Sabaka engine: بدون DOM. محاكاة مبسطة لـ L2/L3 للتعليم.
export const TYPES = { pc:{ports:1,prefix:'PC',pre:'eth'}, server:{ports:2,prefix:'SRV',pre:'eth'}, router:{ports:4,prefix:'R',pre:'g0/'}, switch:{ports:8,prefix:'SW',pre:'fa0/'} };
export const ip2n = s => { const p=String(s).trim().split('.'); if(p.length!==4||p.some(x=>!/^\d+$/.test(x)||+x>255)) return null; return ((+p[0]<<24)>>>0)+(+p[1]<<16)+(+p[2]<<8)+(+p[3]); };
export const n2ip = n => [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
export const maskLen = m => { const n=ip2n(m); if(n===null) return null; let c=0,x=n; while(x&0x80000000){c++;x=(x<<1)>>>0;} return ((x===0)?c:null); };
export const lenMask = l => n2ip(l===0?0:((0xFFFFFFFF<<(32-l))>>>0));
export const netOf = (ip,mask) => (ip2n(ip)&ip2n(mask))>>>0;
export const okAllowed=(i,v)=>!i.allowed||String(i.allowed).split(',').map(x=>+x.trim()).includes(v);
const same = (a,b,m) => netOf(a,m)===netOf(b,m);

export class Net {
  constructor(){ this.devices=[]; this.links=[]; this.seq=1; this.cnt={}; }
  add(type,x,z,name){
    const T=TYPES[type]; this.cnt[type]=(this.cnt[type]||0)+1;
    const d={id:'d'+(this.seq++),type,name:name||T.prefix+this.cnt[type],x,z,ifaces:[],gateway:'',dns:'',routes:[],arp:{},mac:{},
      vlans:{1:'default'},dhcp:{on:false,start:'',count:20,gw:'',dns:'',leases:{}},dnsRecords:{},dhcpClient:false};
    for(let i=0;i<T.ports;i++){ d.ifaces.push({name:T.pre+(type==='switch'?i+1:i),ip:'',mask:'',mac:this.newMac(),link:null,vlan:1,mode:'access',up:true}); }
    this.devices.push(d); return d;
  }
  newMac(){ const n=(this._m=(this._m||0)+1); return '00:1A:2B:'+[(n>>16)&255,(n>>8)&255,n&255].map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(':'); }
  dev(id){ return this.devices.find(d=>d.id===id); }
  iface(d,n){ return d.ifaces.find(i=>i.name===n); }
  connect(aId,bId){
    if(aId===bId) return {err:'مينفعش توصل الجهاز بنفسه'};
    const a=this.dev(aId), b=this.dev(bId);
    if(this.links.some(l=>(l.a.dev===aId&&l.b.dev===bId)||(l.a.dev===bId&&l.b.dev===aId))) return {err:'الجهازين موصلين بالفعل'};
    const ia=a.ifaces.find(i=>!i.link), ib=b.ifaces.find(i=>!i.link);
    if(!ia||!ib) return {err:'مفيش بورت فاضي'};
    const l={id:'l'+(this.seq++),a:{dev:aId,if:ia.name},b:{dev:bId,if:ib.name}};
    ia.link=l.id; ib.link=l.id; this.links.push(l); return {link:l};
  }
  removeLink(id){ const l=this.links.find(x=>x.id===id); if(!l) return; for(const e of [l.a,l.b]){const d=this.dev(e.dev); if(d){const i=this.iface(d,e.if); if(i)i.link=null;}} this.links=this.links.filter(x=>x!==l); }
  removeDevice(id){ for(const l of [...this.links]) if(l.a.dev===id||l.b.dev===id) this.removeLink(l.id); this.devices=this.devices.filter(d=>d.id!==id); }
  peer(d,i){ if(!i.link) return null; const l=this.links.find(x=>x.id===i.link); if(!l) return null; const e=(l.a.dev===d.id&&l.a.if===i.name)?l.b:l.a; const nd=this.dev(e.dev); return {dev:nd,iface:this.iface(nd,e.if),link:l}; }
  // STP (instance واحدة لكل الـ VLANs — تبسيط): root election + root/designated/blocked
  bid(d){ return {p:d.stpPrio??32768, m:d.ifaces[0].mac}; }
  bcmp(a,b){ return a.p!==b.p?a.p-b.p:(a.m<b.m?-1:a.m>b.m?1:0); }
  stp(){
    const sw=this.devices.filter(d=>d.type==='switch'&&d.stpOn!==false); const roles={}; if(!sw.length) return {root:null,roles,cost:{}};
    const links=this.links.filter(l=>{ const a=this.dev(l.a.dev),b=this.dev(l.b.dev); if(!sw.includes(a)||!sw.includes(b)) return false; return this.iface(a,l.a.if).up&&this.iface(b,l.b.if).up; });
    const root=sw.reduce((m,d)=>this.bcmp(this.bid(d),this.bid(m))<0?d:m);
    const cost={}; sw.forEach(d=>cost[d.id]=Infinity); cost[root.id]=0;
    for(let k=0;k<sw.length;k++) for(const l of links){ const a=l.a.dev,b=l.b.dev; if(cost[a]+4<cost[b]) cost[b]=cost[a]+4; if(cost[b]+4<cost[a]) cost[a]=cost[b]+4; }
    const rootPort={};
    for(const d of sw){ if(d===root||cost[d.id]===Infinity) continue; let best=null;
      for(const l of links){ const me=l.a.dev===d.id?l.a:(l.b.dev===d.id?l.b:null); if(!me) continue; const o=me===l.a?l.b:l.a; const nb=this.dev(o.dev); if(cost[o.dev]+4!==cost[d.id]) continue;
        const cand={me,o,nb}; if(!best||this.bcmp(this.bid(nb),this.bid(best.nb))<0||(this.bcmp(this.bid(nb),this.bid(best.nb))===0&&o.if<best.o.if)) best=cand; }
      if(best) rootPort[d.id]=best.me.if; }
    for(const d of sw) for(const i of d.ifaces){ if(i.link&&i.up&&!links.some(l=>l.id===i.link)) roles[d.id+'|'+i.name]='designated'; }
    for(const l of links){ const A=this.dev(l.a.dev),B=this.dev(l.b.dev);
      const win=(cost[A.id]!==cost[B.id])?(cost[A.id]<cost[B.id]?A:B):(this.bcmp(this.bid(A),this.bid(B))<=0?A:B);
      for(const [d,ifn] of [[A,l.a.if],[B,l.b.if]]){ const k=d.id+'|'+ifn; if(d===win) roles[k]='designated'; else roles[k]=(rootPort[d.id]===ifn)?'root':'blocked'; } }
    return {root,roles,cost};
  }
  blocked(d,i){ if(d.type!=='switch'||d.stpOn===false) return false; return (this._stp||this.stp()).roles[d.id+'|'+i.name]==='blocked'; }
  // L2: يرجع كل النهايات (non-switch) اللي توصلها الفريم + المسار
  l2reach(src,iface,vlan=null){
    const out=[]; const seen=new Set(); this._stp=this.stp();
    const walk=(from,fi,v,path,via)=>{
      const p=this.peer(from,fi); if(!p||!fi.up||!p.iface.up) return; if(this.blocked(from,fi)||this.blocked(p.dev,p.iface)) return;
      const nd=p.dev, ni=p.iface;
      if(nd.type!=='switch'){ out.push({dev:nd,iface:ni,vlan:v,path:[...path,nd.id],via}); return; }
      let vv=v; if(ni.mode==='access'){ vv=ni.vlan; } else if(v==null) vv=1;
      if(ni.mode==='trunk'&&!okAllowed(ni,vv)) return;
      const key=nd.id+ni.name+vv; if(seen.has(key)) return; seen.add(key);
      const sv=nd.svis&&nd.svis[vv]; if(sv&&sv.ip&&sv.up&&!seen.has('svi'+nd.id+vv)){ seen.add('svi'+nd.id+vv); out.push({dev:nd,iface:sv,vlan:vv,path:[...path,nd.id],via,svi:true}); }
      for(const oi of nd.ifaces){ if(oi===ni||!oi.link) continue; if(oi.mode==='access'&&oi.vlan!==vv) continue; if(oi.mode==='trunk'&&!okAllowed(oi,vv)) continue; walk(nd,oi,oi.mode==='trunk'?vv:null,[...path,nd.id],[...via,{dev:nd,in:ni.name,out:oi.name,vlan:vv}]); }
    };
    if(iface&&iface.svi){ for(const oi of src.ifaces){ if(!oi.link||!oi.up) continue; if(oi.mode==='access'&&oi.vlan!==vlan) continue; if(oi.mode==='trunk'&&!okAllowed(oi,vlan)) continue; walk(src,oi,vlan,[src.id],[{dev:src,in:'Vlan'+vlan,out:oi.name,vlan}]); } }
    else walk(src,iface,vlan,[src.id],[]); this._stp=null; return out;
  }
  // نقط دخول الـ vlan: لما host يتوصل بـ access port الـ vlan هي vlan البورت
  l3(d){ const o=[]; for(const i of d.ifaces){ if(i.subs&&i.subs.length){ for(const sb of i.subs) if(sb.vlan) o.push({name:i.name+'.'+(sb.id??sb.vlan),phys:i,vlan:sb.vlan,ip:sb.ip,mask:sb.mask,mac:i.mac,link:i.link,up:i.up,aclIn:sb.aclIn,aclOut:sb.aclOut,natSide:sb.natSide,helper:sb.helper,subRef:sb}); } else o.push(i); } if(d.type==='switch'&&d.svis) for(const v of Object.values(d.svis)) o.push(v); return o; }
  epIf(r){ const i=r.iface; if(i.subs&&i.subs.length){ return this.l3(r.dev).find(x=>x.phys===i&&x.vlan===r.vlan)||null; } return i; }
  owner(ip){ for(const d of this.devices) for(const i of this.l3(d)) if(i.ip===ip) return {d,i}; return null; }
  arpResolve(d,out,nh,steps){
    const key=out.name+'|'+nh; if(d.arp[key]) return d.arp[key];
    const reach=this.l2reach(d,out.phys||out,out.vlan??null);
    const hit=reach.find(r=>{const e=this.epIf(r);return e&&e.ip===nh&&(r.dev.type!=='switch'||r.svi);});
    reach.forEach(r=>steps.push({kind:'arp',path:r.path,label:'ARP؟'}));
    if(!hit) return null;
    steps.push({kind:'arp',path:[...hit.path].reverse(),label:'ARP رد'});
    const hm=this.epIf(hit); d.arp[key]=hm.mac; hit.dev.arp[hm.name+'|'+(out.ip)]=out.mac; this.learn(reach,out,hit,hm); return hm.mac;
  }
  learn(reach,out,hit,hm){ for(const r of reach) for(const v of (r.via||[])) v.dev.mac[out.mac]={port:v.in,vlan:v.vlan}; for(const v of (hit.via||[])) v.dev.mac[hm.mac]={port:v.out,vlan:v.vlan}; }
  // ACL: standard/extended، numbered/named، implicit deny، hit counters
  aclMatchAddr(s,ip){ if(!s||s.any) return true; if(!ip) return false; return (((ip2n(ip)^ip2n(s.ip))>>>0)&(~ip2n(s.wc)>>>0))===0; }
  aclEval(acl,sip,dip,proto){ for(const r of acl.rules){ let m=this.aclMatchAddr(r.src,sip); if(m&&acl.type==='extended'){ m=(r.proto==='ip'||r.proto===proto)&&this.aclMatchAddr(r.dst,dip)&&(r.port==null||r.port===(arguments[4]||null)); } if(m){ if(!this._q) r.hits=(r.hits||0)+1; return {permit:r.act==='permit',rule:r}; } } return {permit:false,rule:null}; }
  aclDeny(d,i,dir,sip,dip,proto,port){ const id=i[dir==='in'?'aclIn':'aclOut']; if(!id) return null; const acl=(d.acls||{})[id]; if(!acl) return null; const r=this.aclEval(acl,sip,dip,proto,port); return r.permit?null:{id,iface:i,dir}; }
  // NAT: static + PAT (overload). بيترجم الـ source بس عند الخروج من inside لـ outside
  natTranslate(d,outIf,sip,dip,proto){ const n=d.nat; if(!n) return null;
    const st=(n.statics||[]).find(s=>s.in===sip); if(st){ this.natLog(d,sip,st.out,proto,dip,'static'); return st.out; }
    for(const r of (n.rules||[])){ const acl=(d.acls||{})[r.list]; if(!acl) continue; if(!this.aclEval(acl,sip,dip,proto).permit) continue; let pub=null;
      if(r.ifname){ const oi=this.l3(d).find(x=>x.name===r.ifname||x.name.toLowerCase()===String(r.ifname).toLowerCase()); pub=oi&&oi.ip; } else pub=outIf.ip;
      if(pub){ this.natLog(d,sip,pub,proto,dip,'PAT'); return pub; } }
    return null; }
  natLog(d,inside,outside,proto,dst,kind){ if(this._q) return; const t=d.nat.trans=d.nat.trans||[]; const e=t.find(x=>x.inside===inside&&x.outside===outside&&x.dst===dst&&x.proto===proto); if(e){ e.hits++; return; } t.push({inside,outside,dst,proto,kind,hits:1}); if(t.length>30) t.shift(); }
  // OSPF (area واحدة): link-state — كل الراوترات في نفس الـ component بتعرف الـ topology، وSPF (Dijkstra) بيحسب الأقل cost
  ospfIfs(d){ const o=d.ospf; if(!o||!o.on) return []; return this.l3(d).filter(i=>i.ip&&i.mask&&i.up&&i.link&&(o.networks||[]).some(n=>((ip2n(i.ip)^ip2n(n.ip))>>>0&(~ip2n(n.wc)>>>0))===0)); }
  ospfArea(d,i){ const n=((d.ospf&&d.ospf.networks)||[]).find(n=>((ip2n(i.ip)^ip2n(n.ip))>>>0&(~ip2n(n.wc)>>>0))===0); return n?(+n.area||0):0; }
  ospfTable(){
    const R=this.devices.filter(d=>d.type==='router'&&d.ospf&&d.ospf.on); const T={}; if(!R.length) return T;
    const cost=i=>(i.phys||i).ospfCost||1; const adj={}; R.forEach(d=>adj[d.id]=[]);
    for(const A of R) for(const li of this.ospfIfs(A)){ if((A.ospf.passive||[]).includes((li.phys||li).name)) continue; const ar=this.ospfArea(A,li); for(const ep of this.l2reach(A,li.phys||li,li.vlan||null)){ const B=ep.dev; if(B===A||!adj[B.id]) continue; const bi=this.ospfIfs(B).find(x=>(x.phys||x)===ep.iface&&(!x.phys||x.vlan===ep.vlan)&&same(x.ip,li.ip,li.mask)&&!(B.ospf.passive||[]).includes((x.phys||x).name)&&this.ospfArea(B,x)===ar); if(bi) adj[A.id].push({to:B,out:li,nh:bi.ip,c:cost(li),area:ar}); } }
    const nets=(d,ar)=>this.ospfIfs(d).filter(i=>ar===undefined||this.ospfArea(d,i)===ar).map(i=>({net:n2ip(netOf(i.ip,i.mask)),mask:i.mask,c:cost(i),area:this.ospfArea(d,i)}));
    const areasOf=d=>[...new Set(this.ospfIfs(d).map(i=>this.ospfArea(d,i)))];
    const all=[...new Set(R.flatMap(areasOf))];
    // SPF لكل area ولكل راوتر
    const spf=(A,ar)=>{ const dist={[A.id]:0}, first={}, done=new Set(); for(let k=0;k<R.length;k++){ let u=null; for(const d of R) if(!done.has(d.id)&&dist[d.id]!==undefined&&(u===null||dist[d.id]<dist[u.id])) u=d; if(!u) break; done.add(u.id); for(const e of adj[u.id]){ if(e.area!==ar) continue; const nd=dist[u.id]+e.c; if(dist[e.to.id]===undefined||nd<dist[e.to.id]){ dist[e.to.id]=nd; first[e.to.id]=u===A?e:first[u.id]; } } } return {dist,first}; };
    const S={}; for(const A of R){ S[A.id]={}; for(const ar of areasOf(A)) S[A.id][ar]=spf(A,ar); }
    const ownKeys={}; for(const A of R){ T[A.id]={}; ownKeys[A.id]=new Set(nets(A).map(x=>x.net+'/'+x.mask)); }
    // intra-area
    for(const A of R) for(const ar of areasOf(A)){ const {dist,first}=S[A.id][ar]; for(const B of R){ if(B===A||dist[B.id]===undefined) continue; for(const n of nets(B,ar)){ const key=n.net+'/'+n.mask; if(ownKeys[A.id].has(key)) continue; const m=dist[B.id]+n.c; const cur=T[A.id][key]; if(!cur||m<cur.metric){ const f=first[B.id]; T[A.id][key]={net:n.net,mask:n.mask,metric:m,out:f.out,nh:f.nh,outKey:f.out.name,oa:ar,ia:false}; } } } }
    // inter-area عن طريق الـ ABRs (لازم area 0)
    const abrs=R.filter(d=>{ const a=areasOf(d); return a.length>1&&a.includes(0); });
    for(let round=0;round<6&&abrs.length&&all.length>1;round++){ let ch=false;
      for(const X of abrs){ const adv=[]; for(const n of nets(X)){ adv.push({key:n.net+'/'+n.mask,net:n.net,mask:n.mask,metric:n.c,oa:n.area}); } for(const [key,e] of Object.entries(T[X.id])) adv.push({key,net:e.net,mask:e.mask,metric:e.metric,oa:e.oa});
        for(const ar of areasOf(X)){ for(const s of adv){ if(s.oa===ar) continue; if(!((s.oa!==0&&ar===0)||(s.oa===0&&ar!==0))) continue;
          for(const A of R){ if(A===X||!S[A.id][ar]) continue; const {dist,first}=S[A.id][ar]; if(dist[X.id]===undefined) continue; if(ownKeys[A.id].has(s.key)) continue; const m=dist[X.id]+s.metric; const cur=T[A.id][s.key]; if(cur&&(!cur.ia||cur.metric<=m)) continue; const f=first[X.id]; T[A.id][s.key]={net:s.net,mask:s.mask,metric:m,out:f.out,nh:f.nh,outKey:f.out.name,oa:ar,ia:true,abr:X.name}; ch=true; } } } }
      if(!ch) break; }
    return T; }
  // RIP v2 (distance-vector، hop count، max 15، split horizon) — بيتحسب من الـ topology الحالية
  ripNets(d){ const r=d.rip; if(!r||!r.on) return []; const cl=ip=>{ const f=+ip.split('.')[0]; return n2ip(netOf(ip,f<128?'255.0.0.0':f<192?'255.255.0.0':'255.255.255.0')); };
    return this.l3(d).filter(i=>i.ip&&i.mask&&i.up&&i.link&&(r.networks||[]).some(n=>n===cl(i.ip)||n===n2ip(netOf(i.ip,i.mask)))); }
  ripTable(){
    const R=this.devices.filter(d=>d.type==='router'&&d.rip&&d.rip.on); const T={}; if(!R.length) return T;
    R.forEach(d=>{ T[d.id]={}; for(const i of this.ripNets(d)){ const net=n2ip(netOf(i.ip,i.mask)); T[d.id][net+'/'+i.mask]={net,mask:i.mask,metric:0,own:true,out:i,nh:null,outKey:i.name}; } });
    const adj=[]; for(const A of R) for(const li of this.ripNets(A)){ const ph=li.phys||li; for(const ep of this.l2reach(A,ph,li.vlan||null)){ const B=ep.dev; if(B===A||!T[B.id]) continue; const bi=this.l3(B).find(x=>x.ip&&x.up&&x.link&&x.mask&&(x.phys||x)===ep.iface&&(!x.phys||x.vlan===ep.vlan)&&same(x.ip,li.ip,li.mask)&&this.ripNets(B).includes(x)); if(bi&&!(B.rip.passive||[]).includes(bi.phys?bi.phys.name:bi.name)) adj.push({A,li,B,bi}); } }
    for(let k=0;k<16;k++){ let ch=false; for(const {A,li,B,bi} of adj){ for(const [key,e] of Object.entries(T[B.id])){ if(e.outKey===bi.name&&!e.own) continue; const m=e.metric+1; if(m>=16) continue; const cur=T[A.id][key]; if(cur&&(cur.own||cur.metric<=m)) continue; T[A.id][key]={net:e.net,mask:e.mask,metric:m,own:false,out:li,nh:bi.ip,outKey:li.name,from:B.name}; ch=true; } } if(!ch) break; }
    return T; }
  route(d,dst){
    // يرجع {out,nh} أو null
    const cand=[];
    for(const i of this.l3(d)){ if(i.ip&&i.mask&&i.up&&i.link&&same(i.ip,dst,i.mask)) cand.push({len:maskLen(i.mask),out:i,nh:dst,kind:'C'}); }
    if(d.type==='router'||true){ for(const r of d.routes){ const o=this.ifaceTo(d,r.nh); if(o&&same(r.net,dst,r.mask)) cand.push({len:maskLen(r.mask),out:o,nh:r.nh,kind:'S'}); } }
    if(d.type==='router'&&d.rip&&d.rip.on){ const t=this.ripTable()[d.id]||{}; for(const e of Object.values(t)){ if(!e.own&&same(e.net,dst,e.mask)) cand.push({len:maskLen(e.mask),out:e.out,nh:e.nh,kind:'R'}); } }
    if(d.type==='router'&&d.ospf&&d.ospf.on){ const t=this.ospfTable()[d.id]||{}; for(const x of Object.values(t)){ if(same(x.net,dst,x.mask)) cand.push({len:maskLen(x.mask),out:x.out,nh:x.nh,kind:'O'}); } }
    if(d.type!=='router'&&d.gateway){ const o=this.ifaceTo(d,d.gateway); if(o) cand.push({len:-1,out:o,nh:d.gateway,kind:'G'}); }
    const rk={C:0,S:1,O:2,R:3,G:4}; cand.sort((a,b)=>b.len-a.len||rk[a.kind]-rk[b.kind]); return cand[0]||null;
  }
  ifaceTo(d,nh){ return this.l3(d).find(i=>i.ip&&i.mask&&i.up&&i.link&&same(i.ip,nh,i.mask)); }
  // يرسل IP packet من src الى dstIp. proto: 'icmp'|'udp'. يرجع {ok,reason,hops:[{dev}],steps,at}
  send(src,dstIp,{ttl=64,kind='icmp',label='ICMP',nat=null,tproto=null,tport=null}={}){
    const steps=[]; const hops=[]; let cur=src; let first=true;
    const srcIf=()=>src.ifaces.find(i=>i.ip);
    if(!this.l3(src).some(i=>i.ip&&i.link)) return {ok:false,reason:'مفيش IP متظبط أو كابل',steps,hops};
    const own=this.owner(dstIp); if(own&&own.d===src) return {ok:true,hops:[src],steps,dst:src};
    let t=ttl; let sip=null; let natInfo=null; let ingress=null; const proto=tproto||((kind==='icmp'||kind==='reply')?'icmp':'udp'); const dport=tport!=null?tport:(kind==='dns'?53:null);
    for(let guard=0;guard<32;guard++){
      let r=this.route(cur,dstIp); if(sip===null&&r) sip=r.out.ip; if(r&&nat&&dstIp===nat.pub&&nat.router!==cur&&r.nh===dstIp&&nat.outIp) r={...r,nh:nat.outIp};
      if(!r) return {ok:false,reason:cur===src?'مفيش route / default gateway للوجهة دي':'Destination unreachable من '+cur.name,steps,hops,at:cur,type:'unreach'};
      if(cur!==src&&cur.type==='router'){ const dn=this.aclDeny(cur,r.out,'out',sip,dstIp,proto,dport); if(dn) return {ok:false,reason:'مقفول بـ ACL '+dn.id+' (out) على '+cur.name,steps,hops,at:cur,type:'unreach',acl:dn}; }
      if(cur!==src&&cur.type==='router'&&cur.nat&&ingress&&ingress.natSide==='inside'&&r.out.natSide==='outside'){ const nt=this.natTranslate(cur,r.out,sip,dstIp,proto); if(nt){ natInfo={router:cur,real:sip,pub:nt,outIp:r.out.ip}; sip=nt; } }
      const mac=this.arpResolve(cur,r.out,r.nh,steps);
      if(!mac) return {ok:false,reason:'ARP فشل: مفيش حد رد على '+r.nh,steps,hops,at:cur,type:'arp'};
      const reach=this.l2reach(cur,r.out.phys||r.out,r.out.vlan??null);
      const hit=reach.find(x=>{const e=this.epIf(x);return e&&e.mac===mac&&e.ip===r.nh;});
      if(!hit) return {ok:false,reason:'الفريم متوصلش (VLAN مختلفة أو كابل)',steps,hops,at:cur,type:'l2'};
      steps.push({kind,path:hit.path,label});
      hops.push(hit.dev); const nd=hit.dev;
      ingress=this.epIf(hit);
      if(nd.type==='router'){ const ii=ingress; if(ii){ const dn=this.aclDeny(nd,ii,'in',sip,dstIp,proto,dport); if(dn) return {ok:false,reason:'مقفول بـ ACL '+dn.id+' (in) على '+nd.name,steps,hops,at:nd,type:'unreach',acl:dn}; } }
      if(nat&&nd===nat.router&&dstIp===nat.pub){ dstIp=nat.real; cur=nd; if(--t<=0) return {ok:false,reason:'TTL expired عند '+nd.name,steps,hops,at:nd,type:'ttl'}; continue; }
      if(this.l3(nd).some(i=>i.ip===dstIp)) return {ok:true,hops,steps,dst:nd,nat:natInfo,seenAs:sip};
      if(nd.type!=='router') return {ok:false,reason:nd.name+' استقبل الباكت بس مش ليه',steps,hops,at:nd,type:'drop'};
      t--; if(t<=0) return {ok:false,reason:'TTL expired عند '+nd.name,steps,hops,at:nd,type:'ttl'};
      cur=nd; first=false;
    }
    return {ok:false,reason:'Routing loop',steps,hops,type:'loop'};
  }
  primaryIp(d){ const i=this.l3(d).find(x=>x.ip&&x.link); return i?i.ip:null; }
  ping(src,target,opts={}){
    let ip=ip2n(target)!==null?target:null; const steps=[]; let dnsInfo=null;
    if(!ip){ const q=this.resolve(src,target); steps.push(...q.steps); if(!q.ip) return {ok:false,reason:'Name resolution failed: '+target,steps,hops:[]}; ip=q.ip; dnsInfo=q; }
    const go=this.send(src,ip,{label:'ICMP'}); steps.push(...go.steps);
    if(!go.ok) return {...go,steps,ip};
    const back=this.send(go.dst,go.nat?go.nat.pub:(this.primaryIp(src)||ip),{kind:'reply',label:'رد',nat:go.nat});
    steps.push(...back.steps);
    if(!back.ok) return {ok:false,reason:'الباكت وصل بس الرد مرجعش ('+back.reason+') — راجع الـ gateway/route على الجهاز التاني',steps,hops:go.hops,ip};
    return {ok:true,steps,hops:go.hops,back:back.hops,ip,nat:go.nat,seenAs:go.seenAs};
  }
  tcp(src,target,port){
    let ip=ip2n(target)!==null?target:null; const steps=[]; const ev=[];
    if(!ip){ const q=this.resolve(src,target); steps.push(...q.steps); if(!q.ip) return {ok:false,stage:'dns',reason:'Name resolution failed: '+target,steps,ev,hops:[]}; ip=q.ip; }
    const go=this.send(src,ip,{kind:'tcp',label:'SYN',tproto:'tcp',tport:port}); steps.push(...go.steps); ev.push('1) SYN  (client → server, dst port '+port+')');
    if(!go.ok) return {ok:false,stage:'syn',reason:go.reason,acl:go.acl,steps,ev,hops:go.hops||[],ip};
    const dst=go.dst; const lp=dst.listen||(dst.type==='server'?[80,443]:[]); const cip=go.nat?go.nat.pub:(this.primaryIp(src)||ip);
    if(!lp.includes(port)){ const rb=this.send(dst,cip,{kind:'rst',label:'RST',nat:go.nat,tproto:'tcp'}); steps.push(...rb.steps); ev.push('2) RST  (السيرفر مفيش حد بيسمع على البورت ده)'); return {ok:false,stage:'rst',reason:'Connection refused (RST): مفيش service بتسمع على البورت '+port+' عند '+dst.name,steps,ev,hops:go.hops,ip,dst}; }
    const sa=this.send(dst,cip,{kind:'tcpr',label:'SYN-ACK',nat:go.nat,tproto:'tcp'}); steps.push(...sa.steps); ev.push('2) SYN-ACK  (السيرفر → client)');
    if(!sa.ok) return {ok:false,stage:'synack',reason:'الـ SYN وصل بس الـ SYN-ACK مرجعش ('+sa.reason+')',steps,ev,hops:go.hops,ip,dst};
    const ak=this.send(src,ip,{kind:'tcp',label:'ACK',tproto:'tcp',tport:port}); steps.push(...ak.steps); ev.push('3) ACK  (client → server)  =  Established');
    return {ok:true,steps,ev,hops:go.hops,ip,dst,nat:go.nat,seenAs:go.seenAs};
  }
  resolve(src,name){
    const steps=[]; const dns=src.dns; if(!dns) return {ip:null,steps,why:'مفيش DNS server'};
    const q=this.send(src,dns,{kind:'dns',label:'DNS؟'}); steps.push(...q.steps); if(!q.ok) return {ip:null,steps,why:q.reason};
    const srv=q.dst; const rec=srv.dnsRecords[name.toLowerCase()];
    const b=this.send(srv,this.primaryIp(src)||'',{kind:'dns',label:'DNS رد'}); steps.push(...b.steps);
    return {ip:rec||null,steps,server:srv};
  }
  traceroute(src,target){
    let ip=ip2n(target)!==null?target:null; const rows=[]; const steps=[];
    if(!ip){ const q=this.resolve(src,target); steps.push(...q.steps); if(!q.ip) return {rows,ip:null,steps,reason:'Name resolution failed',nameFail:true}; ip=q.ip; }
    for(let ttl=1;ttl<=16;ttl++){
      const r=this.send(src,ip,{ttl,label:'TTL='+ttl}); if(ttl===1||true) steps.push(...r.steps);
      if(r.ok){ rows.push({ttl,name:r.dst.name,ip}); return {rows,ip,steps,ok:true}; }
      if(r.type==='ttl'){ const x=r.at; rows.push({ttl,name:x.name,ip:this.ifaceTo(x,this.route(x,this.primaryIp(src))?.nh)?.ip||this.primaryIp(x)}); }
      else { rows.push({ttl,name:'*',ip:null,fail:r.reason}); return {rows,ip,steps,ok:false}; }
    }
    return {rows,ip,steps,ok:false};
  }
  dhcpRequest(c){
    const steps=[]; const ifc=c.ifaces.find(i=>i.link); if(!ifc) return {ok:false,reason:'مفيش كابل',steps};
    const reach=this.l2reach(c,ifc);
    const srv=reach.find(r=>r.dev.dhcp&&r.dev.dhcp.on&&r.dev.type==='server');
    reach.forEach(r=>steps.push({kind:'dhcp',path:r.path,label:'DHCP Discover'}));
    let relay=null;
    if(!srv){
      for(const r of reach){ if(r.dev.type!=='router') continue; const ei=this.epIf(r); if(!ei||!ei.helper||!ei.ip) continue;
        const o=this.owner(ei.helper); if(!o||!o.d.dhcp||!o.d.dhcp.on||o.d.type!=='server') continue;
        const q=this.send(r.dev,ei.helper,{kind:'dhcp',label:'DHCP relay (unicast)'}); steps.push(...q.steps);
        if(!q.ok) return {ok:false,reason:'الـ Router عنده helper-address بس مش قادر يوصّل للسيرفر '+ei.helper+': '+q.reason,steps};
        relay={r,ei,o,back:q.steps}; break; }
      if(!relay) return {ok:false,reason:'مفيش DHCP server في الـ VLAN دي (ولا ip helper-address على الـ Router)',steps};
    }
    const s=relay?relay.o.d:srv.dev, p=s.dhcp, st=ip2n(p.start); const si=relay?{ip:relay.o.i.ip,mask:relay.ei.mask}:srv.iface;
    if(relay&&((st^ip2n(relay.ei.ip))>>>0&ip2n(relay.ei.mask))!==0) return {ok:false,reason:'الـ pool بتاع السيرفر ('+p.start+') مش في نفس subnet الـ relay interface ('+relay.ei.ip+')',steps};
    if(st===null||!si.ip) return {ok:false,reason:'الـ DHCP server مش متظبط (start IP أو IP للسيرفر)',steps};
    let lease=p.leases[ifc.mac];
    if(!lease){ const used=new Set(Object.values(p.leases)); for(let k=0;k<p.count;k++){ const cand=n2ip(st+k); if(!used.has(cand)&&cand!==si.ip&&!this.owner(cand)){lease=cand;break;} } }
    if(!lease) return {ok:false,reason:'الـ pool خلص',steps};
    p.leases[ifc.mac]=lease; if(relay){ const rb=this.send(relay.o.d,this.primaryIp(relay.r.dev)||relay.ei.ip,{kind:'dhcp',label:'DHCP Offer (relay)'}); steps.push(...rb.steps); steps.push({kind:'dhcp',path:[...relay.r.path].reverse(),label:'DHCP Offer/ACK'}); } else steps.push({kind:'dhcp',path:[...srv.path].reverse(),label:'DHCP Offer/ACK'});
    ifc.ip=lease; ifc.mask=si.mask; c.gateway=p.gw||''; c.dns=p.dns||''; c.dhcpClient=true; return {ok:true,ip:lease,mask:si.mask,gw:c.gateway,dns:c.dns,steps};
  }
  toJSON(){ return {devices:this.devices,links:this.links,seq:this.seq,cnt:this.cnt,m:this._m}; }
  static from(o){ const n=new Net(); n.devices=o.devices||[]; n.links=o.links||[]; n.seq=o.seq||100; n.cnt=o.cnt||{}; n._m=o.m||0; n.devices.forEach(d=>d.arp={}); return n; }
}

// ---------- CLI ----------
export function runCli(net,d,line){
  const out=[]; const p=(s='')=>out.push(s); const a=line.trim().split(/\s+/).filter(Boolean); if(!a.length) return {out,steps:[]};
  const c=a[0].toLowerCase(); let steps=[]; let tag=null;
  const isHost=d.type==='pc'||d.type==='server', isR=d.type==='router', isSw=d.type==='switch';
  const showIf=()=>{ p('Interface   IP address       Mask              Status  MAC'); for(const i of net.l3(d)){ if(isSw) continue; p(`${i.name.padEnd(11)} ${(i.ip||'-').padEnd(16)} ${(i.mask||'-').padEnd(17)} ${(i.link&&i.up?'up':'down').padEnd(7)} ${i.mac}`);} if(d.gateway) p('Default gateway: '+d.gateway); if(d.dns) p('DNS server: '+d.dns); };
  if(c==='help'||c==='?'){
    p('الأوامر المتاحة:');
    if(isHost){ p('  ip set <ip> <mask> [gateway]    ظبط عنوان الجهاز'); p('  ip dns <ip>                     ظبط DNS'); p('  dhcp                            هات IP من DHCP server'); p('  ipconfig                        اعرض الإعدادات'); p('  ping <ip|name>'); p('  traceroute <ip|name>'); p('  nslookup <name>'); p('  tcp <ip|name> [port]            جرّب TCP handshake (SYN, SYN-ACK, ACK)'); p('  telnet <ip|name> [port]         زي tcp (الافتراضي 23)'); p('  arp                             جدول ARP'); }
    if(isHost&&d.type==='server'){ p('  dhcp-server <start-ip> <count> <gw> [dns]'); p('  dns-add <name> <ip>'); p('  listen <port> / unlisten <port> بورتات الـ TCP (الافتراضي 80 و 443)'); }
    if(isR){ p('  ip sub <port> <vlan> <ip> <mask>  router-on-a-stick'); p('  ip set <port> <ip> <mask>       مثال: ip set g0/0 192.168.1.1 255.255.255.0'); p('  route add <net> <mask> <next-hop>'); p('  route del <net>'); p('  show ip route | show ip int | arp'); p('  ping / traceroute'); }
    if(isSw){ p('  vlan <port> <id>                مثال: vlan fa0/2 10'); p('  trunk <port> [vlans]            مثال: trunk fa0/8 10,20');  p('  show vlan | show mac'); }
    p('  clear   مسح الشاشة'); return {out,steps};
  }
  try{
  if(c==='ipconfig'||(c==='show'&&(a[1]==='ip'&&(a[2]||'').startsWith('int')))||c==='ifconfig'){ if(isSw){p('السويتش مفيهوش IP — استخدم show vlan');} else showIf(); }
  else if(c==='ip'&&a[1]==='set'){
    if(isHost){ const [ , ,ip,m,g]=a; if(ip2n(ip)===null||maskLen(m||'')===null) throw 'صيغة غلط. مثال: ip set 192.168.1.10 255.255.255.0 192.168.1.1'; const i=d.ifaces[0]; i.ip=ip;i.mask=m; d.gateway=g&&ip2n(g)!==null?g:''; d.dhcpClient=false; p('تم.'); }
    else if(isR){ const [, ,port,ip,m]=a; const i=port&&net.iface(d,port); if(!i) throw 'البورت مش موجود. المتاح: '+d.ifaces.map(x=>x.name).join(', '); if(ip2n(ip)===null||maskLen(m||'')===null) throw 'صيغة IP/mask غلط'; i.ip=ip;i.mask=m; p('تم ظبط '+port); }
    else throw 'السويتش (L2) مش بياخد IP هنا';
  }
  else if(c==='ip'&&a[1]==='sub'&&isR){ const [, ,port,vl,ip,m]=a; const i=port&&net.iface(d,port); if(!i||!(+vl>0&&+vl<4095)||ip2n(ip)===null||maskLen(m||'')===null) throw 'مثال: ip sub g0/0 10 192.168.10.1 255.255.255.0'; i.subs=(i.subs||[]).filter(x=>x.vlan!==+vl); i.subs.push({vlan:+vl,ip,mask:m}); i.ip='';i.mask=''; p(`تم عمل sub-interface ${port}.${vl} (VLAN ${vl}). لازم السويتش يكون trunk ناحية الراوتر.`); }
  else if(c==='ip'&&a[1]==='dns'&&isHost){ if(ip2n(a[2])===null) throw 'IP غلط'; d.dns=a[2]; p('تم.'); }
  else if(c==='dhcp'&&isHost){ const r=net.dhcpRequest(d); steps=r.steps; if(r.ok){ p(`DHCP: خدت ${r.ip}/${maskLen(r.mask)} gw ${r.gw||'-'} dns ${r.dns||'-'}`); tag='dhcp';} else p('DHCP فشل: '+r.reason); }
  else if(c==='dhcp-server'&&d.type==='server'){ const [, st,cnt,gw,dns]=a; if(ip2n(st)===null) throw 'مثال: dhcp-server 192.168.1.100 20 192.168.1.1 192.168.1.5'; d.dhcp={on:true,start:st,count:+cnt||20,gw:gw||'',dns:dns||'',leases:{}}; p('DHCP server اشتغل.'); }
  else if(c==='dns-add'&&d.type==='server'){ if(!a[1]||ip2n(a[2])===null) throw 'مثال: dns-add lab.local 192.168.1.20'; d.dnsRecords[a[1].toLowerCase()]=a[2]; p('تمت الإضافة: '+a[1]+' → '+a[2]); }
  else if(c==='route'&&isR){
    if(a[1]==='add'){ const [, ,n,m,nh]=a; if(ip2n(n)===null||maskLen(m||'')===null||ip2n(nh||'')===null) throw 'مثال: route add 10.0.2.0 255.255.255.0 10.0.12.2'; d.routes.push({net:n,mask:m,nh}); p('تمت إضافة route.'); if(!net.ifaceTo(d,nh)) p('تحذير: الـ next-hop مش في subnet أي بورت متظبط.'); }
    else if(a[1]==='del'){ const k=d.routes.length; d.routes=d.routes.filter(r=>r.net!==a[2]); p(k===d.routes.length?'مفيش route بالشكل ده':'تم المسح.'); }
    else throw 'route add|del';
  }
  else if(c==='show'&&a[1]==='ip'&&a[2]==='route'&&isR){ p('Codes: C connected, S static'); for(const i of net.l3(d)) if(i.ip&&i.mask&&i.link) p(`C  ${n2ip(netOf(i.ip,i.mask))}/${maskLen(i.mask)} is directly connected, ${i.name}`); for(const r of d.routes) p(`S  ${r.net}/${maskLen(r.mask)} via ${r.nh}`); }
  else if(c==='vlan'&&isSw){ const i=a[1]&&net.iface(d,a[1]); if(!i||!(+a[2]>0&&+a[2]<4095)) throw 'مثال: vlan fa0/2 10'; i.vlan=+a[2]; i.mode='access'; p(`${a[1]} → VLAN ${a[2]} (access)`); }
  else if(c==='trunk'&&isSw){ const i=a[1]&&net.iface(d,a[1]); if(!i) throw 'مثال: trunk fa0/8'; i.mode='trunk'; i.allowed=a[2]||''; if(i.allowed&&i.allowed.split(',').some(x=>!(+x>0))) {i.allowed=''; throw 'صيغة الـ VLANs غلط. مثال: 10,20';} p(a[1]+' بقى trunk'+(i.allowed?' (VLANs: '+i.allowed+')':' (كل الـ VLANs)')); }
  else if(c==='show'&&a[1]==='vlan'&&isSw){ p('Port    Mode    VLAN   Link'); for(const i of d.ifaces) p(`${i.name.padEnd(7)} ${i.mode.padEnd(7)} ${String(i.mode==='trunk'?(i.allowed||'all'):i.vlan).padEnd(8)} ${i.link?'up':'down'}`); }
  else if(c==='show'&&a[1]==='mac'&&isSw){ const k=Object.entries(d.mac).map(([m,v])=>m+' '+(v.port||'')); p(k.length?'MAC learned: '+k.join(', '):'جدول MAC فاضي (ابعت ping الأول)'); }
  else if(c==='arp'&&!isSw){ const k=Object.entries(d.arp); if(!k.length) p('جدول ARP فاضي'); k.forEach(([a1,m])=>p(a1.split('|')[1]+'  →  '+m)); }
  else if((c==='tcp'||c==='telnet')&&isHost){ if(!a[1]) throw c+' <ip|name> [port]  مثال: tcp 192.168.2.5 80'; const port=+(a[2]||(c==='telnet'?23:80)); if(!(port>0&&port<65536)) throw 'Port غلط'; const r=net.tcp(d,a[1],port); steps=r.steps; p(`TCP ${a[1]}${r.ip&&r.ip!==a[1]?' ('+r.ip+')':''} port ${port}`); (r.ev||[]).forEach(x=>p(x)); if(r.ok){ p('✔ Connection established (3-way handshake تم)'); if(r.nat) p(`NAT: السيرفر شاف ${r.seenAs}`); tag='ping-ok'; } else { p('✖ '+r.reason+(r.acl?' (غالباً الـ ACL بيمنع الـ SYN، وده بيبان كـ timeout)':'')); tag='ping-fail'; } return {out,steps,tag,r}; }
  else if(c==='listen'&&d.type==='server'){ const port=+a[1]; if(!(port>0&&port<65536)) throw 'listen <port>  مثال: listen 8080'; d.listen=d.listen||[80,443]; if(!d.listen.includes(port)) d.listen.push(port); p('السيرفر بيسمع على البورتات: '+d.listen.join(', ')); }
  else if(c==='unlisten'&&d.type==='server'){ const port=+a[1]; d.listen=(d.listen||[80,443]).filter(x=>x!==port); p('السيرفر بيسمع على البورتات: '+(d.listen.join(', ')||'ولا واحد')); }
  else if(c==='ping'&&!isSw){ if(!a[1]) throw 'ping <ip|name>'; const r=net.ping(d,a[1]); steps=r.steps; p(`PING ${a[1]}${r.ip&&r.ip!==a[1]?' ('+r.ip+')':''}`); if(r.ok){ const h=r.hops.length; for(let k=1;k<=4;k++) p(`Reply from ${r.ip}: bytes=32 time=${(h*0.8+k*0.1).toFixed(1)}ms TTL=${64-(h-1)}`); p('4/4 باكتات وصلت ✔'); if(r.nat) p(`NAT: الراوتر ${r.nat.router.name} ترجم ${r.nat.real} ← ${r.nat.pub} (السيرفر شاف ${r.seenAs})`); tag='ping-ok'; } else { p('Request failed: '+r.reason); tag='ping-fail'; } return {out,steps,tag,r}; }
  else if(c==='traceroute'&&!isSw){ if(!a[1]) throw 'traceroute <ip|name>'; const r=net.traceroute(d,a[1]); steps=r.steps; p('traceroute to '+a[1]+', max 16 hops'); if(r.nameFail) p('✖ فشل حل الاسم (DNS): '+a[1]); r.rows.forEach(x=>p(` ${x.ttl}  ${x.ip?x.ip.padEnd(16):'*'.padEnd(16)} ${x.name==='*'?'  '+x.fail:'('+x.name+')'}`)); if(r.ok) tag='trace-ok'; return {out,steps,tag,r}; }
  else if(c==='nslookup'&&isHost){ if(!a[1]) throw 'nslookup <name>'; const q=net.resolve(d,a[1]); steps=q.steps; if(q.ip){ p('Server: '+d.dns); p(`${a[1]} → ${q.ip}`); tag='dns-ok'; } else p('فشل: '+(q.why||'NXDOMAIN')); }
  else throw `أمر غير معروف: ${c} (اكتب help)`;
  }catch(e){ p('✖ '+(e.message||e)); }
  return {out,steps,tag};
}
