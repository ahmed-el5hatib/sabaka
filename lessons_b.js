export const BASIC={
arp:{id:'arp',nav:'ARP: ربط الـ IP بالـ MAC',ex:'example',
title:'ARP: إزاي الجهاز يعرف الـ MAC بتاع جاره؟',
sub:'الحلقة الناقصة بين الـ IP والـ MAC: ليه ARP موجود، بيشتغل إزاي خطوة بخطوة، وإيه اللي بيحصل لما بيتعطل.',
sections:[
{html:`<h2>1) المشكلة</h2>
<p>PC1 عايز يبعت لـ PC2 اللي في نفس الشبكة. التطبيق عارف الـ <b>IP</b> (مثلاً 192.168.1.20). لكن الـ Ethernet frame محتاجة <b>MAC</b> الوجهة، والـ Switch بيقرأ الـ MAC مش الـ IP. فـ PC1 عنده IP ومحتاج MAC. مين هيقوله؟</p>
<p>الحل هو <b>ARP (Address Resolution Protocol)</b>: بروتوكول بسيط بيسأل الشبكة المحلية كلها: "مين صاحب الـ IP ده؟ يرد عليّا بالـ MAC بتاعه".</p>
<div class="box tip"><b class="t">قاعدة ذهبية</b>ARP بيشتغل <b>جوّا الشبكة المحلية بس</b>. لو الوجهة برّه الشبكة، الجهاز مش بيعمل ARP للوجهة نفسها، بيعمل ARP للـ <b>Default Gateway</b> ويبعت الـ frame للـ Router.</div>`},
{html:`<h2>2) خطوة بخطوة</h2>
<p>PC1 (<code>192.168.1.10</code>, MAC <code>AA:AA</code>) بيعمل <code>ping 192.168.1.20</code>:</p>
<ol>
<li>PC1 يقارن بالـ mask: 192.168.1.20 في نفس الـ /24؟ أيوه → يبعت مباشرة، محتاج MAC.</li>
<li>يبص في <b>ARP cache</b> (جدول مؤقت): مفيش؟ يبعت <b>ARP Request</b>.</li>
<li>الـ Request frame: Dest MAC = <code>FF:FF:FF:FF:FF:FF</code> (broadcast)، والمحتوى: "who has 192.168.1.20? tell 192.168.1.10 (AA:AA)".</li>
<li>الـ Switch يعمل Flood للـ broadcast، فكل الأجهزة تستقبلها. اللي IP بتاعه مش 192.168.1.20 يتجاهلها.</li>
<li>PC2 يشوف إن ده IP بتاعه، يسجّل MAC بتاع PC1 في الـ cache بتاعه، ويرد <b>ARP Reply</b> <b>Unicast</b> لـ PC1: "192.168.1.20 is at BB:BB".</li>
<li>PC1 يسجّل المطابقة في الـ ARP cache، وبعدين يبعت الـ ICMP echo (ping) الأصلي في frame مباشرة لـ BB:BB.</li></ol>
<p>جرّب الخطوات دي بنفسك:</p>`,widget:'arp'},
{html:`<h2>3) الـ ARP Cache</h2>
<p>لو كل packet هتعمل ARP، الشبكة كانت هتتغرق broadcasts. فكل جهاز بيحتفظ بجدول <b>ARP cache</b> فيه (IP → MAC) وكل entry بتعيش دقايق (عادةً 2–10 دقايق على حسب النظام) وبعدين بتتمسح. الحاجة ممكن تشوفها كده:</p>
<pre>Router# show ip arp
Protocol  Address        Age   Hardware Addr   Interface
Internet  192.168.1.10   0     0000.aaaa.0001  Gi0/0
Internet  192.168.1.20   3     0000.bbbb.0002  Gi0/0</pre>
<p>على Windows: <code>arp -a</code>، على Linux: <code>ip neigh</code>.</p>
<div class="box sim"><b class="t">في المحاكي</b>اعمل ping بين جهازين واتفرج: الـ packet الأصفر (ARP) بيتحرك الأول وبعدين الأزرق (ICMP). بعدها نفّذ <code>show ip arp</code> على الـ Router وشوف الجدول اتملى.</div>`},
{html:`<h2>4) ARP والـ Router: الرحلة لشبكة تانية</h2>
<p>PC1 (192.168.1.10) عايز يبعت لـ 192.168.2.50 (شبكة تانية). بيعمل إيه؟</p>
<ol><li>الـ mask بيقول 192.168.2.50 برّه → يستخدم Default Gateway (192.168.1.1).</li><li>يعمل ARP لـ <b>192.168.1.1</b> (الـ gateway، مش للهدف!) ويعرف MAC الـ Router.</li><li>يبعت frame: <b>Dest MAC = MAC الـ Router</b>، لكن <b>Dest IP = 192.168.2.50</b>.</li><li>الـ Router يفك الـ frame، يشوف الـ IP، وعلى الـ interface التانية يعمل ARP للـ 192.168.2.50 (لو هي نفس شبكته) ويبعت الـ frame الجديد.</li></ol>
<p>دي بالظبط معنى "الـ IP ثابت والـ MAC بيتغير في كل hop".</p>
<h3>Gratuitous ARP و Proxy ARP (معلومة)</h3>
<ul><li><b>Gratuitous ARP</b>: جهاز بيعلن عن نفسه (ARP بدون سؤال) عند التشغيل أو لما يغيّر IP، عشان يكتشف تعارض IP ويحدّث caches الباقي.</li><li><b>Proxy ARP</b>: الـ Router بيرد على ARP نيابة عن جهاز في شبكة تانية. قديم ومش بنفضله.</li></ul>`},
{html:`<h2>5) الأمان وأعطال شائعة</h2>
<p>ARP بيثق في أي رد من غير تحقق. المهاجم ممكن يبعت replies كدابة: "الـ gateway ده MAC بتاعي"، فكل الترافيك يعدّي عليه: ده <b>ARP Spoofing / Poisoning</b> (Man-in-the-middle). الحماية: Dynamic ARP Inspection على الـ Switches، و Static ARP للأجهزة الحرجة.</p>
<div class="box err"><b class="t">أعطال وأخطاء شائعة</b><ul>
<li><b>الـ ping الأول بيفشل (أو أبطأ) والباقي تمام:</b> الأول استنى ARP، وقد يتعدّى الـ timeout. طبيعي.</li>
<li><b>الـ gateway غلط:</b> ARP للـ gateway مش بيرد، فالجهاز مش هيخرج برّه الشبكة.</li>
<li><b>IP conflict:</b> جهازين بنفس الـ IP: الـ ARP cache بتتبدل بين MACين وبتبقى الاتصال متقطع.</li>
<li><b>الاعتقاد إن ARP بيعدّي Router:</b> الـ broadcast ما بيعدّيش Router.</li>
<li><b>الخلط بين ARP و DNS:</b> DNS بيحوّل <i>اسم</i> لـ IP، ARP بيحوّل <i>IP</i> لـ MAC.</li></ul></div>`}
],
tryText:'حمّل المثال، افتح CLI على الـ Router و <code>show ip arp</code> (فاضي غالباً)، وبعدين اعمل ping من PC لـ PC في شبكة تانية وارجع نفّذ الأمر: هتلاقي الـ Router اتعلّم MAC الجهاز. لاحظ إن PC بيعمل ARP للـ gateway مش للهدف.',
quiz:[
{q:'ARP Request بتتبعت لـ:',o:['MAC الهدف مباشرة','Broadcast FF:FF:FF:FF:FF:FF','الـ Router','الـ DNS'],a:1,e:'ما فيش MAC معروف، فبنسأل الكل.'},
{q:'الـ ARP Reply بتكون:',o:['Broadcast','Unicast للي سأل','Multicast','بتعدّي للإنترنت'],a:1,e:'المجيب بيرد على اللي سأل بس.'},
{q:'PC1 عايز يبعت لـ IP في شبكة تانية. بيعمل ARP لـ:',o:['الـ IP الهدف','الـ Default Gateway','الـ DNS server','Broadcast address'],a:1,e:'بيحتاج MAC الـ gateway عشان يسلّمه الـ frame.'},
{q:'ARP بيحوّل:',o:['اسم إلى IP','IP إلى MAC','MAC إلى IP','Port إلى IP'],a:1,e:'ده الفرق بينه وبين DNS.'},
{q:'ARP Spoofing معناه:',o:['كابل بايظ','ردود ARP مزوّرة بتحوّل الترافيك للمهاجم','Collision','تكرار IP'],a:1,e:'لأن ARP مش بيتحقق من صحة الردود.'}
]},
vlan:{id:'vlan',nav:'VLAN والـ Trunking',ex:'vlan',
title:'VLAN: تقسيم Switch واحد لعدة شبكات',
sub:'ليه بنقسم الشبكة؟ إزاي VLAN بيشتغل، الفرق بين Access و Trunk، والـ Inter-VLAN routing.',
sections:[
{html:`<h2>1) المشكلة: شبكة مسطّحة واحدة</h2>
<p>تخيل شركة فيها قسم HR، قسم Sales، وقسم IT، كلهم على Switches متوصلة ببعض في شبكة واحدة (<b>flat network</b>). مشاكل:</p>
<ul><li><b>Broadcast كتير:</b> كل broadcast (زي ARP) بتوصل لكل جهاز في الشركة، وكل ما العدد يكبر الشبكة تتقل.</li><li><b>أمان ضعيف:</b> جهاز في Sales يقدر "يشوف" جهاز HR ويكلمه مباشرة.</li><li><b>إدارة صعبة:</b> نقل موظف لقسم تاني = تغيير كابلات ومكان فعلي.</li></ul>
<p>الحل القديم: Switch منفصل لكل قسم، وده غالي ومش مرن. الحل الذكي: <b>VLAN (Virtual LAN)</b>: بنقسّم الـ Switch <b>منطقياً</b> لعدة شبكات L2 معزولة عن بعض. كل VLAN = <b>Broadcast domain</b> مستقل، برقم من 1 لـ 4094 (مثلاً VLAN 10 = HR، VLAN 20 = Sales).</p>
<p>جرّب بنفسك: غيّر VLAN كل جهاز واتفرج مين يقدر يكلم مين:</p>`,widget:'vlan'},
{html:`<h2>2) Access Port مقابل Trunk Port</h2>
<h3>Access port</h3><p>منفذ بيوصّل <b>جهاز نهائي</b> (PC، Printer) وبيتبع <b>VLAN واحد</b>. الـ frames بتدخل وتطلع بدون tag؛ الجهاز مش عارف إنه في VLAN أصلاً.</p>
<pre>Switch(config)# interface fa0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10</pre>
<h3>Trunk port</h3><p>لينك بين Switch و Switch (أو Switch و Router) بيشيل ترافيك <b>أكتر من VLAN</b> على كابل واحد. عشان الطرف التاني يعرف الـ frame تابعة لأنهي VLAN، بنحط عليها <b>tag</b> حسب معيار <b>802.1Q</b>.</p>
<pre>Switch(config)# interface fa0/24
Switch(config-if)# switchport mode trunk</pre>
<h3>الـ 802.1Q Tag</h3>
<p>4 bytes بتتحط بين Source MAC و Type: فيها <b>VLAN ID</b> (12 bit، يعني 4096 قيمة) و <b>Priority</b> (3 bit، QoS). لما الـ frame توصل Access port في الطرف التاني، الـ Switch بيشيل الـ tag ويسلّم frame عادية.</p>
<h3>الـ Native VLAN</h3><p>الـ VLAN الوحيد اللي بيعدّي على الـ Trunk <b>بدون tag</b> (الافتراضي VLAN 1). لازم يبقى <b>نفسه على الطرفين</b> وإلا هيحصل mismatch وتسريب ترافيك بين VLANs. أفضل ممارسة تغيّره لـ VLAN غير مستخدم.</p>
<div class="box sim"><b class="t">في المحاكي</b>الزر "VLAN" فوق بيحمّل شبكة فيها VLAN 10 و 20 على Switch، وRouter بيوصّلهم. اكتب <code>show vlan brief</code> على الـ Switch لتشوف أي منفذ في أي VLAN، و <code>show interfaces trunk</code> لو متاح.</div>`},
{html:`<h2>3) مثال محلول: عمل VLAN خطوة بخطوة</h2>
<p><b>المطلوب:</b> PC1 و PC2 في VLAN 10 (HR)، و PC3 في VLAN 20 (Sales)، على Switch واحد.</p>
<pre>Switch(config)# vlan 10
Switch(config-vlan)# name HR
Switch(config)# vlan 20
Switch(config-vlan)# name Sales
Switch(config)# interface fa0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
! (كرر لـ fa0/2 = VLAN 10، و fa0/3 = VLAN 20)
Switch# show vlan brief</pre>
<p><b>النتيجة:</b> PC1 يعمل ping لـ PC2 (نفس الـ VLAN ونفس الـ subnet) ✔. PC1 لـ PC3: <b>فشل</b>، لأنهم في broadcast domains مختلفة. الـ ARP request من PC1 مش هتوصل PC3 أصلاً.</p>
<div class="box warn"><b class="t">ملحوظة</b>كل VLAN لازم يكون ليه <b>Subnet خاص</b> (VLAN 10 = 192.168.10.0/24، VLAN 20 = 192.168.20.0/24). ربط الـ VLAN بالـ subnet هو الأساس.</div>`},
{html:`<h2>4) إزاي VLANs تتكلم مع بعض؟ Inter-VLAN Routing</h2>
<p>VLANs متعزولة على L2، فلازم <b>L3 device</b> يوجّه بينها. فيه طريقتين:</p>
<h3>أ) Router-on-a-stick</h3>
<p>Router واحد بكابل واحد (Trunk) للـ Switch، ومقسّم الـ interface لـ <b>sub-interfaces</b>، واحد لكل VLAN، وكل واحد هو الـ Default Gateway للـ VLAN بتاعه:</p>
<pre>Router(config)# interface g0/0.10
Router(config-subif)# encapsulation dot1q 10
Router(config-subif)# ip address 192.168.10.1 255.255.255.0
Router(config)# interface g0/0.20
Router(config-subif)# encapsulation dot1q 20
Router(config-subif)# ip address 192.168.20.1 255.255.255.0
Router(config)# interface g0/0
Router(config-if)# no shutdown</pre>
<p>الـ packet من PC1 (VLAN 10) لـ PC3 (VLAN 20): PC1 يبعت للـ gateway 192.168.10.1 ← الـ frame تطلع tagged 10 على الـ trunk ← Router يستقبلها على g0/0.10، يوجّهها ويطلعها من g0/0.20 tagged 20 ← الـ Switch يوصلها لـ PC3. نفس الكابل راح وجاي (عشان كده "stick"، والـ bottleneck محتمل).</p>
<h3>ب) Layer 3 Switch (SVI)</h3><p>Switch بيعرف يعمل routing بنفسه، وبنعمل <code>interface vlan 10</code> بـ IP. أسرع وأشيع في الشركات الكبيرة.</p>`},
{html:`<h2>5) أخطاء شائعة وتشخيص</h2>
<div class="box err"><ul>
<li><b>نسيان إنشاء الـ VLAN أو تعيين المنفذ</b>: المنفذ بيفضل في VLAN 1.</li>
<li><b>الـ Trunk مش بيسمح بالـ VLAN</b> (allowed list): الجهاز في الطرف التاني مش بيوصل.</li>
<li><b>Native VLAN mismatch</b> بين طرفي الـ trunk.</li>
<li><b>Subnet غلط</b>: جهازين في نفس الـ VLAN بـ subnets مختلفة مش هيتكلموا.</li>
<li><b>الـ Gateway في VLAN غلط</b> أو sub-interface بدون <code>encapsulation dot1q</code>.</li>
<li><b>الاعتقاد إن VLAN = أمان كامل</b>: هو عزل L2 بس، والأمان الحقيقي بـ ACLs و firewall بين الـ VLANs.</li></ul></div>
<h3>قائمة تشخيص سريعة</h3><ol><li><code>show vlan brief</code>: المنفذ في VLAN الصح؟</li><li>Trunk شغال والـ VLAN مسموح؟</li><li>الـ IP/mask/gateway على الجهاز تمام؟</li><li>الـ sub-interface/SVI بتاع الـ gateway up؟</li></ol>`}
],
tryText:'اضغط زر VLAN في المحاكي. اعمل ping بين جهازين في نفس الـ VLAN (ينجح مباشرة)، وبعدين بين جهازين في VLANs مختلفة (بيعدّي على الـ Router: لاحظ الـ animation بيروح للـ Router ويرجع). جرّب تغيّر منفذ لـ VLAN تاني من الـ CLI وشوف الـ ping بيفشل.',
quiz:[
{q:'كل VLAN بيمثل:',o:['Collision domain','Broadcast domain','Autonomous system','Subnet mask'],a:1,e:'VLAN بيقسم الـ broadcast domain.'},
{q:'منفذ بيوصّل PC لازم يتظبط:',o:['Trunk','Access في VLAN واحد','Native','Routed'],a:1,e:'الـ Access port بيخدم VLAN واحد من غير tag.'},
{q:'الـ 802.1Q tag بيشيل:',o:['MAC address','VLAN ID (12 bit) و Priority','IP address','TTL'],a:1,e:'12 bit للـ VLAN ID = 4096 قيمة (4094 صالحة).'},
{q:'عشان VLAN 10 يتكلم مع VLAN 20 نحتاج:',o:['Hub','Switch تاني','L3 device (Router أو L3 Switch)','كابل cross'],a:2,e:'الـ VLANs L2 معزولة؛ التوجيه محتاج L3.'},
{q:'الـ Native VLAN على Trunk معناها:',o:['VLAN ممنوع','VLAN بيعدّي untagged','VLAN الإدارة بس','VLAN مشفّر'],a:1,e:'وبيتحط نفسه على الطرفين لتجنب الـ mismatch.'}
]},
static:{id:'static',nav:'Routing: Static',ex:'example',
title:'الـ Routing: Routing Table والـ Static Routes',
sub:'إزاي الـ Router بيقرر الـ packet تروح فين، وإزاي تكتب الطرق بإيدك، ومعنى Longest Prefix Match.',
sections:[
{html:`<h2>1) الـ Router بيعمل إيه بالظبط؟</h2>
<p>الـ Router بيستقبل packet، يفك الـ frame، ويبص على <b>Destination IP</b>. بعد كده بيسأل سؤال واحد: "الشبكة اللي الـ IP ده فيها، أبعت الـ packet لمين بعد كده؟" الإجابة موجودة في <b>Routing Table</b>. كل سطر فيها (route) بيقول: <b>الشبكة الهدف + الـ mask + الـ Next-hop (أو الـ interface الخارج)</b>.</p>
<p>الـ Router ما بيعرفش الطريق كله، بيعرف <b>الخطوة الجاية بس</b> (Next-hop). وكل Router بعده بيقرر الخطوة اللي بعدها. ودي فكرة الـ <b>hop-by-hop routing</b>.</p>
<h3>الروتات جاية منين؟ (3 مصادر)</h3>
<table><tr><th>النوع</th><th>الرمز</th><th>المصدر</th></tr>
<tr><td><b>Connected</b></td><td>C</td><td>الشبكات المتوصلة مباشرة بـ interfaces الراوتر (تلقائي أول ما الـ interface يبقى up وله IP)</td></tr>
<tr><td><b>Static</b></td><td>S</td><td>إنت بتكتبها يدوي</td></tr>
<tr><td><b>Dynamic</b></td><td>R, O...</td><td>بروتوكولات زي RIP و OSPF (الدرس الجاي)</td></tr></table>
<div class="box sim"><b class="t">في المحاكي</b>اضغط على Router واكتب <code>show ip route</code>. هتشوف سطور C لكل شبكة متوصلة. دي أول حاجة اتعملت لوحدها من غير ما تكتب أي routing.</div>`},
{html:`<h2>2) مثال: ليه محتاجين Static Route؟</h2>
<p>شبكة فيها Router1 و Router2:</p>
<pre>PC1 --- [R1] ======== [R2] --- PC2
192.168.1.0/24   10.0.0.0/30   192.168.2.0/24
R1: g0/0 = 192.168.1.1 , g0/1 = 10.0.0.1
R2: g0/0 = 10.0.0.2   , g0/1 = 192.168.2.1</pre>
<p>R1 عنده Connected routes لـ 192.168.1.0/24 و 10.0.0.0/30 بس. لما PC1 يبعت لـ 192.168.2.10: R1 يدوّر... <b>ملقاش</b> → يرمي الـ packet ويرجّع ICMP "Destination Unreachable". الحل: نعلّم R1 الطريق:</p>
<pre>R1(config)# ip route 192.168.2.0 255.255.255.0 10.0.0.2
R2(config)# ip route 192.168.1.0 255.255.255.0 10.0.0.1</pre>
<p>الصيغة: <code>ip route &lt;الشبكة&gt; &lt;mask&gt; &lt;next-hop IP&gt;</code>. الـ next-hop لازم يكون <b>في شبكة متوصلة مباشرة</b> بالراوتر (10.0.0.2 على لينك R1-R2 ✔).</p>
<div class="box err"><b class="t">لازم الاتجاهين!</b>أكتر غلطة في المبتدئين: يضيفوا route رايح بس. الـ ping بيوصل لـ PC2 لكن الرد مش عارف يرجع لأن R2 معندوش طريق لـ 192.168.1.0/24. اتأكد دايماً من الـ <b>return path</b>.</div>
<h3>Default Route</h3>
<p>لو عندك شبكة صغيرة وراها الإنترنت، مش هتكتب كل شبكات الإنترنت! بنكتب route واحدة معناها "أي حاجة معرفهاش ابعتها هنا":</p>
<pre>R1(config)# ip route 0.0.0.0 0.0.0.0 10.0.0.2</pre>
<p>اسمها <b>Default route</b> أو <b>Gateway of last resort</b>، و /0 يعني "بتتطابق مع أي IP" وأقل واحدة تفضيلاً.</p>`},
{html:`<h2>3) Longest Prefix Match: القاعدة الأهم</h2>
<p>ممكن أكتر من route تتطابق مع نفس الـ IP. القاعدة: الـ Router يختار الـ route صاحبة <b>أطول prefix</b> (أكتر bits متطابقة، يعني الأكثر تحديداً). مثال: لو الـ IP = <code>10.1.5.9</code> وعندك routes لـ 10.0.0.0/8 و 10.1.0.0/16 و 10.1.5.0/24: التلاتة بتتطابق، لكن /24 هي الأطول → هي اللي بتتختار.</p>
<p>جرّب: اكتب أي IP واتفرج الـ Router يختار إيه من الجدول ده:</p>
<pre>10.0.0.0/8      via 192.168.1.2
10.1.0.0/16     via 192.168.1.3
10.1.5.0/24     via 192.168.1.4
192.168.1.0/24  connected (g0/0)
0.0.0.0/0       via 192.168.1.1</pre>`,widget:'route'},
{html:`<h2>4) Administrative Distance (إيه اللي يتفضل لو في مصادر)</h2>
<p>لو نفس الشبكة اتعلمت بأكتر من طريقة (Static و OSPF مثلاً)، الـ Router بيقارن <b>Administrative Distance (AD)</b>: كل مصدر عنده "درجة ثقة" والأقل يكسب.</p>
<table><tr><th>المصدر</th><th>AD</th></tr><tr><td>Connected</td><td>0</td></tr><tr><td>Static</td><td>1</td></tr><tr><td>OSPF</td><td>110</td></tr><tr><td>RIP</td><td>120</td></tr></table>
<p><b>Floating static route</b>: route static بـ AD أعلى (مثلاً 200) كـ backup؛ مش بتتفعّل إلا لو الـ route الأساسي اتشال.</p>
<h3>مزايا وعيوب الـ Static</h3>
<ul><li>✔ بسيط، مفيش overhead على الـ CPU/الشبكة، متوقع، آمن.</li><li>✘ مش بيتأقلم لوحده: لو لينك وقع، لازم تغيّر بإيدك. وغير عملي في الشبكات الكبيرة. وده سبب وجود Dynamic Routing.</li></ul>`},
{html:`<h2>5) أخطاء وتشخيص</h2>
<div class="box err"><ul>
<li>نسيان الـ return route (الأشهر).</li>
<li>Next-hop IP غلط أو مش في شبكة متوصلة مباشرة.</li>
<li>الـ mask غلط (مثلاً /24 بدل /30): بتتطابق مع شبكات مش مقصودة.</li>
<li>الـ interface الخارج down: الـ static route بتختفي من الجدول.</li>
<li>Routing loop: R1 يبعت لـ R2 و R2 يرجّعها لـ R1. الـ TTL هو اللي بينقذك.</li>
<li>الـ Gateway على الـ PC مش الـ Router الصح.</li></ul></div>
<h3>أدوات التشخيص</h3><ol><li><code>show ip route</code>: الـ route موجودة؟ ومطابقة لمين؟</li><li><code>ping</code> من الـ Router نفسه للـ next-hop، بعدين للهدف.</li><li><code>traceroute</code>: الـ hop اللي الرحلة بتقف عنده هو المشكلة (أو اللي بعده).</li></ol>`}
],
tryText:'حمّل المثال (شبكتين وراوتر)، واعمل <code>show ip route</code> على الـ Router. جرّب بعدها تعمل <code>ip route</code> جديدة لشبكة وهمية، شوفها اتضافت بحرف S، وبعدين اعمل <code>traceroute</code> لجهاز في الشبكة التانية.',
quiz:[
{q:'لو IP الهدف 10.1.5.9 والـ routes: 10.0.0.0/8 و 10.1.0.0/16 و 10.1.5.0/24. أنهي بتتختار؟',o:['10.0.0.0/8','10.1.0.0/16','10.1.5.0/24','الـ default'],a:2,e:'Longest prefix match: /24 هو الأكثر تحديداً.'},
{q:'الـ Default route شكلها:',o:['255.255.255.255/32','0.0.0.0/0','127.0.0.0/8','10.0.0.0/8'],a:1,e:'/0 بتتطابق مع كل العناوين وأضعف أفضلية.'},
{q:'Ping بيوصل ومفيش رد. السبب الأرجح؟',o:['الـ mask كبير','مفيش return route','الكابل بايظ','الـ DNS'],a:1,e:'الراوتر الأبعد معندوش طريق للرجوع للمصدر.'},
{q:'أنهي AD أفضل (أقل)؟',o:['OSPF 110','RIP 120','Static 1','Floating static 200'],a:2,e:'الـ Static بـ 1، والـ Connected بـ 0.'},
{q:'الـ next-hop في static route لازم يكون:',o:['أي IP في الإنترنت','في شبكة متوصلة مباشرة بالـ Router','IP الراوتر نفسه','MAC address'],a:1,e:'الراوتر لازم يقدر يعمل ARP للـ next-hop.'}
]},
dynamic:{id:'dynamic',nav:'Routing: RIP و OSPF',ex:'ospf',
title:'Dynamic Routing: RIP و OSPF',
sub:'ليه الـ Static مش كفاية، إزاي الراوترات بتتكلم مع بعض وتتعلم الطرق، والفرق بين Distance-Vector و Link-State.',
sections:[
{html:`<h2>1) المشكلة مع الـ Static</h2>
<p>في شبكة فيها 50 راوتر، لو لينك وقع محتاج حد يدخل ويغيّر routes في راوترات كتير بإيده. وكل شبكة جديدة = تعديل في كل راوتر. الحل: الراوترات تتكلم مع بعض وتتبادل معلومات عن الشبكات اللي تعرفها، فتبني جداول routing <b>لوحدها</b> وتتأقلم مع الأعطال. ده اسمه <b>Dynamic Routing</b> وبروتوكولاته (RIP, OSPF, EIGRP, BGP).</p>
<p>أي routing protocol لازم يجاوب على:</p><ul><li>مين <b>جيراني</b> (Neighbors)؟</li><li>إيه الشبكات اللي أعرفها وأقولها لهم؟</li><li>لو في أكتر من طريق، أنهي <b>أحسن</b> (الـ <b>Metric</b>)؟</li><li>إزاي أعرف لما حاجة تتغير وأوصّلها بسرعة (<b>Convergence</b>)؟</li></ul>
<p><b>Convergence</b> هو الوقت اللي كل الراوترات تتفق فيه على صورة الشبكة بعد تغيير. أقل = أحسن.</p>`},
{html:`<h2>2) RIP: Distance-Vector بسيط</h2>
<p><b>RIP (Routing Information Protocol)</b> أبسط بروتوكول. فكرة "الإشاعة": كل راوتر بيقول لجيرانه "أنا أعرف الشبكات دي وبعدها كذا hops". الجار بيزوّد 1 ويبعتها للي بعده.</p>
<ul><li><b>Metric = Hop count</b> (عدد الراوترات في الطريق). الأقل يكسب، من غير ما يهتم بسرعة اللينك.</li><li><b>أقصى 15 hop</b>، و16 = unreachable.</li><li>بيبعت جدوله كله كل <b>30 ثانية</b> للجيران (RIPv2 بـ multicast 224.0.0.9).</li><li>بطيء في الـ convergence، وعرضة لـ <b>Routing loops</b> (بيحاربها بـ <b>split horizon</b>: ما ترجّعش للجار معلومة جت منه، و <b>poison reverse</b>).</li><li>AD = 120.</li></ul>
<pre>R1(config)# router rip
R1(config-router)# version 2
R1(config-router)# network 192.168.1.0
R1(config-router)# network 10.0.0.0</pre>
<p>أمر <code>network</code> هنا معناه: "فعّل RIP على أي interface عنوانه ضمن الشبكة دي، واعلن عنها".</p>`},
{html:`<h2>3) OSPF: Link-State</h2>
<p><b>OSPF (Open Shortest Path First)</b> بيشتغل بطريقة مختلفة: كل راوتر بيعمل "خريطة" كاملة للشبكة:</p>
<ol><li><b>Neighbors:</b> الراوترات تكتشف بعض بـ Hello packets (multicast 224.0.0.5) وتكوّن علاقة (adjacency).</li><li><b>LSAs:</b> كل راوتر بيعلن حالة لينكاته (Link-State Advertisements) وبتتوزع على الكل.</li><li>كل راوتر عنده نفس قاعدة البيانات <b>LSDB</b>، يعني نفس الخريطة.</li><li>كل راوتر يشغّل خوارزمية <b>Dijkstra (SPF)</b> بنفسه ويحسب أقصر طريق لكل شبكة وهو "الجذر".</li></ol>
<ul><li><b>Metric = Cost</b> = (Reference bandwidth ÷ bandwidth اللينك). افتراضياً 100 Mbps ÷ سرعة اللينك: لينك 100 Mbps = cost 1، لينك 10 Mbps = cost 10. يعني بيفضّل الطرق السريعة.</li><li>بيبعت تحديثات <b>لما يحصل تغيير بس</b> (مش كل 30 ثانية)، فـ convergence أسرع كتير.</li><li><b>Areas:</b> بيقسّم الشبكة الكبيرة لمناطق (Area 0 = backbone) عشان يقلل حجم الـ LSDB.</li><li>AD = 110.</li></ul>
<pre>R1(config)# router ospf 1
R1(config-router)# network 10.0.0.0 0.255.255.255 area 0
R1(config-router)# network 192.168.1.0 0.0.0.255 area 0
R1(config-if)# ip ospf cost 50   ! تغيير الـ cost يدوي</pre>
<p>لاحظ إن OSPF بيستخدم <b>wildcard mask</b> (عكس الـ mask: 0.0.0.255 معناها /24).</p>`},
{html:`<h2>4) جرّب: RIP مقابل OSPF بيختاروا إيه؟</h2>
<p>R1 عايز يوصل R4. فيه طريقين: لينك مباشر (hop واحد) بس سرعته تتحدد بالـ cost اللي تختاره، أو 3 hops كل واحد cost 10 (يعني إجمالي 30). غيّر الـ cost للينك المباشر وشوف الفرق:</p>`,widget:'dv'},
{html:`<h2>5) مقارنة سريعة وأخطاء شائعة</h2>
<table><tr><th></th><th>RIP</th><th>OSPF</th></tr>
<tr><td>النوع</td><td>Distance-Vector</td><td>Link-State</td></tr><tr><td>Metric</td><td>Hops</td><td>Cost (bandwidth)</td></tr>
<tr><td>التحديث</td><td>كل 30 ث (الجدول كله)</td><td>عند التغيير بس</td></tr><tr><td>Convergence</td><td>بطيء</td><td>سريع</td></tr>
<tr><td>الحد الأقصى</td><td>15 hop</td><td>مفيش (بيتقسّم Areas)</td></tr><tr><td>الاستخدام</td><td>شبكات صغيرة/تعليمي</td><td>شبكات الشركات المتوسطة والكبيرة</td></tr></table>
<div class="box err"><b class="t">أخطاء شائعة</b><ul>
<li>نسيان <code>network</code> للشبكة المتوصلة: الراوتر مش هيعلن عنها.</li>
<li>OSPF: الـ wildcard mask غلط، أو area مختلفة على طرفي لينك: الجيران مش هيتكوّنوا.</li>
<li>الاعتقاد إن أقل hops = أسرع طريق (ده RIP بس).</li>
<li>تشغيل أكتر من بروتوكول بدون فهم الـ AD: الراوتر هيفضل OSPF (110) على RIP (120).</li>
<li>Router ID مكرر في OSPF.</li></ul></div>
<div class="box warn"><b class="t">في المحاكي</b>الـ convergence هنا فوري (مش بنحاكي المؤقتات)، وOSPF بيدعم area واحدة بس حالياً. ده تبسيط للتعليم، مش بيعكس تأخير الشبكات الحقيقية.</div>`}
],
tryText:'اضغط زر OSPF في المحاكي (4 راوترات في مربع). افتح R1 و <code>show ip route</code> وشوف الـ O routes. بعدين على interface اعمل <code>ip ospf cost 100</code> وشوف الطريق اتغير في <code>traceroute</code>. جرّب كمان زر RIP وقارن الجدول (R بدل O).',
quiz:[
{q:'الـ Metric في RIP هو:',o:['Bandwidth','Hop count','Delay','Cost'],a:1,e:'RIP بيعدّ الـ hops بس.'},
{q:'أقصى hops في RIP قبل ما يعتبر الهدف unreachable:',o:['10','15','16 مسموح','255'],a:1,e:'15 hops أقصى، و16 = infinity.'},
{q:'OSPF بيحسب الطريق بخوارزمية:',o:['Bellman-Ford','Dijkstra','RSA','CSMA/CD'],a:1,e:'كل راوتر بيشغّل Dijkstra على الـ LSDB.'},
{q:'لو نفس الشبكة اتعلمت بـ RIP و OSPF، الراوتر هيستخدم:',o:['RIP','OSPF','الاتنين','أي واحد عشوائي'],a:1,e:'AD لـ OSPF = 110 أقل من RIP = 120.'},
{q:'ليه OSPF أسرع في الـ convergence؟',o:['بيبعت كل 30 ثانية','بيبعت تحديثات عند حدوث تغيير وكل راوتر عنده الخريطة كاملة','بيعتمد على DNS','لأنه بيستخدم hops'],a:1,e:'Triggered updates + LSDB كاملة.'}
]},
acl:{id:'acl',nav:'ACL: قوائم التحكم',ex:'acl',
title:'ACL: التحكم في اللي يعدّي من الراوتر',
sub:'إزاي تسمح وتمنع ترافيك بقواعد، ترتيب القواعد، الـ wildcard mask، وإيه أماكن التطبيق الصح.',
sections:[
{html:`<h2>1) ليه ACL؟</h2>
<p>الراوتر بشكل افتراضي بيوجّه أي حاجة. لكن في الواقع محتاج: "قسم Sales ما يدخلش على سيرفر الـ HR"، "اسمح بالـ Web بس"، "امنع Telnet". الـ <b>ACL (Access Control List)</b> قائمة قواعد بترتّبها، والراوتر بيفحص بيها كل packet بتعدّي على interface معيّن في اتجاه معيّن (<b>in</b> أو <b>out</b>) وبيقرر: <b>permit</b> (اسمح) أو <b>deny</b> (امنع).</p>
<p>الـ ACL مفيدة كمان في: تحديد الترافيك لـ NAT، فلترة تحديثات الـ routing، وتصنيف ترافيك QoS.</p>`},
{html:`<h2>2) قواعد التشغيل (لازم تحفظها)</h2>
<ol>
<li><b>Top-down، أول تطابق يكسب:</b> الراوتر بيقرأ القواعد من فوق لتحت، ولما يلاقي قاعدة تتطابق مع الـ packet بينفذها ويوقف. الباقي مش بيتقرأ.</li>
<li><b>Implicit deny any في الآخر:</b> أي حاجة مفيش قاعدة بتسمح بيها بتتمنع. (قاعدة مخفية في نهاية كل ACL.) يعني ACL فيها deny بس هتمنع كل حاجة!</li>
<li><b>الترتيب مهم:</b> القواعد الأكثر تحديداً فوق، والعامة تحت.</li>
<li><b>الـ ACL على interface + اتجاه:</b> in = وهي داخلة للراوتر، out = وهي خارجة منه. ACL واحدة لكل interface لكل اتجاه لكل بروتوكول.</li>
<li>الراوتر <b>مش بيفلتر الترافيك اللي هو نفسه بيولّده</b> بالـ ACL الـ out.</li></ol>`},
{html:`<h2>3) الـ Wildcard Mask</h2>
<p>الـ ACL بتستخدم <b>wildcard mask</b> وهو <b>عكس</b> الـ subnet mask: الـ bit = 0 معناه "لازم يتطابق"، و bit = 1 معناه "مش مهم". أسهل طريقة: wildcard = 255.255.255.255 − mask.</p>
<table><tr><th>الشبكة</th><th>Mask</th><th>Wildcard</th></tr><tr><td>192.168.1.0/24</td><td class="ltr">255.255.255.0</td><td class="ltr">0.0.0.255</td></tr><tr><td>10.0.0.0/8</td><td class="ltr">255.0.0.0</td><td class="ltr">0.255.255.255</td></tr><tr><td>192.168.1.64/26</td><td class="ltr">255.255.255.192</td><td class="ltr">0.0.0.63</td></tr></table>
<ul><li><code>host 10.1.1.5</code> = <code>10.1.1.5 0.0.0.0</code> (جهاز واحد).</li><li><code>any</code> = <code>0.0.0.0 255.255.255.255</code> (أي حاجة).</li></ul>`},
{html:`<h2>4) أنواع الـ ACL</h2>
<h3>Standard (1–99)</h3><p>بتفلتر على <b>Source IP</b> بس. بسيطة، فبتتحط <b>قريب من الهدف (destination)</b> عشان متمنعش ترافيك زيادة.</p>
<pre>R1(config)# access-list 10 deny 192.168.1.0 0.0.0.255
R1(config)# access-list 10 permit any
R1(config)# interface g0/1
R1(config-if)# ip access-group 10 out</pre>
<h3>Extended (100–199)</h3><p>بتفلتر على Source و Destination و البروتوكول (ip, tcp, udp, icmp) و الـ Port. دقيقة، فبتتحط <b>قريب من المصدر (source)</b> عشان الترافيك الممنوع ما يلفّش في الشبكة.</p>
<pre>R1(config)# access-list 110 deny tcp 192.168.1.0 0.0.0.255 any eq 23
R1(config)# access-list 110 permit tcp 192.168.1.0 0.0.0.255 any eq 80
R1(config)# access-list 110 permit icmp any any
R1(config)# interface g0/0
R1(config-if)# ip access-group 110 in</pre>
<h3>Named ACL</h3><p>نفس الفكرة بس بإسم، وأسهل في التعديل:</p>
<pre>R1(config)# ip access-list extended BLOCK-TELNET
R1(config-ext-nacl)# deny tcp any any eq 23
R1(config-ext-nacl)# permit ip any any</pre>
<h3>جرّب بنفسك</h3>
<p>دي ACL (110) الأولى فوق. اكتب packet واتفرج الراوتر هيعمل فيها إيه، سطر بسطر:</p>
<pre>1) deny   tcp 192.168.1.0 0.0.0.255 any eq 23
2) permit tcp 192.168.1.0 0.0.0.255 any eq 80
3) permit icmp any any
   (implicit deny any)</pre>`,widget:'acl'},
{html:`<h2>5) أخطاء شائعة وتشخيص</h2>
<div class="box err"><ul>
<li>نسيان <code>permit any</code> في آخر ACL فيها deny: كل حاجة تانية بتتمنع بسبب implicit deny.</li>
<li>ترتيب غلط: permit عامة فوق deny محددة: الـ deny عمرها ما هتتنفذ.</li>
<li>إنشاء ACL ونسيان <code>ip access-group</code>: مش بتعمل حاجة.</li>
<li>اتجاه غلط (in بدل out) أو interface غلط.</li>
<li>wildcard غلط (استخدام subnet mask بدل wildcard).</li>
<li>Standard ACL قريبة من المصدر: بتمنع المصدر من كل الوجهات مش المقصودة بس.</li>
<li>نسيان ترافيك الرد: ACL بدون state (stateless) فلازم تسمح بالراجع (أو تستخدم established).</li></ul></div>
<h3>التشخيص</h3><p><code>show access-lists</code> بيعرض كل قاعدة وعدّاد كام packet اتطابقت معاها (matches). بعد ما تعمل ping أو traffic، شوف أنهي سطر زاد عدّاده: ده السطر اللي اتنفّذ.</p>`}
],
tryText:'اضغط زر ACL في المحاكي، افتح الراوتر و <code>show access-lists</code>. اعمل ping وجرّب traffic من الأجهزة وراقب العدّاد (matches). بعدين جرّب <code>no ip access-group</code> وشوف الترافيك المحجوب بيعدّي.',
quiz:[
{q:'ACL فيها سطر <code>deny</code> واحد بس. النتيجة؟',o:['بتمنع السطر ده بس','بتمنع كل حاجة بسبب implicit deny','بتسمح بكل حاجة','بتتجاهل'],a:1,e:'implicit deny any في آخر كل ACL.'},
{q:'الـ wildcard لـ 192.168.1.0/24:',o:['255.255.255.0','0.0.0.255','0.0.0.0','255.0.0.0'],a:1,e:'عكس الـ mask.'},
{q:'Standard ACL بتتحط:',o:['قريب من المصدر','قريب من الهدف','في أي حتة','على الـ Switch'],a:1,e:'لأنها بتفلتر Source بس.'},
{q:'القواعد بتتقرأ:',o:['من تحت لفوق','عشوائي','من فوق لتحت وأول تطابق ينفّذ','كلها مع بعض'],a:2,e:'ولذلك الترتيب مهم.'},
{q:'Extended ACL بتفلتر على:',o:['Source IP بس','MAC','Source و Destination و بروتوكول و Port','VLAN'],a:2,e:'ولذلك بتتحط قريب من المصدر.'}
]},
nat:{id:'nat',nav:'NAT و PAT',ex:'nat',
title:'NAT و PAT: إزاي شبكة البيت كلها بتطلع بعنوان واحد',
sub:'ليه الـ Private IPs مش بتوصل للإنترنت، وإزاي الراوتر بيترجم العناوين والبورتات.',
sections:[
{html:`<h2>1) المشكلة: عناوين IPv4 مش كفاية</h2>
<p>IPv4 فيه حوالي 4.3 مليار عنوان، وده أقل بكتير من عدد الأجهزة في العالم. الحل الأساسي كان تقسيم العناوين لنوعين:</p>
<ul><li><b>Public IPs:</b> فريدة عالمياً وبتتوجّه على الإنترنت. بتتشترى/بتتأجر من الـ ISP.</li><li><b>Private IPs (RFC 1918):</b> <code>10.0.0.0/8</code> و <code>172.16.0.0/12</code> و <code>192.168.0.0/16</code>. أي شبكة تقدر تستخدمها، فبتتكرر في ملايين الشبكات، ومستحيل تتوجّه على الإنترنت (الراوترات هناك بترميها).</li></ul>
<p>طيب إزاي موبايلك (192.168.1.20) بيفتح Google؟ الراوتر بتاع البيت بيعمل <b>NAT (Network Address Translation)</b>: بيغيّر الـ Source IP للـ packet من الـ private لـ public بتاعه وهي خارجة، ولما الرد يرجع بيغيّره تاني للـ private ويوصّله للجهاز الصح.</p>`},
{html:`<h2>2) المصطلحات الأربعة (مهمة جداً)</h2>
<table><tr><th>المصطلح</th><th>المعنى</th><th>مثال</th></tr>
<tr><td><b>Inside local</b></td><td>عنوان الجهاز الداخلي كما هو في الشبكة الداخلية</td><td class="ltr">192.168.1.10</td></tr>
<tr><td><b>Inside global</b></td><td>نفس الجهاز كما يظهر للعالم الخارجي</td><td class="ltr">41.1.1.1</td></tr>
<tr><td><b>Outside global</b></td><td>عنوان الجهاز الخارجي (Google مثلاً)</td><td class="ltr">93.184.216.34</td></tr>
<tr><td><b>Outside local</b></td><td>الجهاز الخارجي كما يظهر داخلياً (عادةً نفس الـ global)</td><td class="ltr">93.184.216.34</td></tr></table>
<p>و "inside" = الشبكة اللي الراوتر بيحميها، "outside" = الجهة التانية. بنحدد ده على الـ interfaces: <code>ip nat inside</code> و <code>ip nat outside</code>.</p>`},
{html:`<h2>3) أنواع الـ NAT</h2>
<h3>Static NAT (واحد لواحد)</h3><p>عنوان private ثابت ↔ عنوان public ثابت. بيُستخدم لما سيرفر داخلي لازم الناس تدخل عليه من برّه (Web server).</p>
<pre>R1(config)# ip nat inside source static 192.168.1.10 41.1.1.10
R1(config)# interface g0/0
R1(config-if)# ip nat inside
R1(config)# interface g0/1
R1(config-if)# ip nat outside</pre>
<h3>Dynamic NAT</h3><p>مجموعة (pool) من العناوين الـ public، وكل جهاز داخلي بياخد واحد وقت ما يحتاج ويرجّعه بعدين. لو الـ pool خلص، الجهاز اللي بعده مش هيعرف يطلع. محدود فنادراً بيُستخدم.</p>
<h3>PAT (Port Address Translation) / NAT Overload</h3><p>الأهم واللي كل راوتر بيت بيعمله. <b>عنوان public واحد</b> بيخدم مئات الأجهزة، والتمييز بيتم بالـ <b>Port</b>: كل اتصال بياخد Source port فريد على الـ public IP. الراوتر بيحتفظ بجدول <b>NAT translation table</b>.</p>
<pre>R1(config)# access-list 1 permit 192.168.1.0 0.0.0.255
R1(config)# ip nat inside source list 1 interface g0/1 overload</pre>
<p>الـ ACL هنا بتحدد <b>مين</b> يتترجم، وكلمة <code>overload</code> هي اللي بتفعّل الـ PAT.</p>`},
{html:`<h2>4) جرّب الـ PAT بنفسك</h2>
<p>الراوتر عنده Public IP واحد <code>41.1.1.1</code>. كل ضغطة "اتصال جديد" بتخلّي جهاز داخلي يفتح اتصال لـ Web server خارجي (93.184.216.34:80). لاحظ إزاي بيتبني الجدول وإن عدة أجهزة بتظهر بنفس الـ IP وبـ ports مختلفة:</p>`,widget:'nat'},
{html:`<h2>5) إيه اللي بيحصل خطوة بخطوة؟</h2>
<ol><li>PC (192.168.1.10:51000) بيبعت لـ 93.184.216.34:80.</li><li>الراوتر يستقبل على interface الـ inside، يطابق مع الـ ACL، ويعمل entry: <span class="ltr">192.168.1.10:51000 ↔ 41.1.1.1:1024</span>.</li><li>يغيّر الـ Source IP:Port في الـ packet لـ 41.1.1.1:1024 ويرسلها.</li><li>السيرفر يرد على 41.1.1.1:1024.</li><li>الراوتر يلاقي الـ entry، يحوّل الـ Destination لـ 192.168.1.10:51000 ويسلّمها.</li></ol>
<h3>حدود NAT</h3>
<ul><li>الاتصالات اللي بتبدأ من برّه للداخل مش هتعدّي (مفيش entry) إلا لو عملت Static NAT أو <b>port forwarding</b>.</li><li>بيكسّر مبدأ end-to-end وبعض البروتوكولات اللي بتحط الـ IP جوّا الـ payload (محتاجة ALG).</li><li>NAT <b>مش firewall</b> رغم إنه بيخفي العناوين الداخلية كأثر جانبي.</li><li>الحل الحقيقي للمشكلة: <b>IPv6</b>.</li></ul>
<div class="box warn"><b class="t">في المحاكي</b>بيدعم Static و PAT (overload) على interface. مفيش Dynamic pool، ومفيش اتصالات inbound من برّه إلا عن طريق Static. وجدول الترجمة بيتعرض بـ <code>show ip nat translations</code>.</div>`},
{html:`<h2>6) أخطاء وتشخيص</h2>
<div class="box err"><ul>
<li>نسيان <code>ip nat inside</code> / <code>outside</code> على الـ interfaces.</li>
<li>الـ ACL مش بتغطي الشبكة الداخلية، فمفيش حد بيتترجم.</li>
<li>نسيان <code>overload</code>: يترجم جهاز واحد بس.</li>
<li>مفيش default route للراوتر نحو الـ ISP.</li>
<li>الاستغراب إن الـ ping لـ IP private برّه مش شغال: ده طبيعي.</li></ul></div>
<p>التشخيص: <code>show ip nat translations</code> (الجدول فاضي = مفيش ترافيك بيتترجم)، <code>show ip nat statistics</code> (عدد hits و misses).</p>`}
],
tryText:'اضغط زر NAT في المحاكي. اعمل ping من PC داخلي لسيرفر برّه، وبعدين على الراوتر <code>show ip nat translations</code> و <code>show ip nat statistics</code>. لاحظ الـ Inside local مقابل الـ Inside global.',
quiz:[
{q:'أنهي عنوان private؟',o:['8.8.8.8','172.20.5.1','41.1.1.1','200.1.1.1'],a:1,e:'172.16.0.0/12 يغطي 172.16–172.31.'},
{q:'PAT بيفرّق بين الأجهزة الداخلية بـ:',o:['MAC','Port numbers','TTL','VLAN'],a:1,e:'نفس الـ IP والـ ports مختلفة.'},
{q:'الكلمة اللي بتفعّل PAT في أمر الـ NAT:',o:['inside','overload','static','pool'],a:1,e:'ip nat inside source list ... overload.'},
{q:'Inside global هو:',o:['الجهاز الداخلي بعنوانه الخاص','الجهاز الداخلي كما يراه العالم','السيرفر الخارجي','الـ gateway'],a:1,e:'العنوان الـ public اللي بيتترجم له.'},
{q:'ليه NAT مش بيعتبر Firewall؟',o:['بيمنع كل حاجة','لأنه بيترجم عناوين مش بيطبّق سياسة أمان','لأنه بيشفّر','لأنه L2'],a:1,e:'الإخفاء أثر جانبي، مش حماية حقيقية.'}
]}
};
