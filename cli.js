// Sabaka IOS-style CLI for routers and switches
import {ip2n,maskLen,netOf,n2ip,okAllowed} from './engine.js';

const sessions=new Map();
const KW={version:'Set routing protocol version',network:'Enable routing on an IP network','passive-interface':'Suppress routing updates on an interface',router:'Enable a routing process',show:'Show running system information',configure:'Enter configuration mode',interface:'Select an interface to configure',ip:'IP configuration',ping:'Send echo messages',traceroute:'Trace route to destination',enable:'Turn on privileged commands',disable:'Turn off privileged commands',exit:'Exit from the current mode',end:'Exit to privileged EXEC',no:'Negate a command or set its defaults',vlan:'VLAN configuration',switchport:'Set switching mode characteristics',hostname:'Set system hostname',shutdown:'Shutdown the selected interface',description:'Interface specific description',write:'Write running configuration to memory',copy:'Copy from one file to another',clear:'Reset functions',do:'Run an EXEC command',route:'Establish static routes',address:'Set the IP address of an interface',mode:'Set trunking mode',access:'Set access mode characteristics',trunk:'Set trunking characteristics',allowed:'Set allowed VLAN characteristics when interface is in trunking mode',encapsulation:'Set encapsulation type',name:'Name of the VLAN',running:'Current operating configuration','running-config':'Current operating configuration',interfaces:'Interface status and configuration',brief:'Brief summary',arp:'ARP table','mac':'MAC configuration','address-table':'MAC forwarding table',version:'System hardware and software status',terminal:'Configure terminal settings',spanning:'Spanning tree'};
const FULL=(d,i)=>(d.type==='router'?'GigabitEthernet':'FastEthernet')+i.name.replace(/^[a-z]+/,'');
const SHORT=(d,i)=>(d.type==='router'?'Gi':'Fa')+i.name.replace(/^[a-z]+/,'');
const expand=str=>{ const o=[]; for(const part of String(str).split(',')){ const m=part.match(/^(\d+)-(\d+)$/); if(m){ for(let k=+m[1];k<=+m[2];k++) o.push(k);} else if(/^\d+$/.test(part)) o.push(+part); else return null; } return o; };
const findIface=(d,str)=>{ const s=String(str).toLowerCase().replace(/\s/g,''); const m=s.match(/^([a-z]+)(\d+(?:\/\d+)*)(?:\.(\d+))?$/); if(!m) return null; const base=d.ifaces.find(i=>i.name.replace(/^[a-z]+/,'')===m[2]); if(!base) return null; const pre=m[1]; const okp=d.type==='router'?'gigabitethernet'.startsWith(pre)&&pre[0]==='g':'fastethernet'.startsWith(pre)&&pre[0]==='f'; if(!okp) return null; if(m[3]) return {base,sub:m[3]}; return {base}; };

function sess(d){ let s=sessions.get(d.id); if(!s){ s={mode:'user',ifs:[],sub:null,vlan:null,hist:[]}; sessions.set(d.id,s);} return s; }
export function prompt(d){ const s=sess(d); const h=d.name; return ({user:'>',priv:'#',config:'(config)#','config-if':'(config-if)#','config-subif':'(config-subif)#','config-vlan':'(config-vlan)#','config-router':'(config-router)#','config-router-ospf':'(config-router)#','config-std-nacl':'(config-std-nacl)#','config-ext-nacl':'(config-ext-nacl)#','config-if-range':'(config-if-range)#'}[s.mode]===undefined)?h+'>':h+({user:'>',priv:'#',config:'(config)#','config-if':'(config-if)#','config-subif':'(config-subif)#','config-vlan':'(config-vlan)#','config-router':'(config-router)#','config-std-nacl':'(config-std-nacl)#','config-ext-nacl':'(config-ext-nacl)#','config-if-range':'(config-if-range)#'}[s.mode]); }
export function banner(d){ return [`${d.name} — ${d.type==='router'?'Router':'Switch'} CLI (IOS-style)`,'اكتب ?  للمساعدة، Tab للإكمال، السهم لفوق للأوامر القديمة. ابدأ بـ: enable ثم configure terminal','']; }

// ---------- helpers ----------
const dotMac=m=>{ const h=m.replace(/:/g,'').toLowerCase(); return h.slice(0,4)+'.'+h.slice(4,8)+'.'+h.slice(8,12); };
function ifStatus(i){ if(!i.up) return ['administratively down','down']; return i.link?['up','up']:['down','down']; }
function pingOut(net,d,target,out){ const r=net.ping(d,target); out.push('Type escape sequence to abort.',`Sending 5, 100-byte ICMP Echos to ${r.ip||target}, timeout is 2 seconds:`);
  if(r.ok){ const h=r.hops.length; out.push('!!!!!',`Success rate is 100 percent (5/5), round-trip min/avg/max = ${h}/${h*2}/${h*3+1} ms`); }
  else { out.push(r.type==='unreach'?'U.U.U':'.....','Success rate is 0 percent (0/5)'); if(r.reason) out.push('  ('+r.reason+')'); }
  return r; }
function traceOut(net,d,target,out){ const r=net.traceroute(d,target); out.push('Type escape sequence to abort.','Tracing the route to '+target,''); if(r.nameFail){ out.push('% Unrecognized host or address, or protocol not running.'); return r; }
  r.rows.forEach(x=>{ const t=x.ip?`${x.ip} ${x.ttl*4} msec ${x.ttl*4} msec ${x.ttl*4} msec`:'* * *'; out.push(`  ${x.ttl} ${t}`); }); return r; }

