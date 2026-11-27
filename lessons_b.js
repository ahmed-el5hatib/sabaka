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
]}
};
