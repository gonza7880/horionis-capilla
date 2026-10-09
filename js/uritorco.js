(() => {
'use strict';
const $=id=>document.getElementById(id),fallback='LskKW360XB4';
const state={liveId:null,channelId:null,playing:false,type:null,id:null};
function clock(){const f=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false});$('uriClock').textContent=f.format(new Date())+' ART'}
function status(name,side,active){$('uriStateText').textContent=name;$('uriSideState').textContent=side;$('uriLed').classList.toggle('active',!!active)}
function start(type,id){
 const src=type==='channel'?'https://www.youtube.com/embed/live_stream?channel='+encodeURIComponent(id)+'&autoplay=1&rel=0':'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0&playsinline=1';
 const iframe=document.createElement('iframe');iframe.src=src;iframe.title=type==='archive'?'Grabación anterior del Uritorco · Magia del Monte':'Cámara Cerro Uritorco · Magia del Monte';iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen; web-share';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
 $('uriPlayerHost').replaceChildren(iframe);$('uriPlayerHost').hidden=false;$('uriIntro').hidden=true;state.playing=true;state.type=type;state.id=id;
 $('uriVideoLabel').textContent=type==='archive'?'GRABACIÓN ANTERIOR · NO EN VIVO':type==='channel'?'CANAL EXTERNO · VIVO SIN CONFIRMAR':'SEÑAL EN VIVO · MAGIA DEL MONTE';
}
async function refresh(){
 try{
 const res=await fetch('/api/uritorco',{cache:'no-store'});if(!res.ok)throw Error('status '+res.status);const data=await res.json();
 state.liveId=/^[\w-]{11}$/.test(data.videoId||'')?data.videoId:null;
 state.channelId=/^UC[\w-]{20,}$/.test(data.channelId||'')?data.channelId:null;
 if(state.liveId){
 status('SEÑAL EN DIRECTO IDENTIFICADA','Emisión encontrada',true);
 $('uriHint').textContent='La señal está disponible. Iniciá el reproductor para observar el Uritorco dentro de Horionis.';
 $('uriPlay').innerHTML='Ver señal en vivo <span>▶</span>';
 if(!state.playing)$('uriVideoLabel').textContent='EN VIVO · FUENTE EXTERNA';
 if(state.playing&&(state.type!=='live'||state.id!==state.liveId))start('live',state.liveId);
 }else if(state.channelId){
 status('CANAL DETECTADO · VIVO SIN CONFIRMAR','Consultar en YouTube',false);
 $('uriHint').textContent='Conectaremos el reproductor al canal. Si no hay emisión activa, podés acceder directamente a YouTube.';
 $('uriPlay').innerHTML='Intentar señal del canal <span>▶</span>';
 if(!state.playing)$('uriVideoLabel').textContent='ENLACE DINÁMICO AL CANAL';
 }else{
 status('SEÑAL EN VIVO NO CONFIRMADA','Sin emisión comprobada',false);
 $('uriHint').textContent='La señal en directo no está disponible para verificarla. Podés ver una grabación anterior aquí o abrir el canal en YouTube.';
 $('uriPlay').innerHTML='Ver grabación anterior <span>▶</span>';
 if(!state.playing)$('uriVideoLabel').textContent='GRABACIÓN ANTERIOR · NO EN VIVO';
 }
 }catch{
 status('NO SE PUDO VERIFICAR','Estado desconocido',false);
 $('uriHint').textContent='Por ahora no podemos verificar el vivo. Te ofrecemos una grabación anterior o el enlace oficial a YouTube.';
 $('uriPlay').innerHTML='Ver grabación anterior <span>▶</span>';
 if(!state.playing)$('uriVideoLabel').textContent='GRABACIÓN ANTERIOR · NO EN VIVO';
 }
}
$('uriPlay').addEventListener('click',()=>state.liveId?start('live',state.liveId):state.channelId?start('channel',state.channelId):start('archive',fallback));
$('uriRefresh').addEventListener('click',()=>{status('ACTUALIZANDO SEÑAL','Consultando…',false);refresh()});
clock();setInterval(clock,30000);refresh();setInterval(refresh,300000);
})();