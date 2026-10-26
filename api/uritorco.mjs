// Horionis · Descubrimiento del directo público de Magia del Monte.
// No descargamos, almacenamos ni retransmitimos el contenido de YouTube.
const CHANNEL_ID = 'UC_YyE3hP8wZ2HNRz3IWNRFQ';
const CHANNEL = 'https://www.youtube.com/@MagiaDelMonte';
const CHANNEL_LINK = CHANNEL + '/live';
const RECENTLY_SHARED_VIDEO_ID = 'OyIJiYTY61g';
// Esta referencia es un arranque temporal, NO una grabación fija ni un estado "en vivo" confirmado.
// Expira para que Horionis no reproduzca una transmisión pasada.
const RECENTLY_SHARED_UNTIL = Date.parse('2026-10-27T04:00:00Z');
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};
const isId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{11}$/.test(x);

async function load(url, time=5600) {
  const ctrl = new AbortController();
  const timeout = setTimeout(()=>ctrl.abort(),time);
  try {
    const r = await fetch(url,{headers:HEADERS,redirect:'follow',signal:ctrl.signal});
    if (!r.ok) return null;
    const text = await r.text();
    return {text,finalUrl:r.url};
  } catch (_) {return null}
  finally {clearTimeout(timeout)}
}
function jsonObjectAfter(html, markers) {
  for (const marker of markers) {
    const markerAt = html.indexOf(marker);
    if (markerAt < 0) continue;
    const begin = html.indexOf('{',markerAt+marker.length);
    if (begin<0 || begin-markerAt>90) continue;
    let depth=0,quote=false,esc=false;
    for(let i=begin;i<html.length;i++){
      const c=html[i];
      if(quote){
        if(esc)esc=false;
        else if(c==='\\')esc=true;
        else if(c==='"')quote=false;
      }else{
        if(c==='"')quote=true;
        else if(c==='{')depth++;
        else if(c==='}' && --depth===0){
          try{return JSON.parse(html.slice(begin,i+1))}catch(_){break}
        }
      }
    }
  }
  return null;
}
function checkBroadcast(html,expectedId=null) {
  if(!html) return {live:null,id:null};
  const player=jsonObjectAfter(html,['var ytInitialPlayerResponse = ','ytInitialPlayerResponse = ','"ytInitialPlayerResponse":']);
  if(!player) return {live:null,id:null};
  const id=player.videoDetails?.videoId||expectedId;
  if(expectedId && id && id!==expectedId)return {live:null,id:null};
  const owner=player.videoDetails?.channelId;
  if(owner && owner!==CHANNEL_ID)return {live:false,id:null};
  const details=player.microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
  const flag=details?.isLiveNow;
  if(flag === true) return {live:true,id,title:player.videoDetails?.title||null};
  if(flag === false) return {live:false,id,title:player.videoDetails?.title||null};
  if(player.videoDetails?.isLive === true && player.videoDetails?.isLiveContent === true)
    return {live:true,id,title:player.videoDetails?.title||null};
  return {live:null,id,title:player.videoDetails?.title||null};
}
function redirectId(url) {
  try{
    const u=new URL(url);
    if (!['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname))return null;
    if(u.pathname==='/watch')return isId(u.searchParams.get('v'))?u.searchParams.get('v'):null;
    if(u.pathname.startsWith('/live/')){const v=u.pathname.slice(6);return isId(v)?v:null}
  }catch(_){}
  return null;
}
function allActiveVideoRenderers(html) {
  const data=jsonObjectAfter(html,['var ytInitialData = ','ytInitialData = ','window["ytInitialData"] = ']);
  if(!data)return [];
  const stack=[data],live=[];
  let visited=0;
  while(stack.length && visited++ < 45000){
    const node=stack.pop();
    if(!node || typeof node!=='object')continue;
    const vid=node.videoRenderer || node.gridVideoRenderer || node.richItemRenderer?.content?.videoRenderer;
    if(vid && isId(vid.videoId)){
      const badges=(vid.badges||[]).some(b=>{
        const x=b.metadataBadgeRenderer||{};
        return x.style==='BADGE_STYLE_TYPE_LIVE_NOW' || /^(live|en vivo|en directo)$/i.test(x.label||'');
      });
      const overlay=(vid.thumbnailOverlays||[]).some(x=>{
        const s=x.thumbnailOverlayTimeStatusRenderer||{};
        const labels=[...(s.text?.runs||[]).map(x=>x.text),s.text?.simpleText].filter(Boolean).join(' ');
        return s.style==='LIVE' || /^(live|en vivo|en directo)$/i.test(labels);
      });
      if(badges || overlay || vid.isLiveNow===true){
        const title=(vid.title?.runs||[]).map(x=>x.text).join(' ')||vid.title?.simpleText||'';
        live.push({id:vid.videoId,title});
      }
    }
    if(Array.isArray(node))stack.push(...node);
    else for(const value of Object.values(node))if(value&&typeof value==='object')stack.push(value);
  }
  return live.sort((a,b)=>Number(/uritorco/i.test(b.title))-Number(/uritorco/i.test(a.title)));
}
function rssIds(xml) {
  if(!xml)return [];
  const ids=[...xml.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/g)].map(x=>x[1]);
  return [...new Set(ids)].slice(0,5);
}
async function officialApi() {
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return null;
  try{
    const u=new URL('https://www.googleapis.com/youtube/v3/search');
    for(const [k,v] of Object.entries({part:'snippet',channelId:CHANNEL_ID,eventType:'live',type:'video',maxResults:'8',key}))u.searchParams.set(k,v);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
    try{
      const r=await fetch(u,{signal:controller.signal});
      if(!r.ok)return null;
      const doc=await r.json();
      const list=(doc.items||[]).filter(x=>isId(x.id?.videoId)&&x.snippet?.liveBroadcastContent==='live');
      list.sort((a,b)=>Number(/uritorco/i.test(b.snippet?.title||''))-Number(/uritorco/i.test(a.snippet?.title||'')));
      return list.length?{id:list[0].id.videoId,title:list[0].snippet?.title||'',source:'youtube-api'}:null;
    }finally{clearTimeout(timer)}
  }catch(_){return null}
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  // La API oficial de YouTube tiene cuota: 15 min de caché si hay API key para no agotarla.
  res.setHeader('Cache-Control',process.env.YOUTUBE_API_KEY?'public,s-maxage=900,stale-while-revalidate=120':'public,s-maxage=120,stale-while-revalidate=60');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  let active=null,source=null,title=null,seedState=null;
  // 1. Consultar el endpoint del directo del canal, sin seleccionar recomendaciones.
  const direct=await load(CHANNEL_LINK);
  if(direct){
    const id=redirectId(direct.finalUrl);
    const v=checkBroadcast(direct.text,id);
    if(id && v.live!==false){
      active=id;source='channel-live';title=v.title;
    }else if(v.live===true && isId(v.id)){
      active=v.id;source='channel-player';title=v.title;
    }
  }
  // 2. La pestaña transmisiones puede enumerar los vivos actuales (sin confundirlos con archivos).
  if(!active){
    const streams=await load(CHANNEL+'/streams');
    const candidates=streams?allActiveVideoRenderers(streams.text):[];
    if(candidates.length){
      active=candidates[0].id;source='channel-streams';title=candidates[0].title;
    }
  }
  // 3. Verificar el video compartido directamente: solo si sigue realmente en vivo.
  if(!active){
    const known=await load('https://www.youtube.com/watch?v='+RECENTLY_SHARED_VIDEO_ID,4200);
    seedState=known?checkBroadcast(known.text,RECENTLY_SHARED_VIDEO_ID):{live:null};
    if(seedState.live===true){
      active=RECENTLY_SHARED_VIDEO_ID;source='watch-verified';title=seedState.title;
    }
  }
  // 4. Un feed puede revelar un directo recién iniciado aunque /streams no se actualice.
  if(!active){
    const feed=await load('https://www.youtube.com/feeds/videos.xml?channel_id='+CHANNEL_ID,3600);
    const ids=rssIds(feed?.text);
    for(const id of ids.slice(0,4)){
      if(id===RECENTLY_SHARED_VIDEO_ID && seedState?.live===false)continue;
      const watch=await load('https://www.youtube.com/watch?v='+id,2800);
      const result=watch?checkBroadcast(watch.text,id):{live:null};
      if(result.live===true){active=id;source='channel-feed';title=result.title;break}
    }
  }
  // 5. API oficial, si existe una clave configurada en el servidor (nunca en el navegador).
  if(!active){
    const official=await officialApi();
    if(official){active=official.id;source=official.source;title=official.title}
  }
  // No etiquetar como EN VIVO un video que YouTube no confirmó. La URL reciente es un
  // intento temporal en caso de que YouTube bloquee nuestras lecturas automáticas.
  const recentCandidate=!active&&seedState?.live!==false&&Date.now()<RECENTLY_SHARED_UNTIL?RECENTLY_SHARED_VIDEO_ID:null;
  return res.status(200).json({
    status:active?'live':recentCandidate?'unverified':seedState?.live===false?'offline':'unavailable',
    videoId:active||recentCandidate,
    live:Boolean(active),
    verified:Boolean(active),
    title:title||null,
    source:source|| (recentCandidate?'recent-user-link':null),
    channelId:CHANNEL_ID,
    channelUrl:CHANNEL_LINK,
    checkedAt:new Date().toISOString(),
    expiresAt:recentCandidate?new Date(RECENTLY_SHARED_UNTIL).toISOString():null
  });
}
