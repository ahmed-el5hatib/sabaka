# Sabaka (سباكة) 3D

محاكي شبكات تعليمي مفتوح المصدر، في المتصفح، بإحساس 3D. أصلي، مش نسخة من أي موقع. MIT.

An original open-source, browser-based network simulator with a 3D scene (three.js). Drag devices, connect cables, configure them from a Cisco-IOS-style CLI, and watch packets travel hop by hop.

## Features
- Devices: PC, switch, router, server. Save/load topologies (JSON). Self-graded challenges in Egyptian Arabic (14).
- L2: MAC learning, VLANs (access/trunk, allowed lists), router-on-a-stick, STP (root election, blocked ports shown in 3D).
- L3: ARP, static routes, RIP v2, single-area OSPF (cost based SPF), ACLs (standard/extended/named), NAT/PAT, DHCP, DNS, ping, traceroute.
- IOS-style CLI for routers and switches: modes, `?`, Tab, history, abbreviations, `show` commands, `running-config`.
- Mobile friendly: bottom nav, sheets, full-screen CLI, touch controls.

## Learn area (learn.html)
A learning platform in Egyptian Arabic (technical terms in English) with the simulator one click away. 13 lessons, bottom-up:
1. What is a network 2. How data travels 3. OSI and TCP/IP 4. Data Link (MAC, switching) 5. IP and subnetting 6. ARP 7. VLAN and trunking 8. Static routing 9. RIP and OSPF 10. ACL 11. NAT and PAT 12. STP 13. DHCP and DNS

Each lesson has a long explanation, interactive widgets, common mistakes, a "Simulator" mapping, a try-it button that opens a matching example (`index.html?ex=...`) and a 5-question quiz.

Video slot: every lesson has a hidden YouTube slot. Put a video id in `VIDEOS` inside `config.js` (key = lesson id) and the player appears. Empty means hidden. No video ids are shipped.

## Known gaps
No real protocol timers or packet formats (convergence is instant), OSPF area 0 only, no DR/BDR, no TCP, no inbound NAT, no IPv6, STP is one instance for all VLANs. Touch was tested with emulation only.

## Run
Open `index.html` through any static web server (ES modules + importmap, three.js from unpkg).