function runningConfig(net,d){ const o=['Building configuration...','','Current configuration:','!','hostname '+d.name,'!'];
  if(d.type==='switch'){ Object.keys(d.vlans||{}).map(Number).filter(v=>v!==1).sort((a,b)=>a-b).forEach(v=>{ o.push('vlan '+v,' name '+d.vlans[v],'!'); }); }
  for(const i of d.ifaces){ const subs=i.subs||[]; o.push('interface '+FULL(d,i)); if(i.desc) o.push(' description '+i.desc);
    if(d.type==='router'){ if(i.ip) o.push(` ip address ${i.ip} ${i.mask}`); else if(!subs.length) o.push(' no ip address'); }
    else { if(i.mode==='trunk'){ o.push(' switchport mode trunk'); if(i.allowed) o.push(' switchport trunk allowed vlan '+i.allowed); } else { if(i.vlan!==1) o.push(' switchport access vlan '+i.vlan); o.push(' switchport mode access'); } }
    if(i.ospfCost) o.push(' ip ospf cost '+i.ospfCost);
    if(i.natSide) o.push(' ip nat '+i.natSide);
    if(i.aclIn) o.push(' ip access-group '+i.aclIn+' in'); if(i.aclOut) o.push(' ip access-group '+i.aclOut+' out');
    if(!i.up) o.push(' shutdown'); o.push('!');
    for(const sb of subs){ o.push(`interface ${FULL(d,i)}.${sb.id??sb.vlan}`); if(sb.vlan) o.push(' encapsulation dot1q '+sb.vlan); o.push(` ip address ${sb.ip||'0.0.0.0'} ${sb.mask||''}`.trim()); if(sb.aclIn) o.push(' ip access-group '+sb.aclIn+' in'); if(sb.aclOut) o.push(' ip access-group '+sb.aclOut+' out'); o.push('!'); } }
  for(const r of d.routes||[]) o.push(`ip route ${r.net} ${r.mask} ${r.nh}`); if(d.routes&&d.routes.length) o.push('!');
  for(const [id,a] of Object.entries(d.acls||{})){ if(/^\d+$/.test(id)) a.rules.forEach(r=>o.push('access-list '+id+' '+ruleTxt(r))); else { o.push('ip access-list '+a.type+' '+id); a.rules.forEach(r=>o.push(' '+ruleTxt(r))); } o.push('!'); }
  if(d.nat){ (d.nat.statics||[]).forEach(s=>o.push('ip nat inside source static '+s.in+' '+s.out)); (d.nat.rules||[]).forEach(r=>o.push('ip nat inside source list '+r.list+' interface '+FULL(d,{name:r.ifname})+' overload')); o.push('!'); }
  if(d.ospf&&d.ospf.on){ o.push('router ospf '+d.ospf.pid); if(d.ospf.rid) o.push(' router-id '+d.ospf.rid); d.ospf.networks.forEach(n=>o.push(` network ${n.ip} ${n.wc} area ${n.area}`)); (d.ospf.passive||[]).forEach(n=>o.push(' passive-interface '+n)); o.push('!'); }
  if(d.rip&&d.rip.on){ o.push('router rip',' version '+d.rip.ver); d.rip.networks.forEach(n=>o.push(' network '+n)); (d.rip.passive||[]).forEach(n=>o.push(' passive-interface '+n)); o.push(' no auto-summary','!'); }
  o.push('end'); return o; }

