// Horionis · Señal actual del canal @MagiaDelMonte vía YouTube Data API v3.
// La clave vive únicamente en las variables de entorno de Vercel (YOUTUBE_API_KEY).
// No se realizan búsquedas por scraping ni se reproducen grabaciones antiguas como vivos.
const HANDLE = '@MagiaDelMonte';
const CHANNEL_URL = 'https://www.youtube.com/@MagiaDelMonte/live';
const DEFAULT_CHANNEL_ID = 'UC_YyE3hP8wZ2HNRz3IWNRFQ';
const API_ROOT = 'https://www.googleapis.com/youtube/v3/';
const isId = v => typeof v === 'string' && /^[A-Za-z0-9_-]{11}$/.test(v);
function answer(res, status, extra={}) {
  return res.status(200).json({
    status,live:status==='live',videoId:null,channelUrl:CHANNEL_URL,
    channelId:DEFAULT_CHANNEL_ID,checkedAt:new Date().toISOString(),...extra
  });
}
async function request(method,params,key){
  const url=new URL(API_ROOT+method);
  for(const [k,v] of Object.entries({...params,key}))url.searchParams.set(k,String(v));
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6000);
  try {
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    const obj=await response.json();
    if(!response.ok) {
      const reason=obj.error?.errors?.[0]?.reason||obj.error?.status||'youtube_error';
      throw new Error('YouTube API: '+reason);
    }
    return obj;
  } finally {clearTimeout(timer)}
}
function activeVideo(v,channelId){
  if(!v||!isId(v.id)||v.snippet?.channelId!==channelId)return false;
  // Exactamente 'live': no confundir una premiere programada o una grabación pasada.
  return v.snippet.liveBroadcastContent==='live' &&
    !v.liveStreamingDetails?.actualEndTime;
}
function sortLive(a,b){
  // La señal vigente es el directo iniciado más recientemente: nunca priorizar por el título.
  // Puede haber dos cámaras en vivo simultáneas y la del Uritorco ser la más antigua.
  return new Date(b.liveStreamingDetails?.actualStartTime||b.snippet?.publishedAt||0)-
    new Date(a.liveStreamingDetails?.actualStartTime||a.snippet?.publishedAt||0);
}
function result(v,source,id){
  return {
    status:'live',live:true,videoId:v.id,title:v.snippet?.title||null,
    channelId:id,channelUrl:CHANNEL_URL,source,
    checkedAt:new Date().toISOString()
  };
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  const deep=req.query?.deep==='1';
  // La búsqueda profunda tiene caché propia: evita agotar el límite diario de search.list.
  res.setHeader('Cache-Control',deep?'public, s-maxage=1200, stale-while-revalidate=120':'public, s-maxage=85, stale-while-revalidate=15');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return answer(res,'configuration_required',{
    title:null,source:'youtube-data-api',errorCode:'api_key_not_configured',
    message:'La conexión con YouTube Data API todavía no está configurada.'
  });
  try {
    // forHandle identifica al canal real y su playlist de subidas sin depender de un ID deducido.
    const channels=await request('channels',{part:'snippet,contentDetails',forHandle:HANDLE,maxResults:1},key);
    const channel=channels.items?.[0];
    if(!channel?.id)return answer(res,'api_error',{errorCode:'channel_not_found',message:'No se pudo validar el canal de YouTube.'});
    const id=channel.id,uploads=channel.contentDetails?.relatedPlaylists?.uploads;
    let live=[],errorCode=null;
    // Rápido (y económico): las últimas subidas, incluidas transmisiones publicadas por el canal.
    if(uploads){
      const list=await request('playlistItems',{part:'contentDetails',playlistId:uploads,maxResults:40},key);
      const ids=[...new Set((list.items||[]).map(x=>x.contentDetails?.videoId).filter(isId))].slice(0,40);
      if(ids.length){
        const videos=await request('videos',{part:'snippet,liveStreamingDetails,status',id:ids.join(',')},key);
        live=(videos.items||[]).filter(v=>activeVideo(v,id));
      }
    }
    // La búsqueda profunda descubre directos que todavía no aparecen en la lista de subidas.
    // Se utiliza una URL y un caché separados, no en cada sondeo de 2 minutos.
    if(deep){
      try{
        const search=await request('search',{
          part:'snippet',channelId:id,eventType:'live',type:'video',maxResults:20,order:'date'
        },key);
        const ids=[...new Set((search.items||[]).map(x=>x.id?.videoId).filter(isId))];
        if(ids.length){
          const videos=await request('videos',{part:'snippet,liveStreamingDetails,status',id:ids.join(',')},key);
          const found=(videos.items||[]).filter(v=>activeVideo(v,id));
          live=[...live,...found];
        }
      }catch(err){errorCode=String(err.message||err).slice(0,120)}
    }
    const selected=[...new Map(live.map(v=>[v.id,v])).values()].sort(sortLive)[0];
    if(selected)return res.status(200).json(result(selected,deep?'playlist-and-live-search':'uploads-playlist',id));
    return answer(res,'offline',{channelId:id,title:null,source:deep?'youtube-live-search':'uploads-playlist',errorCode:deep?errorCode:null});
  }catch(err){
    // No exponer el valor de la clave, URLs de solicitud ni detalles internos.
    const m=String(err.message||err);
    const errorCode=/quotaExceeded|rateLimitExceeded/i.test(m)?'quota_exceeded':
      /keyInvalid|API_KEY_INVALID|accessNotConfigured|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED/i.test(m)?'api_key_error':
      /AbortError|aborted|timeout/i.test(m)?'timeout':'youtube_api_error';
    return answer(res,'api_error',{errorCode,message:'No pudimos consultar el estado del vivo en YouTube.'});
  }
}