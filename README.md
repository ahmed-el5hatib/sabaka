# Sabaka (سباكة) 3D
محاكي شبكات تعليمي مفتوح المصدر يعمل في المتصفح (Three.js). Original code, MIT license.

- أجهزة: PC, Switch, Router, Server — drag & drop في مشهد 3D
- L2: ARP, MAC, VLAN (access/trunk) · L3: static routing, TTL, traceroute · DHCP · DNS
- CLI لكل جهاز (`help`) + animation للباكتات hop بـ hop
- حفظ/فتح topology كـ JSON · 7 تحديات بتتصحح تلقائيًا

شغّله: `python3 -m http.server` وافتح `index.html`. (مفيش build ولا backend)
Engine المنطق في `engine.js` بدون DOM، فينفع يتختبر بـ node.

## Roadmap
VLAN/trunk/router-on-a-stick (done) · STP · RIP · OSPF · NAT · ACL