const SHOW=[
 {p:'show ip interface brief',d:'Brief summary of IP status and configuration',h:({net,d,out})=>{ out.push('Interface                  IP-Address      OK? Method Status                Protocol'); const rows=[]; for(const i of d.ifaces){ const [st,pr]=ifStatus(i); if(d.type==='router'){ rows.push([FULL(d,i),i.ip||'unassigned',i.ip?'manual':'unset',st,pr]); for(const sb of i.subs||[]) rows.push([FULL(d,i)+'.'+(sb.id??sb.vlan),sb.ip||'unassigned','manual',st,pr]); } else rows.push([FULL(d,i),'unassigned','unset',st,pr]); } rows.forEach(r=>out.push(r[0].padEnd(26)+' '+r[1].padEnd(15)+' YES '+r[2].padEnd(6)+' '+r[3].padEnd(21)+' '+r[4])); }},
 {p:'show ip route',d:'IP routing table',h:({net,d,out})=>{ if(d.type!=='router'){ out.push('% IP routing is not enabled on this device'); return; } out.push('Codes: C - connected, S - static, R - RIP, O - OSPF','','Gateway of last resort is not set','',''); out.pop(); out.pop(); const dflt=(d.routes||[]).find(r=>r.net==='0.0.0.0'); out[out.length-1]=dflt?`Gateway of last resort is ${dflt.nh} to network 0.0.0.0`:'Gateway of last resort is not set'; out.push(''); for(const i of net.l3(d)) if(i.ip&&i.mask&&i.link&&i.up) out.push(`C    ${n2ip(netOf(i.ip,i.mask))}/${maskLen(i.mask)} is directly connected, ${i.phys?FULL(d,i.phys)+'.'+i.name.split('.')[1]:FULL(d,i)}`); for(const r of d.routes||[]) out.push(`S    ${r.net}/${maskLen(r.mask)} [1/0] via ${r.nh}`); if(d.ospf&&d.ospf.on){ const t=net.ospfTable()[d.id]||{}; for(const x of Object.values(t)) out.push(`O    ${x.net}/${maskLen(x.mask)} [110/${x.metric}] via ${x.nh}, 00:00:08, ${FULL(d,x.out.phys||x.out)}${x.out.phys?'.'+x.out.name.split('.')[1]:''}`); }
 if(d.rip&&d.rip.on){ const t=net.ripTable()[d.id]||{}; for(const e of Object.values(t)) if(!e.own) out.push(`R    ${e.net}/${maskLen(e.mask)} [120/${e.metric}] via ${e.nh}, 00:00:12, ${FULL(d,e.out.phys||e.out)}${e.out.phys?'.'+e.out.name.split('.')[1]:''}`); } }},
 {p:'show ip nat translations',d:'NAT translation table',h:({d,out})=>{ const t=(d.nat&&d.nat.trans)||[]; if(!t.length) return; out.push('Pro Inside global      Inside local       Outside global     Hits','--- ---------------    ---------------    ---------------    ----'); t.forEach(x=>out.push(((x.proto==='icmp'?'icmp':'udp ')+' '+x.outside.padEnd(18)+' '+x.inside.padEnd(18)+' '+x.dst.padEnd(18)+' '+x.hits+(x.kind==='static'?'  (static)':'')))); }},
 {p:'show ip nat statistics',d:'NAT statistics',h:({d,out})=>{ const n=d.nat; if(!n){ out.push('% NAT is not configured'); return; } out.push('Total active translations: '+(n.trans||[]).length,'Outside interfaces: '+d.ifaces.filter(i=>i.natSide==='outside').map(i=>FULL(d,i)).join(', '),'Inside interfaces: '+d.ifaces.filter(i=>i.natSide==='inside').map(i=>FULL(d,i)).join(', '),'Hits: '+(n.trans||[]).reduce((s,x)=>s+x.hits,0)); }},
 {p:'show access-lists',d:'List access lists',h:({d,out})=>{ const ids=Object.keys(d.acls||{}); if(!ids.length){ return; } for(const id of ids){ const a=d.acls[id]; out.push((a.type==='standard'?'Standard':'Extended')+' IP access list '+id); a.rules.forEach((r,k)=>out.push('    '+((k+1)*10)+' '+ruleTxt(r)+(r.hits?` (${r.hits} matches)`:''))); } }},
 {p:'show ip access-lists',d:'List IP access lists',h:null},
 {p:'show ip ospf neighbor',d:'OSPF neighbor information',h:({net,d,out})=>{ if(d.type!=='router'||!d.ospf||!d.ospf.on){ return; } out.push('Neighbor ID     Pri   State           Dead Time   Address         Interface'); const seen=new Set(); for(const li of net.ospfIfs(d)){ if((d.ospf.passive||[]).includes((li.phys||li).name)) continue; for(const ep of net.l2reach(d,li.phys||li,li.vlan||null)){ const B=ep.dev; if(!B.ospf||!B.ospf.on) continue; const bi=net.ospfIfs(B).find(x=>(x.phys||x)===ep.iface&&(!x.phys||x.vlan===ep.vlan)&&net.ifaceTo(d,x.ip)===li); if(bi&&!seen.has(B.id+li.name)){ seen.add(B.id+li.name); out.push((B.ospf.rid||bi.ip).padEnd(15)+' 1     FULL/DR         00:00:33    '+bi.ip.padEnd(15)+' '+FULL(d,li.phys||li)); } } } }},
 {p:'show ip protocols',d:'IP routing protocol process parameters',h:({net,d,out})=>{ if(d.type!=='router'||!d.rip||!d.rip.on){ out.push('*** IP Routing is NSF aware ***'); return; } out.push('Routing Protocol is "rip"','  Sending updates every 30 seconds, next due in 12 seconds','  Default version control: send version '+d.rip.ver+', receive version '+d.rip.ver,'  Maximum hop count is 15','  Routing for Networks:'); d.rip.networks.forEach(n=>out.push('    '+n)); out.push('  Passive Interface(s):'); (d.rip.passive||[]).forEach(n=>out.push('    '+n)); out.push('  Routing Information Sources:','    Gateway         Distance      Last Update'); const nb=new Set(Object.values(net.ripTable()[d.id]||{}).filter(e=>e.nh).map(e=>e.nh)); nb.forEach(g=>out.push('    '+g.padEnd(16)+'120           00:00:12')); }},
{p:'show spanning-tree',d:'Spanning tree status',h:({net,d,out})=>{ if(d.type!=='switch'){ out.push('% Invalid input: STP exists only on switches'); return; } if(d.stpOn===false){ out.push('Spanning tree disabled'); return; } const s=net.stp(); const r=s.root; const b=net.bid(d), rb=net.bid(r); out.push('VLAN0001','  Spanning tree enabled protocol ieee','  Root ID    Priority    '+rb.p,'             Address     '+rb.m, r===d?'             This bridge is the root':'             Cost        '+s.cost[d.id]+'  (root: '+r.name+')','','  Bridge ID  Priority    '+b.p,'             Address     '+b.m,'','Interface           Role Sts Cost      Prio.Nbr Type','------------------- ---- --- --------- -------- --------'); d.ifaces.forEach((i,k)=>{ const ro=s.roles[d.id+'|'+i.name]; if(!ro) return; out.push(i.name.padEnd(19)+' '+({root:'Root',designated:'Desg',blocked:'Altn'})[ro]+' '+(ro==='blocked'?'BLK':'FWD')+' 4         128.'+(k+1)+'    P2p'); }); }},
  {p:'show vlan brief',d:'VLAN membership summary',h:({d,out})=>{ if(d.type!=='switch'){ out.push('% Invalid input: VLANs exist only on switches'); return; } out.push('VLAN Name                             Status    Ports','---- -------------------------------- --------- -------------------------------'); Object.keys(d.vlans).map(Number).sort((a,b)=>a-b).forEach(v=>{ const ports=d.ifaces.filter(i=>i.mode!=='trunk'&&i.vlan===v).map(i=>SHORT(d,i)).join(', '); out.push(String(v).padEnd(4)+' '+d.vlans[v].padEnd(32)+' active    '+ports); }); }},
 {p:'show vlan',d:'VLAN Information',h:null},
 {p:'show mac address-table',d:'MAC forwarding table',h:({d,out})=>{ if(d.type!=='switch'){ out.push('% Invalid input: MAC table exists only on switches'); return; } out.push('          Mac Address Table','-------------------------------------------','Vlan    Mac Address       Type        Ports','----    -----------       --------    -----'); for(const [m,v] of Object.entries(d.mac)){ if(v===true) continue; out.push(String(v.vlan).padStart(4)+'    '+dotMac(m)+'    DYNAMIC     '+SHORT(d,d.ifaces.find(i=>i.name===v.port)||d.ifaces[0])); } }},
 {p:'show interfaces trunk',d:'Interface trunk information',h:({d,out})=>{ const t=d.ifaces.filter(i=>i.mode==='trunk'); if(d.type!=='switch'||!t.length){ return; } out.push('Port        Mode         Encapsulation  Status        Native vlan'); t.forEach(i=>out.push(SHORT(d,i).padEnd(11)+' on           802.1q         '+(i.link?'trunking':'not-trunking').padEnd(13)+' 1')); out.push('','Port        Vlans allowed on trunk'); t.forEach(i=>out.push(SHORT(d,i).padEnd(11)+' '+(i.allowed||'1-4094'))); }},
 {p:'show interfaces status',d:'Interface status',h:({d,out})=>{ if(d.type!=='switch'){ out.push('% Invalid input'); return; } out.push('Port      Name               Status       Vlan       Duplex  Speed Type'); d.ifaces.forEach(i=>out.push(SHORT(d,i).padEnd(9)+' '+(i.desc||'').padEnd(18).slice(0,18)+' '+(!i.up?'disabled':i.link?'connected':'notconnect').padEnd(12)+' '+(i.mode==='trunk'?'trunk':String(i.vlan)).padEnd(10)+' auto    auto  10/100BaseTX')); }},
 {p:'show interfaces',d:'Interface status and configuration',h:({d,out})=>{ for(const i of d.ifaces){ const [st,pr]=ifStatus(i); out.push(`${FULL(d,i)} is ${st}, line protocol is ${pr}`,`  Hardware is ${d.type==='router'?'GigabitEthernet':'Fast Ethernet'}, address is ${i.mac}`); if(i.ip) out.push(`  Internet address is ${i.ip}/${maskLen(i.mask)}`); } }},
 {p:'show arp',d:'ARP table',h:({d,out})=>{ out.push('Protocol  Address          Age (min)  Hardware Addr   Type   Interface'); for(const [k,m] of Object.entries(d.arp)){ const [ifn,ip]=k.split('|'); out.push(('Internet  '+ip).padEnd(27)+' 0          '+dotMac(m)+'  ARPA   '+ifn); } }},
 {p:'show ip arp',d:'ARP table',h:null},
 {p:'show running-config',d:'Current operating configuration',h:({net,d,out})=>out.push(...runningConfig(net,d)),priv:true},
 {p:'show version',d:'System hardware and software status',h:({d,out})=>out.push('Sabaka IOS-style Software, Version 1.0',d.name+' uptime is 1 minute','System image file is "sabaka:ios-sim"','Ports: '+d.ifaces.length)},
];
SHOW.find(x=>x.p==='show ip access-lists').h=SHOW.find(x=>x.p==='show access-lists').h; SHOW.find(x=>x.p==='show vlan').h=SHOW.find(x=>x.p==='show vlan brief').h; SHOW.find(x=>x.p==='show ip arp').h=SHOW.find(x=>x.p==='show arp').h;

