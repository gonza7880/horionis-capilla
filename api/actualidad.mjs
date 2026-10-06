const CHANNELS=[
  {id:'UC6ffFUtT43XHlccQbyWsNHA',handle:'jaimemaussanoficial',name:'Jaime Maussan / Maussan Televisión',lang:'ES',cover:'/assets/fallbacks/ovnis-1.svg'},
  {id:'UCcbUuPjp7J32YSIESrUe76A',handle:'VMGranmisterio',name:'VM Granmisterio',lang:'ES',cover:'/assets/fallbacks/cosmos-3.svg'},
  {id:'UCnOAynBmYKA1neozHQNF0mA',handle:'MundoDesconocido',name:'Mundo Desconocido',lang:'ES',cover:'/assets/fallbacks/misterio-2.svg'},
  {id:'UCIFk2uvCNcEmZ77g0ESKLcQ',handle:'TheWhyFiles',name:'The Why Files',lang:'EN',cover:'/assets/fallbacks/misterio-1.svg'},
  {id:'UCkgPT7LeB_t1aXTYyMiFVAg',handle:'JeremyCorbell',name:'Jeremy Corbell / WEAPONIZED',lang:'EN',cover:'/assets/fallbacks/ovnis-2.svg'},
  {id:'UCCjG8NtOig0USdrT5D1FpxQ',handle:'NewsNation',name:'NewsNation',lang:'EN',cover:'/assets/fallbacks/ciencia-2.svg'}
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
  if(/nasdaq|etf|stock|shares|investor|running shoe|shoe review|album|single|song|music release|beatles|messi|ronaldo|f[uú]tbol|honda|vento ovni|motocicleta|moto 125/i.test(t))return false;
  if(/ovni|extraterrest|alien|reptilian|non[- ]human|unidentified anomal|unidentified flying|fen[oó]men[^ ]* an[oó]mal|aaro|grusch|disclosure/i.test(t))return true;
  if(/\b(ufo|uap|nhi)\b/i.test(t)&&/pentagon|nasa|military|congress|government|classified|air force|space force|pilot|sighting|formation|craft|crash|whistleblower|hearing|intelligence|defense|phenomen/i.test(t))return true;
  return false;
}
const BROWSER_HEADERS={
  'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,text/xml,*/*;q=0.8',
  'accept-language':'es-419,es;q=0.9,en;q=0.8'
};
async function getText(url,timeout=5000,extraHeaders={}){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch(url,{redirect:'follow',signal:ctrl.signal,headers:{...BROWSER_HEADERS,...extraHeaders}});
    if(!r.ok)throw new Error('Upstream '+r.status);
    return {text:await r.text(),url:r.url};
  }finally{clearTimeout(timer)}
}
function metaImage(html=''){
  const patterns=[
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<meta[^>]+property=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']twitter:image(?::src)?["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']image["']/i,
    /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+as=["']image["'][^>]+rel=["']preload["']/i
  ];
  for(const p of patterns){const m=html.match(p);if(m?.[1])return decodeXml(m[1])}
  return'';
}
function googleArticleId(sourceUrl=''){
  try{
    const u=new URL(sourceUrl),m=u.pathname.match(/\/(?:rss\/)?(?:articles|read)\/([^/?]+)/);
    return u.hostname==='news.google.com'&&m?m[1]:'';
  }catch{return''}
}
async function decodeGoogleNewsUrl(sourceUrl){
  const id=googleArticleId(sourceUrl);if(!id)return sourceUrl;
  try{
    const page=await getText('https://news.google.com/rss/articles/'+id,4200,{
      'accept-language':'en-US,en;q=0.9',
      'referer':'https://news.google.com/'
    });
    const sig=(page.text.match(/data-n-a-sg=["']([^"']+)["']/)||[])[1];
    const ts=(page.text.match(/data-n-a-ts=["']([^"']+)["']/)||[])[1];
    if(!sig||!ts)return sourceUrl;
    const inner=JSON.stringify([
      'garturlreq',
      [['X','X',['X','X'],null,null,1,1,'US:en',null,1,null,null,null,null,null,0,1],'X','X',1,[1,1,1],1,1,null,0,0,null,0],
      id,Number(ts),sig
    ]);
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6000);
    try{
      const res=await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute',{
        method:'POST',signal:ctrl.signal,
        headers:{
          ...BROWSER_HEADERS,
          'accept':'*/*',
          'accept-language':'en-US,en;q=0.9',
          'content-type':'application/x-www-form-urlencoded;charset=UTF-8',
          'origin':'https://news.google.com',
          'referer':'https://news.google.com/',
          'x-same-domain':'1'
        },
        body:'f.req='+encodeURIComponent(JSON.stringify([[['Fbv4je',inner]]]))
      });
      if(!res.ok)return sourceUrl;
      const txt=await res.text();
      for(const chunk of txt.split('\n\n')){
        try{
          const parsed=JSON.parse(chunk.trim());
          if(!Array.isArray(parsed))continue;
          for(const row of parsed){
            if(!Array.isArray(row)||row[1]!=='Fbv4je'||typeof row[2]!=='string')continue;
            const decoded=JSON.parse(row[2])?.[1];
            if(typeof decoded==='string'&&/^https?:\/\//.test(decoded))return decoded;
          }
        }catch{}
      }
      return sourceUrl;
    }finally{clearTimeout(timer)}
  }catch{return sourceUrl}
}
async function enrichNews(n){
  const candidate=await decodeGoogleNewsUrl(n.url);
  try{
    const first=await getText(candidate,5200);
    const finalUrl=first.url||candidate;
    const host=(()=>{try{return new URL(finalUrl).hostname}catch{return''}})();
    if(host==='news.google.com'){
      return {...n,url:n.url,image:''};
    }
    return {...n,url:finalUrl,image:metaImage(first.text)||''};
  }catch{return {...n,url:candidate,image:''}}
}
async function mapLimit(items,limit,worker){
  const out=new Array(items.length);let next=0;
  async function run(){
    while(true){
      const i=next++;if(i>=items.length)return;
      try{out[i]=await worker(items[i],i)}catch{out[i]=items[i]}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>run()));
  return out;
}
function jsonText(s=''){
  try{return JSON.parse('"'+s+'"')}catch{return s.replace(/\\u0026/g,'&').replace(/\\n/g,' ').replace(/\\\"/g,'"')}
}
function youtubePairs(html=''){
  const ids=[...html.matchAll(/"videoId":"([^"]+)"/g)].map(m=>m[1]);
  const unique=[...new Set(ids)].slice(0,60),out=[];
  for(const id of unique){
    const i=html.indexOf('"videoId":"'+id+'"');if(i<0)continue;
    const after=html.slice(i,Math.min(html.length,i+9000));
    const tm=after.match(/"lockupMetadataViewModel":\{"title":\{"content":"((?:\\.|[^"\\])*)"/);
    const title=tm?.[1]?jsonText(tm[1]):'';
    if(title)out.push({id,title});
  }
  return out;
}
function uapVideo(title=''){
  return /\b(ufo|uap|ovni|nhi|aaro)\b|alien|extraterrest|reptilian|non[- ]human|spacecraft|martian|mars|area 51|grusch|disclosure|declassif|anomalous|\borbs?\b|sighting|unidentified|pentagon.*(ufo|uap)|nasa.*(ufo|uap|alien)/i.test(title);
}
async function enrichChannel(c){
  try{
    const isEs=c.lang==='ES';
    const locale=isEs?'?hl=es&gl=AR':'?hl=en&gl=US';
    const langHeaders={'accept-language':isEs?'es-419,es;q=0.9,en;q=0.8':'en-US,en;q=0.9'};
    const r=await getText(c.url+'/videos'+locale,5000,langHeaders);
    let pairs=youtubePairs(r.text||'');
    let chosen=pairs.find(v=>uapVideo(v.title));
    if(!chosen&&c.handle==='NewsNation'){
      try{
        const sr=await getText(c.url+'/search?query=UAP&hl=en&gl=US',4500,{'accept-language':'en-US,en;q=0.9'});
        pairs=youtubePairs(sr.text||'');
        chosen=pairs.find(v=>uapVideo(v.title))||pairs[0];
      }catch{}
    }
    chosen=chosen||pairs[0];
    if(!chosen)return c;
    return {...c,latestVideo:{id:chosen.id,title:chosen.title,thumbnail:'https://i.ytimg.com/vi/'+chosen.id+'/hqdefault.jpg',url:'https://www.youtube.com/watch?v='+chosen.id}};
  }catch{return c}
}

export async function GET(){
  const [newsSettled,channelSettled]=await Promise.all([
    Promise.allSettled(NEWS_FEEDS.map(u=>getText(u,4500).then(r=>r.text))),
    Promise.allSettled(CHANNELS.map(enrichChannel))
  ]);
  let news=newsSettled.flatMap(r=>r.status==='fulfilled'?parseNews(r.value):[]).filter(relevant);
  news=dedupe(news,x=>x.title.toLowerCase().replace(/\s+/g,' ').trim()).sort((a,b)=>time(b)-time(a)).slice(0,18);
  const enriched=await mapLimit(news,6,enrichNews);
  const channels=channelSettled.map((r,i)=>r.status==='fulfilled'?r.value:CHANNELS[i]);
  return new Response(JSON.stringify({generatedAt:new Date().toISOString(),news:enriched,channels}),{
    status:200,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, s-maxage=1800, stale-while-revalidate=21600','access-control-allow-origin':'*'}
  });
}
