const CHANNELS=[
  {id:'UCIFk2uvCNcEmZ77g0ESKLcQ',handle:'TheWhyFiles',name:'The Why Files',lang:'EN',cover:'/assets/fallbacks/misterio-1.svg'},
  {id:'UCkgPT7LeB_t1aXTYyMiFVAg',handle:'JeremyCorbell',name:'Jeremy Corbell / WEAPONIZED',lang:'EN',cover:'/assets/fallbacks/ovnis-2.svg'},
  {id:'UCCjG8NtOig0USdrT5D1FpxQ',handle:'NewsNation',name:'NewsNation',lang:'EN',cover:'/assets/fallbacks/ciencia-2.svg'},
  {id:'UCcbUuPjp7J32YSIESrUe76A',handle:'VMGranmisterio',name:'VM Granmisterio',lang:'ES',cover:'/assets/fallbacks/cosmos-3.svg'}
].map(c=>({...c,playlist:'UU'+c.id.slice(2),url:'https://www.youtube.com/@'+c.handle}));

const NEWS_FEEDS=[
  'https://news.google.com/rss/search?q=(UAP%20OR%20UFO%20OR%20%22unidentified%20anomalous%20phenomena%22)%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=(OVNI%20OR%20UAP%20OR%20extraterrestres)%20when%3A7d&hl=es-419&gl=AR&ceid=AR%3Aes-419'
];

function decodeXml(s=''){
  return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function tag(block,name){
  const m=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
  return m?decodeXml(m[1].trim()):'';
}
function parseNews(xml){
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>{
    const b=m[1],source=tag(b,'source');
    return {type:'news',title:tag(b,'title'),url:tag(b,'link'),date:tag(b,'pubDate'),source:source||'Google News'};
  }).filter(x=>x.title&&x.url);
}
function time(x){const t=Date.parse(x.date||'');return Number.isFinite(t)?t:0}
function dedupe(items,keyFn){const seen=new Set();return items.filter(x=>{const k=keyFn(x);if(seen.has(k))return false;seen.add(k);return true})}
function relevant(n){
  const t=n.title||'';
  if(/nasdaq|etf|stock|shares|investor|running shoe|shoe review|album|single|song|music release/i.test(t))return false;
  if(/ovni|extraterrest|alien|reptilian|non[- ]human|unidentified anomal|unidentified flying|fen[oó]men[^ ]* an[oó]mal|aaro|grusch|disclosure/i.test(t))return true;
  if(/\b(ufo|uap|nhi)\b/i.test(t)&&/pentagon|nasa|military|congress|government|classified|air force|space force|pilot|sighting|formation|craft|crash|whistleblower|hearing|intelligence|defense|phenomen/i.test(t))return true;
  return false;
}
async function getText(url){
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 HorionisActualidad/1.0','Accept':'application/rss+xml,text/xml,*/*'}});
  if(!r.ok)throw new Error('Upstream '+r.status);
  return r.text();
}

export async function GET(){
  const settled=await Promise.allSettled(NEWS_FEEDS.map(getText));
  let news=settled.flatMap(r=>r.status==='fulfilled'?parseNews(r.value):[]).filter(relevant);
  news=dedupe(news,x=>x.title.toLowerCase().replace(/\s+/g,' ').trim()).sort((a,b)=>time(b)-time(a)).slice(0,18);
  return new Response(JSON.stringify({generatedAt:new Date().toISOString(),news,channels:CHANNELS}),{
    status:200,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, s-maxage=1800, stale-while-revalidate=21600','access-control-allow-origin':'*'}
  });
}