const EXEC=[
 {p:'ping <target>',d:'Send echo messages',h:({net,d,out,res,a})=>{ res.r=pingOut(net,d,a[0],out); res.tag=res.r.ok?'ping-ok':'ping-fail'; res.steps=res.r.steps; }},
 {p:'traceroute <target>',d:'Trace route to destination',h:({net,d,out,res,a})=>{ res.r=traceOut(net,d,a[0],out); res.steps=res.r.steps; if(res.r.ok) res.tag='trace-ok'; }},
 {p:'write memory',d:'Write to NV memory',h:({out})=>out.push('Building configuration...','[OK]')},
 {p:'copy running-config startup-config',d:'Copy to NV memory',h:({out})=>out.push('Destination filename [startup-config]?','Building configuration...','[OK]')},
 {p:'clear arp-cache',d:'Clear the ARP table',h:({d})=>{ d.arp={}; }},
 {p:'clear mac address-table dynamic',d:'Clear learned MAC addresses',h:({d})=>{ d.mac={}; }},
 {p:'terminal length <n>',d:'Set terminal paging',h:()=>{}},
];
const USER_ONLY=[
 {p:'enable',d:'Turn on privileged commands',h:({s})=>{ s.mode='priv'; }},
 {p:'exit',d:'Exit from the EXEC',h:({out})=>out.push('(مفيش logout في المحاكي — اكتب enable)')},
];
const PRIV_ONLY=[
 {p:'configure terminal',d:'Configuration from the terminal',h:({out,s})=>{ s.mode='config'; out.push('Enter configuration commands, one per line.  End with CNTL/Z.'); }},
 {p:'disable',d:'Turn off privileged commands',h:({s})=>{ s.mode='user'; }},
 {p:'exit',d:'Exit to user mode',h:({s})=>{ s.mode='user'; }},
];
const GLOBAL=[
 {p:'hostname <name>',d:'Set system hostname',h:({d,a,res})=>{ d.name=a[0]; res.changed=true; }},
 {p:'interface range <spec...>',d:'Configure a range of interfaces',h:({d,a,s,out})=>{ if(d.type!=='switch'){ out.push('% Invalid input detected: interface range is for switches'); return; } const m=a.join(' ').match(/^([a-zA-Z]+)\s*(\d+)\/(\d+)\s*-\s*(?:[a-zA-Z]*\d+\/)?(\d+)$/); if(!m){ out.push('% Invalid range. مثال: interface range fa0/1 - 4'); return; } const ifs=[]; for(let k=+m[3];k<=+m[4];k++){ const f=findIface(d,m[1]+m[2]+'/'+k); if(!f){ out.push('% Interface fa'+m[2]+'/'+k+' not found'); return; } ifs.push(f.base);} s.ifs=ifs; s.mode='config-if'; s.range=true; }},
 {p:'interface <name...>',d:'Select an interface to configure',h:({d,a,s,out})=>{ const f=findIface(d,a.join('')); if(!f){ out.push(`% Invalid interface "${a.join(' ')}". المتاح: ${d.ifaces.map(i=>i.name).join(', ')}`); return; } s.range=false; if(f.sub){ if(d.type!=='router'){ out.push('% Subinterfaces are only supported on routers'); return; } f.base.subs=f.base.subs||[]; let sb=f.base.subs.find(x=>String(x.id??x.vlan)===f.sub); if(!sb){ sb={id:+f.sub,vlan:null,ip:'',mask:''}; f.base.subs.push(sb); } s.ifs=[f.base]; s.sub=sb; s.mode='config-subif'; } else { s.ifs=[f.base]; s.sub=null; s.mode='config-if'; } }},
 {p:'ip route <net> <mask> <nexthop>',d:'Establish static routes',h:({net,d,a,out,res})=>{ if(d.type!=='router'){ out.push('% IP routing is not available on a switch'); return; } if(ip2n(a[0])===null||maskLen(a[1])===null||ip2n(a[2])===null){ out.push('% Invalid input detected. مثال: ip route 10.0.2.0 255.255.255.0 10.0.12.2'); return; } d.routes=(d.routes||[]).filter(r=>!(r.net===a[0]&&r.mask===a[1])); d.routes.push({net:a[0],mask:a[1],nh:a[2]}); if(!net.ifaceTo(d,a[2])) out.push('% Warning: next-hop مش في subnet أي interface متظبط دلوقتي'); }},
 {p:'no ip route <net> <mask>',d:'Remove a static route',h:({d,a})=>{ d.routes=(d.routes||[]).filter(r=>!(r.net===a[0]&&r.mask===a[1])); }},
 {p:'vlan <id>',d:'Configure a VLAN',h:({d,a,s,out})=>{ if(d.type!=='switch'){ out.push('% VLANs exist only on switches'); return; } const v=+a[0]; if(!(v>0&&v<4095)){ out.push('% Invalid VLAN id (1-4094)'); return; } d.vlans=d.vlans||{1:'default'}; if(!d.vlans[v]) d.vlans[v]='VLAN'+String(v).padStart(4,'0'); s.vlan=v; s.mode='config-vlan'; }},
 {p:'no vlan <id>',d:'Delete a VLAN',h:({d,a})=>{ if(+a[0]!==1&&d.vlans) delete d.vlans[+a[0]]; }},
 {p:'router rip',d:'Enable the RIP routing process',h:({d,s,out})=>{ if(d.type!=='router'){ out.push('% RIP is for routers'); return; } d.rip=d.rip||{on:true,networks:[],passive:[],ver:2}; d.rip.on=true; s.mode='config-router'; }},
 {p:'router ospf <pid>',d:'Enable the OSPF routing process',h:({d,a,s,out})=>{ if(d.type!=='router'){ out.push('% OSPF is for routers'); return; } if(!(+a[0]>0&&+a[0]<65536)){ out.push('% Invalid process id (1-65535)'); return; } d.ospf=d.ospf||{on:true,pid:+a[0],networks:[],passive:[]}; d.ospf.on=true; d.ospf.pid=+a[0]; s.mode='config-router-ospf'; }},
 {p:'no router ospf <pid>',d:'Disable OSPF',h:({d,res})=>{ if(d.ospf) d.ospf.on=false; res.changed=true; }},
 {p:'no router rip',d:'Disable RIP',h:({d,res})=>{ if(d.rip) d.rip.on=false; res.changed=true; }},
 {p:'access-list <id> <rule...>',d:'Add an access list entry',h:({d,a,out,res})=>{ if(d.type!=='router'){ out.push('% ACLs are supported on routers'); return; } const id=a[0]; if(!/^\d+$/.test(id)){ out.push('% Invalid ACL number'); return; } const n=+id; const type=(n>=1&&n<=99)?'standard':(n>=100&&n<=199)?'extended':null; if(!type){ out.push('% ACL number must be 1-99 (standard) or 100-199 (extended)'); return; } const acl=getAcl(d,id,type); const r=parseRule(acl,a.slice(1),out); if(r){ acl.rules.push(r); res.changed=true; } }},
 {p:'no access-list <id>',d:'Remove an access list',h:({d,a,res})=>{ if(d.acls) delete d.acls[a[0]]; res.changed=true; }},
 {p:'ip access-list standard <name>',d:'Named standard access list',h:({d,a,s,out})=>{ if(d.type!=='router'){ out.push('% ACLs are supported on routers'); return; } s.nacl=a[0]; getAcl(d,a[0],'standard'); s.mode='config-std-nacl'; }},
 {p:'ip access-list extended <name>',d:'Named extended access list',h:({d,a,s,out})=>{ if(d.type!=='router'){ out.push('% ACLs are supported on routers'); return; } s.nacl=a[0]; getAcl(d,a[0],'extended'); s.mode='config-ext-nacl'; }},
 {p:'no ip access-list <kind> <name>',d:'Remove a named access list',h:({d,a})=>{ if(d.acls) delete d.acls[a[1]]; }},
 {p:'ip nat inside source list <id> interface <name...> overload',d:'PAT: translate to an interface address',h:({d,a,out,res})=>{ if(d.type!=='router'){ out.push('% NAT is for routers'); return; } d.nat=d.nat||{rules:[],statics:[],trans:[]}; const f=findIface(d,a.slice(1).filter(x=>x!=='overload').join('')); if(!f||f.sub){ out.push('% Invalid interface'); return; } d.nat.rules=d.nat.rules.filter(r=>r.list!==a[0]); d.nat.rules.push({list:a[0],ifname:f.base.name,overload:true}); res.changed=true; }},
 {p:'ip nat inside source static <in> <out>',d:'Static NAT',h:({d,a,out,res})=>{ if(d.type!=='router'){ out.push('% NAT is for routers'); return; } if(ip2n(a[0])===null||ip2n(a[1])===null){ out.push('% Invalid IP. مثال: ip nat inside source static 192.168.1.10 203.0.113.10'); return; } d.nat=d.nat||{rules:[],statics:[],trans:[]}; d.nat.statics=d.nat.statics.filter(x=>x.in!==a[0]); d.nat.statics.push({in:a[0],out:a[1]}); res.changed=true; }},
 {p:'no ip nat inside source <rest...>',d:'Remove NAT rules',h:({d,res})=>{ if(d.nat){ d.nat.rules=[]; d.nat.statics=[]; d.nat.trans=[]; } res.changed=true; }},
 {p:'ip default-gateway <ip>',d:'Management default gateway',h:({d,a})=>{ d.gateway=a[0]; }},
 {p:'enable secret <pw>',d:'Set enable secret',h:()=>{}}, {p:'enable password <pw>',d:'Set enable password',h:()=>{}},
 {p:'banner motd <text...>',d:'Message of the day',h:()=>{}}, {p:'ip routing',d:'Enable IP routing',h:()=>{}}, {p:'no ip domain-lookup',d:'Disable DNS lookup',h:()=>{}},
 {p:'service password-encryption',d:'Encrypt passwords',h:()=>{}}, {p:'spanning-tree mode <m>',d:'Spanning tree mode',h:()=>{}},
 {p:'spanning-tree vlan <id> priority <n>',d:'Set bridge priority (multiple of 4096)',h:({d,a,out,res})=>{ if(d.type!=='switch'){ out.push('% STP is for switches'); return; } const p=+a[a.length-1]; if(!(p>=0&&p<=61440&&p%4096===0)){ out.push('% Bridge Priority must be in increments of 4096. مثال: 4096 / 8192 / 28672'); return; } d.stpPrio=p; res.changed=true; }},
 {p:'spanning-tree vlan <id> root primary',d:'Become root bridge',h:({net,d,a,out,res})=>{ if(d.type!=='switch'){ out.push('% STP is for switches'); return; } const others=net.devices.filter(x=>x.type==='switch'&&x!==d).map(x=>x.stpPrio??32768); const m=Math.min(32768,...others); d.stpPrio=Math.max(0,Math.min(24576,m-4096)); res.changed=true; }},
 {p:'no spanning-tree vlan <id>',d:'Disable STP',h:({d,res})=>{ d.stpOn=false; res.changed=true; }},
 {p:'spanning-tree vlan <id>',d:'Enable STP',h:({d,res})=>{ d.stpOn=true; res.changed=true; }},
 {p:'exit',d:'Exit from configure mode',h:({s})=>{ s.mode='priv'; }}, {p:'end',d:'Exit to privileged EXEC',h:({s})=>{ s.mode='priv'; }},
 {p:'do <cmd...>',d:'To run exec commands in config mode',h:null},
];
const IF_ROUTER=[
 {p:'ip address <ip> <mask>',d:'Set the IP address of an interface',h:({net,d,a,s,out,res})=>{ if(ip2n(a[0])===null||maskLen(a[1])===null){ out.push('% Invalid input detected. مثال: ip address 192.168.1.1 255.255.255.0'); return; } const t=s.sub||s.ifs[0]; if(s.sub&&!s.sub.vlan){ out.push('% Configure "encapsulation dot1q <vlan>" first on the subinterface'); return; } const o=net.owner(a[0]); if(o&&o.i!==t&&!(o.i.phys&&o.i.phys===s.ifs[0])){ out.push('% '+a[0]+' is already assigned to '+o.d.name); return; } t.ip=a[0]; t.mask=a[1]; res.tag='ios-ip'; }},
 {p:'ip access-group <id> <dir>',d:'Specify access control for packets',h:({d,a,s,out,res})=>{ const dir=a[1]; if(dir!=='in'&&dir!=='out'){ out.push('% Invalid input. اكتب in أو out'); return; } if(!(d.acls||{})[a[0]]) out.push('% تحذير: الـ ACL '+a[0]+' لسه مش متعرّفة (هتتطبق لما تتعرّف)'); const t=s.sub?(s.sub.subRef||s.sub):s.ifs[0]; t[dir==='in'?'aclIn':'aclOut']=a[0]; res.changed=true; }},
 {p:'no ip access-group <id> <dir>',d:'Remove access control from the interface',h:({a,s,res})=>{ const t=s.sub||s.ifs[0]; delete t[a[1]==='in'?'aclIn':'aclOut']; res.changed=true; }},
 {p:'ip ospf cost <n>',d:'Interface cost',h:({a,s,out})=>{ if(!(+a[0]>0)){ out.push('% Invalid cost'); return; } s.ifs[0].ospfCost=+a[0]; }},
 {p:'ip nat <side>',d:'NAT interface commands (inside | outside)',h:({a,s,out,res})=>{ if(a[0]!=='inside'&&a[0]!=='outside'){ out.push('% Invalid input. اكتب ip nat inside أو ip nat outside'); return; } const t=s.sub?(s.sub.subRef||s.sub):s.ifs[0]; t.natSide=a[0]; res.changed=true; }},
 {p:'no ip nat <side>',d:'Remove NAT role',h:({s,res})=>{ const t=s.sub||s.ifs[0]; delete t.natSide; res.changed=true; }},
 {p:'no ip address',d:'Remove the IP address',h:({s})=>{ const t=s.sub||s.ifs[0]; t.ip=''; t.mask=''; }},
 {p:'encapsulation dot1q <vlan>',d:'IEEE 802.1Q Virtual LAN',h:({s,a,out})=>{ if(!s.sub){ out.push('% Encapsulation is configured on subinterfaces only'); return; } if(!(+a[0]>0&&+a[0]<4095)){ out.push('% Invalid VLAN'); return; } s.sub.vlan=+a[0]; s.ifs[0].ip=''; s.ifs[0].mask=''; }},
];
const IF_SWITCH=[
 {p:'switchport mode access',d:'Set trunking mode to ACCESS unconditionally',h:({s})=>s.ifs.forEach(i=>{ i.mode='access'; })},
 {p:'switchport mode trunk',d:'Set trunking mode to TRUNK unconditionally',h:({s})=>s.ifs.forEach(i=>{ i.mode='trunk'; })},
 {p:'switchport access vlan <id>',d:'Set VLAN when interface is in access mode',h:({d,a,s,out})=>{ const v=+a[0]; if(!(v>0&&v<4095)){ out.push('% Invalid VLAN'); return; } d.vlans=d.vlans||{1:'default'}; if(!d.vlans[v]){ d.vlans[v]='VLAN'+String(v).padStart(4,'0'); out.push(`% Access VLAN does not exist. Creating vlan ${v}`); } s.ifs.forEach(i=>{ i.vlan=v; i.mode='access'; }); }},
 {p:'switchport trunk allowed vlan all',d:'All VLANs',h:({s})=>s.ifs.forEach(i=>{ i.allowed=''; })},
 {p:'switchport trunk allowed vlan add <list>',d:'add VLANs to the current list',h:({s,a,out})=>{ const l=expand(a[0]); if(!l){ out.push('% Bad VLAN list'); return; } s.ifs.forEach(i=>{ const cur=i.allowed?i.allowed.split(',').map(Number):[]; i.allowed=[...new Set([...cur,...l])].sort((x,y)=>x-y).join(','); }); }},
 {p:'switchport trunk allowed vlan remove <list>',d:'remove VLANs from the current list',h:({s,a,out})=>{ const l=expand(a[0]); if(!l){ out.push('% Bad VLAN list'); return; } s.ifs.forEach(i=>{ const cur=i.allowed?i.allowed.split(',').map(Number):[...Array(4094).keys()].map(x=>x+1); const left=cur.filter(v=>!l.includes(v)); i.allowed=left.length>200?'':left.join(','); }); }},
 {p:'switchport trunk allowed vlan <list>',d:'Set allowed VLANs when interface is in trunking mode',h:({s,a,out})=>{ const l=expand(a[0]); if(!l){ out.push('% Bad VLAN list. مثال: 10,20 أو 10-20'); return; } s.ifs.forEach(i=>{ i.allowed=l.join(','); }); }},
 {p:'switchport trunk encapsulation dot1q',d:'Set trunking encapsulation',h:()=>{}}, {p:'switchport nonegotiate',d:'Device will not engage in negotiation',h:()=>{}},
];
const IF_COMMON=[
 {p:'shutdown',d:'Shutdown the selected interface',h:({s})=>(s.sub?[s.ifs[0]]:s.ifs).forEach(i=>{ i.up=false; })},
 {p:'no shutdown',d:'Enable the selected interface',h:({s})=>s.ifs.forEach(i=>{ i.up=true; })},
 {p:'description <text...>',d:'Interface specific description',h:({s,a})=>s.ifs.forEach(i=>{ i.desc=a.join(' '); })},
 {p:'exit',d:'Exit from interface mode',h:({s})=>{ s.mode='config'; }}, {p:'end',d:'Exit to privileged EXEC',h:({s})=>{ s.mode='priv'; }},
];
const VLAN_DEFS=[
 {p:'name <vname>',d:'Ascii name of the VLAN',h:({d,s,a})=>{ d.vlans[s.vlan]=a[0]; }},
 {p:'exit',d:'Apply changes and exit',h:({s})=>{ s.mode='config'; }}, {p:'end',d:'Exit to privileged EXEC',h:({s})=>{ s.mode='priv'; }},
];

