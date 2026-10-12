// Relay Nostr publik (WSS 443). kind 4333 = pesan terenkripsi (disimpan relay -> riwayat untuk yang baru gabung), kind 20333 = presence/mengetik (ephemeral).
const RELAYS=['wss://nos.lol','wss://relay.primal.net','wss://nostr.mom'],KMSG=4333,KEPH=20333;
function Net(tag,onData,onStatus){const NT=(typeof NostrTools!=='undefined')?NostrTools:require('nostr-tools');
 const sk=NT.generateSecretKey(),seen=new Set(),socks={};let closed=false;
 const b64=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)};
 const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const up=()=>Object.values(socks).filter(w=>w.readyState===1).length;
 function open(url,delay=1000){if(closed)return;const W=(typeof WebSocket!=='undefined')?WebSocket:require('ws');const w=new W(url);socks[url]=w;
  w.onopen=()=>{delay=1000;w.send(JSON.stringify(['REQ','m',{kinds:[KMSG],'#t':[tag],limit:300}]));w.send(JSON.stringify(['REQ','e',{kinds:[KEPH],'#t':[tag],since:Math.floor(Date.now()/1000)-10}]));onStatus(up(),RELAYS.length)};
  w.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m[0]!=='EVENT'||!m[2])return;const ev=m[2];if(seen.has(ev.id))return;seen.add(ev.id);
   try{onData(ev.kind,unb64(ev.content),ev.created_at)}catch{}};
  w.onclose=()=>{onStatus(up(),RELAYS.length);if(!closed)setTimeout(()=>open(url,Math.min(delay*2,15000)),delay)};w.onerror=()=>{try{w.close()}catch{}}}
 RELAYS.forEach(u=>open(u));
 return{send(kind,bytes){const ev=NT.finalizeEvent({kind,created_at:Math.floor(Date.now()/1000),tags:[['t',tag]],content:b64(bytes)},sk);
   seen.add(ev.id);const s=JSON.stringify(['EVENT',ev]);let n=0;for(const w of Object.values(socks))if(w.readyState===1){w.send(s);n++}return n},
  up,check(){for(const u of RELAYS){const w=socks[u];if(!w||w.readyState>1)open(u)}}}}
if(typeof module!=='undefined')module.exports={Net,RELAYS,KMSG,KEPH};
