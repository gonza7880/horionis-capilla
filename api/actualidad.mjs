const CHANNELS=[
  {id:'UCIFk2uvCNcEmZ77g0ESKLcQ',name:'The Why Files',lang:'EN'},
  {id:'UCkgPT7LeB_t1aXTYyMiFVAg',name:'Jeremy Corbell / WEAPONIZED',lang:'EN'},
  {id:'UCCjG8NtOig0USdrT5D1FpxQ',name:'NewsNation',lang:'EN',filter:true},
  {id:'UCcbUuPjp7J32YSIESrUe76A',name:'VM Granmisterio',lang:'ES'}
];

const NEWS_FEEDS=[
  'https://news.google.com/rss/search?q=(UAP%20OR%20UFO%20OR%20%22unidentified%20anomalous%20phenomena%22)%20(Pentagon%20OR%20NASA%20OR%20Congress%20OR%20disclosure)%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen',
  'https://news.google.com/rss/search?q=(OVNI%20OR%20UAP%20OR%20%22fen%C3%B3menos%20an%C3%B3malos%20no%20identificados%22)%20when%3A7d&hl=es-419&gl=AR&ceid=AR%3Aes-419'
];

function decodeXml(s=''){
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function tag(block,name){
  const m=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
  return m?decodeXml(m[1].trim()):'';
}
function attr(block,name,attrName){
  const m=block.match(new RegExp('<'+name+'[^>]*\\s'+attrName+'=["\\']([^"\\']+)["\\'][^>]*>','i'));
  return m?decodeXml(m[1]):'';
}
function parseNews(xml){
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>{
    const b=m[1],source=tag(b,'source');
    return {type:'news',title:tag(b,'title'),url:tag(b,'link'),date:tag(b,'pubDate'),source:source||'Google News'};
  }).filter(x=>x.title&&x.url);
}
function parseYoutube(xml,channel){
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(m=>{
    const b=m[1],id=tag(b,'yt:videoId')||tag(b,'videoId');
    return {
      type:'video',videoId:id,title:tag(b,'title'),date:tag(b,'published'),
      channel:channel.name,lang:channel.lang,
      thumbnail:attr(b,'media:thumbnail','url')||('https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'),
      url:'https://www.youtube.com/watch?v='+id
    };
  }).filter(x=>x.videoId&&x.title);
}
function time(x){const t=Date.parse(x.date||'');return Number.isFinite(t)?t:0}
function dedupe(items,keyFn){
  const seen=new Set();return items.filter(x=>{const k=keyFn(x);if(seen.has(k))return false;seen.add(k);return true});
}
async function getText(url){
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 HorionisActualidad/1.0','Accept':'application/rss+xml,application/atom+xml,text/xml,*/*'}});
  if(!r.ok)throw new Error('Upstream '+r.status);
  return r.text();
}

export async function GET(){
  const [newsSettled,videoSettled]=await Promise.all([
    Promise.allSettled(NEWS_FEEDS.map(getText)),
    Promise.allSettled(CHANNELS.map(c=>getText('https://www.youtube.com/feeds/videos.xml?channel_id='+c.id).then(x=>({xml:x,channel:c}))))
  ]);

  let news=newsSettled.flatMap(r=>r.status==='fulfilled'?parseNews(r.value):[]);
  news=dedupe(news,x=>x.title.toLowerCase().replace(/\s+/g,' ').trim()).sort((a,b)=>time(b)-time(a)).slice(0,18);

  let videos=videoSettled.flatMap(r=>r.status==='fulfilled'?parseYoutube(r.value.xml,r.value.channel):[]);
  videos=videos.filter(v=>{
    if(v.channel!=='NewsNation')return true;
    return /ufo|uap|alien|unidentified|pentagon|disclosure|anomalous|mystery/i.test(v.title);
  });
  videos=dedupe(videos,x=>x.videoId).sort((a,b)=>time(b)-time(a)).slice(0,18);

  const body=JSON.stringify({generatedAt:new Date().toISOString(),news,videos});
  return new Response(body,{
    status:200,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'public, s-maxage=1800, stale-while-revalidate=21600',
      'access-control-allow-origin':'*'
    }
  });
}