const NACL_DEFS=[
 {p:'permit <rule...>',d:'Specify packets to forward',h:({d,s,a,out,res,line})=>{ const acl=d.acls[s.nacl]; const r=parseRule(acl,['permit',...a],out); if(r){ acl.rules.push(r); res.changed=true; } }},
 {p:'deny <rule...>',d:'Specify packets to reject',h:({d,s,a,out,res})=>{ const acl=d.acls[s.nacl]; const r=parseRule(acl,['deny',...a],out); if(r){ acl.rules.push(r); res.changed=true; } }},
 {p:'exit',d:'Exit from ACL configuration mode',h:({s})=>{ s.mode='config'; }}, {p:'end',d:'Exit to privileged EXEC',h:({s})=>{ s.mode='priv'; }},
];
const OSPF_DEFS=[
 {p:'network <ip> <wildcard> area <n>',d:'Enable routing on an IP network',h:({d,a,out})=>{ if(ip2n(a[0])===null||!isWild(a[1])){ out.push('% Invalid network/wildcard. مثال: network 10.0.0.0 0.0.0.255 area 0'); return; } if(+a[2]!==0){ out.push('% المحاكي بيدعم area 0 بس (single-area)'); return; } d.ospf.networks=d.ospf.networks.filter(x=>!(x.ip===a[0]&&x.wc===a[1])); d.ospf.networks.push({ip:a[0],wc:a[1],area:0}); }},
 {p:'router-id <ip>',d:'Set router-id',h:({d,a,out})=>{ if(ip2n(a[0])===null){ out.push('% Invalid router-id'); return; } d.ospf.rid=a[0]; }},
 {p:'passive-interface <name...>',d:'Suppress routing updates on an interface',h:({d,a,out})=>{ const f=findIface(d,a.join('')); if(!f||f.sub){ out.push('% Invalid interface'); return; } if(!d.ospf.passive.includes(f.base.name)) d.ospf.passive.push(f.base.name); }},
 {p:'exit',d:'Exit from routing protocol configuration mode',h:({s})=>{ s.mode='config'; }}, {p:'end',d:'Exit to privileged EXEC',h:({s})=>{ s.mode='priv'; }},
];
const RIP_DEFS=[
 {p:'version <n>',d:'Set routing protocol version',h:({d,a})=>{ d.rip.ver=+a[0]; }},
 {p:'network <ip>',d:'Enable routing on an IP network',h:({d,a,out})=>{ if(ip2n(a[0])===null){ out.push('% Invalid network address. مثال: network 192.168.1.0'); return; } if(!d.rip.networks.includes(a[0])) d.rip.networks.push(a[0]); }},
 {p:'no network <ip>',d:'Remove a network',h:({d,a})=>{ d.rip.networks=d.rip.networks.filter(x=>x!==a[0]); }},
 {p:'no auto-summary',d:'Disable automatic network summarization',h:()=>{}},
 {p:'passive-interface <name...>',d:'Suppress routing updates on an interface',h:({d,a,out})=>{ const f=findIface(d,a.join('')); if(!f||f.sub){ out.push('% Invalid interface'); return; } const n=f.base.name; if(!d.rip.passive.includes(n)) d.rip.passive.push(n); }},
 {p:'exit',d:'Exit from routing protocol configuration mode',h:({s})=>{ s.mode='config'; }}, {p:'end',d:'Exit to privileged EXEC',h:({s})=>{ s.mode='priv'; }},
];

