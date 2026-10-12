const $=id=>document.getElementById(id),ME=crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
let net,key,rid,room,secret,leader=false,myName,peers=new Map(),msgs=new Map(),typingAt=0,keep=true;
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const H=new URLSearchParams(location.hash.slice(1));$('name').value=localStorage.nm||'';
if(H.get('r')&&H.get('k')){$('invite').classList.remove('hide');$('mk').classList.add('hide')}
const rnd=n=>{const a='abcdefghijkmnpqrstuvwxyz23456789',b=crypto.getRandomValues(new Uint8Array(n));return[...b].map(x=>a[x%a.length]).join('')};
const link=()=>location.origin+location.pathname+'#r='+encodeURIComponent(room)+'&k='+encodeURIComponent(secret);
const TE=new TextEncoder(),D=new TextDecoder();
async function pub(kind,obj){const n=net.send(kind,await seal(key,TE.encode(JSON.stringify(obj))));return n}
const presence=t=>net&&pub(KEPH,{p:1,u:ME,n:myName,l:leader,ty:t?1:0});
function status(u,n){$('conn').textContent=u?`🟢 Terhubung (${u}/${n} relay) · 🔒 E2E`:'🔴 Terputus, menyambung ulang...'}
function members(){const now=Date.now();for(const[k,v]of peers)if(now-v.t>20000)peers.delete(k);
 const names=[(leader?'👑 ':'')+myName+' (kamu)',...[...peers.values()].map(p=>(p.l?'👑 ':'')+p.n)];$('mem').textContent='Room '+room+' · Online ('+names.length+'): '+names.join(', ');
 const ty=[...peers.values()].filter(p=>now-p.ty<4000).map(p=>p.n);$('typ').textContent=ty.length?ty.join(', ')+' sedang mengetik...':''}
function save(){if(!keep)return;try{localStorage['cr_'+rid]=JSON.stringify([...msgs.values()].slice(-500))}catch{}}
function render(m){if(msgs.has(m.i))return;msgs.set(m.i,m);const log=$('log'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<80;
 const d=document.createElement('div');d.className='m'+(m.u===ME?' me':'');d.dataset.ts=m.ts;
 const n=document.createElement('div');n.className='n';n.textContent=m.u===ME?'Kamu':m.n;d.appendChild(n);
 if(m.img&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.img)){const im=document.createElement('img');im.src=m.img;im.onclick=()=>window.open().document.write('<img src="'+m.img+'">');d.appendChild(im)}
 if(m.m){const t=document.createElement('div');t.textContent=m.m;d.appendChild(t)}
 const t=document.createElement('div');t.className='t';t.textContent=new Date(m.ts).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});d.appendChild(t);
 let after=null;for(const c of log.children)if(+c.dataset.ts>m.ts){after=c;break}log.insertBefore(d,after);if(atBottom||m.u===ME)log.scrollTop=log.scrollHeight;save()}
async function onData(kind,buf){let o;try{o=JSON.parse(D.decode(await open(key,buf)))}catch{return}
 if(kind===KEPH&&o.p){if(o.u===ME)return;const isNew=!peers.has(o.u);const p=peers.get(o.u)||{ty:0};p.n=String(o.n).slice(0,20);p.l=!!o.l;p.t=Date.now();if(o.ty)p.ty=Date.now();peers.set(o.u,p);if(isNew)presence();members()}
 else if(kind===KMSG&&o.i){render({i:String(o.i),u:String(o.u),n:String(o.n).slice(0,20),m:typeof o.m==='string'?o.m.slice(0,4000):'',img:typeof o.img==='string'?o.img:'',ts:+o.ts||Date.now()})}}
async function start(r,s,isLeader){myName=$('name').value.trim();if(!myName)return alert('Isi nama panggilan dulu');localStorage.nm=myName;keep=$('keep').checked;
 room=r;secret=s;leader=isLeader;$('home').classList.add('hide');$('chat').classList.remove('hide');history.replaceState(null,'',link());
 const d=await deriveRoom(room,secret);key=d.key;rid=d.id;try{JSON.parse(localStorage['cr_'+rid]||'[]').forEach(render)}catch{}
 if(isLeader){const s=document.createElement('div');s.className='sys';s.textContent='Room dibuat. Bagikan link undangan ke teman.';$('log').appendChild(s)}
 net=Net(rid,onData,(u,n)=>{status(u,n);if(u)presence()})}
$('mk').onclick=()=>start(rnd(6),rnd(22),true);$('joinLink').onclick=()=>start(H.get('r'),H.get('k'),false);
async function send(extra){const m=$('txt').value.trim();if(!m&&!extra)return;const o={i:ME+Date.now().toString(36)+rnd(3),u:ME,n:myName,m,ts:Date.now(),...extra};
 if(!net.up()){alert('Belum terhubung ke relay');return}render(o);$('txt').value='';const n=await pub(KMSG,o);if(!n)alert('Gagal mengirim')}
$('send').onclick=()=>send();$('txt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}else if(Date.now()-typingAt>2500){typingAt=Date.now();presence(true)}});
$('pic').onclick=()=>$('img').click();
$('img').onchange=async()=>{const f=$('img').files[0];if(!f)return;const bm=await createImageBitmap(f);let w=bm.width,h=bm.height,max=900,q=.7,url;
 for(let i=0;i<8;i++){const s=Math.min(1,max/Math.max(w,h)),c=document.createElement('canvas');c.width=w*s|0;c.height=h*s|0;c.getContext('2d').drawImage(bm,0,0,c.width,c.height);
  url=c.toDataURL('image/jpeg',q);if(url.length<40000)break;max*=.8;q=Math.max(.4,q-.08)}
 $('img').value='';if(url.length>=40000)return alert('Gambar terlalu besar');send({img:url})};
const shareTxt=()=>'Gabung chat rahasia saya (terenkripsi end-to-end): '+link();
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(link());$('copy').textContent='✅ Tersalin'}catch{prompt('Salin link ini:',link())}};
$('wa').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(shareTxt()),'_blank');
$('sh').onclick=()=>navigator.share?navigator.share({title:'Chat Rahasia',text:shareTxt()}).catch(()=>{}):$('copy').click();
$('clr').onclick=()=>{if(confirm('Hapus riwayat chat di perangkat ini?')){delete localStorage['cr_'+rid];location.reload()}};
$('out').onclick=()=>{location.hash='';location.reload()};
setInterval(()=>{presence();members()},8000);setInterval(members,1000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&net){net.check();presence()}});
