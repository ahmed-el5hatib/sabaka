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
]}
};