function parseAddr(t,i){ if(t[i]==='any') return {s:{any:true},n:i+1}; if(t[i]==='host'&&ip2n(t[i+1])!==null) return {s:{ip:t[i+1],wc:'0.0.0.0'},n:i+2}; if(ip2n(t[i])!==null){ if(t[i+1]!==undefined&&ip2n(t[i+1])!==null&&/^(0|\d+)\./.test(t[i+1])&&isWild(t[i+1])) return {s:{ip:t[i],wc:t[i+1]},n:i+2}; return {s:{ip:t[i],wc:'0.0.0.0'},n:i+1}; } return null; }
const isWild=w=>{ const n=ip2n(w); if(n===null) return false; return (((n+1)>>>0)&n)===0; };
function parseRule(acl,t,out){ const act=t[0]; if(!['permit','deny'].includes(act)){ out.push('% Invalid input detected'); return null; } let i=1; const r={act};
  if(acl.type==='standard'){ const a=parseAddr(t,i); if(!a||a.n!==t.length){ out.push('% Invalid input. مثال: permit 192.168.1.0 0.0.0.255  أو  deny host 10.0.0.5  أو  permit any'); return null; } r.src=a.s; return r; }
  const pr=t[i]; if(!['ip','icmp','udp','tcp'].includes(pr)){ out.push('% Invalid protocol. استخدم: ip / icmp / udp / tcp'); return null; } r.proto=pr; i++;
  const s=parseAddr(t,i); if(!s){ out.push('% Invalid source address'); return null; } r.src=s.s; i=s.n; const d=parseAddr(t,i); if(!d){ out.push('% Invalid destination address'); return null; } r.dst=d.s; i=d.n;
  if(i<t.length){ if(t[i]==='eq'&&(pr==='udp'||pr==='tcp')){ const p={domain:53,dns:53,www:80,http:80,https:443,telnet:23,ssh:22,ftp:21,smtp:25}[t[i+1]]??+t[i+1]; if(!(p>0)){ out.push('% Invalid port'); return null; } r.port=p; i+=2; } if(i<t.length){ out.push('% Invalid input detected at the end of the rule'); return null; } }
  return r; }
