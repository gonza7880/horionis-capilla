// Descubre la emisión actual del canal de YouTube. No descarga ni retransmite video.
const ch='https://www.youtube.com/@MagiaDelMonte';
const headers={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','Accept-Language':'es-AR,es;q=0.9,en;q=0.8'};
async function fetchPage(url){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),6500);try{return await fetch(url,{redirect:'follow',headers,signal:ctl.signal})}finally{clearTimeout(timer)}}
function channelID(t){return t.match(/"externalId"\s*:\s*"(UC[A-Za-z0-9_-]{20,})"/)?.[1]||t.match(/"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{20,})"/)?.[1]||t.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{20,})/)?.[1]||null}
function liveID(url){try{const u=new URL(url);if(!u.hostname.endsWith('youtube.com')||u.pathname!=='/watch')return null;const id=u.searchParams.get('v');return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null}catch{return null}}
function metaID(s){const m=s.match(/<link[^>]*rel="canonical"[^>]*href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/i)||s.match(/<meta[^>]*property="og:url"[^>]*content="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/i);return m?.[1]||null}
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=180');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 let channelId='UC_YyE3hP8wZ2HNRz3IWNRFQ',videoId=null,error=null;
 try{
  const r=await fetchPage(ch+'/live');
  if(r.ok){
   const html=await r.text();channelId=channelID(html)||channelId;
   const redirected=liveID(r.url);
   const liveSignal=/"isLiveNow"\s*:\s*true|"isLive"\s*:\s*true|"isLiveContent"\s*:\s*true/.test(html);
   videoId=redirected||(liveSignal?metaID(html):null);
  }
  if(!channelId){try{const p=await fetchPage(ch);if(p.ok)channelId=channelID(await p.text())}catch{}}
 }catch(e){error='No fue posible consultar la fuente';}
 return res.status(200).json({channelUrl:ch+'/live',channelId,videoId,live:!!videoId,checkedAt:new Date().toISOString(),error});
}