const spec=s=>s.any?'any':(s.wc==='0.0.0.0'?'host '+s.ip:s.ip+' '+s.wc);
const ruleTxt=r=>r.act+(r.proto?' '+r.proto:'')+' '+spec(r.src)+(r.dst?' '+spec(r.dst):'')+(r.port?' eq '+r.port:'');
const getAcl=(d,id,type)=>{ d.acls=d.acls||{}; if(!d.acls[id]) d.acls[id]={type,rules:[]}; return d.acls[id]; };
function defsFor(d,s){
  const showDefs=SHOW.filter(x=>s.mode==='priv'||s.mode==='config'||!x.priv);
  if(s.mode==='user') return [...USER_ONLY,...EXEC.filter(x=>/^(ping|traceroute)/.test(x.p)),...showDefs];
  if(s.mode==='priv') return [...PRIV_ONLY,...EXEC,...showDefs];
  if(s.mode==='config') return GLOBAL;
  if(s.mode==='config-if'||s.mode==='config-subif') return [...IF_COMMON,...(d.type==='router'?IF_ROUTER:IF_SWITCH),...GLOBAL.filter(x=>!['exit','end'].includes(x.p))];
  if(s.mode==='config-std-nacl'||s.mode==='config-ext-nacl') return NACL_DEFS;
  if(s.mode==='config-router-ospf') return [...OSPF_DEFS,...GLOBAL.filter(x=>!['exit','end','router rip'].includes(x.p))];
  if(s.mode==='config-router') return [...RIP_DEFS,...GLOBAL.filter(x=>!['exit','end','router rip'].includes(x.p))];
  if(s.mode==='config-vlan') return [...VLAN_DEFS,...GLOBAL.filter(x=>!['exit','end'].includes(x.p))];
  return [];
}
const isParam=t=>t.startsWith('<');
function matchDefs(defs,toks){
  const complete=[],incomplete=[];
  for(const def of defs){ const pt=def.p.split(' '); let i=0,exact=0,ok=true;
    for(;i<toks.length;i++){ const t=pt[i]; if(t===undefined){ ok=false; break; }
      if(isParam(t)){ if(t.endsWith('...>')){ i=toks.length; break; } continue; }
      const w=toks[i].toLowerCase(); if(!t.startsWith(w)){ ok=false; break; } if(t===w) exact++; }
    if(!ok) continue;
    const restParam=pt.length&&isParam(pt[pt.length-1])&&pt[pt.length-1].endsWith('...>')&&toks.length>=pt.length;
    if(toks.length>=pt.length||restParam) complete.push({def,exact}); else incomplete.push({def});
  }
  return {complete,incomplete};
}
function nextOptions(defs,toks,partial){
  const out=new Map(); let cr=false; const n=toks.length;
  for(const def of defs){ const pt=def.p.split(' '); let ok=true;
    for(let i=0;i<n;i++){ const t=pt[i]; if(t===undefined){ ok=false; break;} if(isParam(t)) continue; if(!t.startsWith(toks[i].toLowerCase())){ ok=false; break; } }
    if(!ok) continue;
    if(pt.length===n&&partial===''){ cr=true; continue; }
    const t=pt[n]; if(t===undefined) continue;
    if(isParam(t)){ if(partial==='') out.set(t,'');  continue; }
    if(partial===''||t.startsWith(partial.toLowerCase())) out.set(t,(pt.length===n+1?def.d:KW[t])||''); }
  return {opts:[...out.entries()],cr};
}
export function help(d,line){
  const s=sess(d); const defs=defsFor(d,s); const toks=line.split(/\s+/).filter(Boolean); const trailing=/\s$/.test(line)||line==='';
  const partial=trailing?'':toks.pop()||''; const {opts,cr}=nextOptions(defs,toks,partial); const out=[];
  opts.forEach(([t,dd])=>out.push('  '+t.padEnd(22)+dd)); if(cr) out.push('  <cr>'); if(!out.length) out.push('% Unrecognized command'); return out;
}
export function complete(d,line){
  const s=sess(d); const defs=defsFor(d,s); const toks=line.split(/\s+/).filter(Boolean); if(!toks.length||/\s$/.test(line)) return {line,options:[]};
  const partial=toks.pop(); const {opts}=nextOptions(defs,toks,partial); const kws=opts.map(o=>o[0]).filter(t=>!isParam(t));
  if(!kws.length) return {line,options:[]}; if(kws.length===1) return {line:[...toks,kws[0]].join(' ')+' ',options:[]};
  let p=kws[0]; for(const k of kws) while(!k.startsWith(p)) p=p.slice(0,-1); return {line:[...toks,p].join(' '),options:kws};
}
export function exec(net,d,line){
  const s=sess(d); const out=[]; const res={out,steps:[],tag:null}; const raw=line.trim(); if(!raw) return res;
  if(raw==='?'||raw.endsWith('?')){ help(d,raw.slice(0,-1)).forEach(x=>out.push(x)); return res; }
  const pm=raw.match(/^(.*?)\s*\|\s*(include|exclude|begin|section|count)\s*(.*)$/i);
  if(pm){ const r=exec(net,d,pm[1]); s.hist.pop(); s.hist.push(raw); const mode=pm[2].toLowerCase(), pat=pm[3].trim(); let rx; try{ rx=new RegExp(pat,'i'); }catch(e){ rx=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'); }
    let o=r.out;
    if(mode==='include') o=o.filter(l=>rx.test(l)); else if(mode==='exclude') o=o.filter(l=>!rx.test(l));
    else if(mode==='begin'){ const i=o.findIndex(l=>rx.test(l)); o=i<0?[]:o.slice(i); }
    else if(mode==='section'){ const res2=[]; let on=false; o.forEach(l=>{ if(!/^\s/.test(l)&&l!=='!') on=rx.test(l); if(on) res2.push(l); }); o=res2; }
    else if(mode==='count'){ o=['Number of lines which match regexp = '+o.filter(l=>rx.test(l)).length]; }
    r.out.length=0; o.forEach(l=>r.out.push(l)); return r; }
  s.hist.push(raw);
  let toks=raw.split(/\s+/); let defs=defsFor(d,s);
  const run=(toks,defs,top)=>{
    // do <cmd>: run in priv context
    if(s.mode.startsWith('config')&&toks[0].toLowerCase()==='do'&&toks.length>1){ const save=s.mode; const keep={...s}; s.mode='priv'; run(toks.slice(1),defsFor(d,s)); Object.assign(s,keep); s.mode=save; return; }
    // 'no <cmd>' in interface/global modes
    const {complete,incomplete}=matchDefs(defs,toks);
    let pick=null;
    if(complete.length===1) pick=complete[0]; else if(complete.length>1){ const best=Math.max(...complete.map(c=>c.exact)); const bests=complete.filter(c=>c.exact===best); if(bests.length===1) pick=bests[0]; else { const cmds=new Set(bests.map(b=>b.def.p.split(' ').slice(0,toks.length).join(' '))); if(cmds.size>1){ out.push('% Ambiguous command: "'+raw+'"'); return; } pick=bests.sort((x,y)=>y.def.p.length-x.def.p.length)[0]; } }
    if(!pick){ if(incomplete.length){ out.push('% Incomplete command.'); return; } out.push(`% Invalid input detected at '^' marker.`); out.push('   '+raw); const pos=toks.length>1?raw.indexOf(toks[toks.length-1]):0; out.push('   '+' '.repeat(pos)+'^'); return; }
    const pt=pick.def.p.split(' '); const a=[]; toks.forEach((t,i)=>{ if(pt[i]&&isParam(pt[i])) a.push(pt[i].endsWith('...>')?toks.slice(i).join(' '):t); });
    if(pt.some(t=>t.endsWith('...>'))){ const idx=pt.findIndex(t=>t.endsWith('...>')); a.length=0; pt.forEach((t,i)=>{ if(isParam(t)){ if(i===idx) a.push(...toks.slice(i)); else a.push(toks[i]); } }); }
    if(pick.def.h) pick.def.h({net,d,s,a,out,res});
  };
  run(toks,defs);
  if(res.changed) res.changed=true; return res;
}
