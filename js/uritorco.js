(() => {
'use strict';
const $=id=>document.getElementById(id);
const ORIGINAL_VIDEO_ID='pAA0ZsRf7SI';
const ORIGINAL_VIDEO_URL='https://www.youtube.com/watch?v='+ORIGINAL_VIDEO_ID;
const CHANNEL_LIVE_URL='https://www.youtube.com/@MagiaDelMonte/live';
const state={activeId:null,player:null,version:0,api:null,refreshing:false,hasError:false,endedIds:new Set()};
const isVideoId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{11}$/.test(value);
const makeUrl=id=>'https://www.youtube.com/watch?v='+encodeURIComponent(id);
function clock(){
  $('uriClock').textContent=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' ART';
}
function status(label,detail,live=false){
  $('uriStateText').textContent=label;
  $('uriSideState').textContent=detail;
  $('uriLed').classList.toggle('active',live);
}
function updateLinks(videoId){
  document.querySelectorAll('[data-uri-video-link]').forEach(a=>a.href=videoId?makeUrl(videoId):CHANNEL_LIVE_URL);
}
function destroyPlayer(){
  state.version++;
  const player=state.player;state.player=null;state.activeId=null;
  if(player){try{player.destroy()}catch(_){}}
  $('uriPlayerHost').replaceChildren();
  $('uriPlayerHost').hidden=true;
  $('uriSound').hidden=true;
}
function showMessage(title,description,statusText,kind='offline'){
  destroyPlayer();
  $('uriIntro').hidden=false;
  $('uriIntro').querySelector('h3').textContent=title;
  $('uriHint').textContent=description;
  $('uriPlay').textContent='Abrir transmisión en YouTube ↗';
  $('uriVideoLabel').textContent=kind==='blocked'?'REPRODUCCIÓN RESTRINGIDA POR YOUTUBE':'SOLO TRANSMISIONES EN DIRECTO · SIN GRABACIONES';
  status(kind==='blocked'?'SEÑAL NO INSERTABLE':kind==='ended'?'TRANSMISIÓN FINALIZADA':'CÁMARA TEMPORALMENTE FUERA DE LÍNEA',statusText,false);
}
function youtubeApi(){
  if(window.YT&&window.YT.Player)return Promise.resolve(window.YT);
  if(state.api)return state.api;
  state.api=new Promise((resolve,reject)=>{
    let done=false;
    const previous=window.onYouTubeIframeAPIReady;
    const timeout=setTimeout(()=>finish(new Error('YouTube timeout')),12000);
    function finish(err){if(done)return;done=true;clearTimeout(timeout);if(err)reject(err);else resolve(window.YT)}
    window.onYouTubeIframeAPIReady=()=>{
      if(typeof previous==='function'){try{previous()}catch(_){}}
      finish(null);
    };
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.onerror=()=>finish(new Error('No se pudo cargar YouTube'));
    document.head.appendChild(script);
  }).catch(error=>{state.api=null;throw error});
  return state.api;
}
function fallbackIframe(id,version){
  if(version!==state.version)return;
  const iframe=document.createElement('iframe');
  iframe.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&mute=1&playsinline=1&rel=0';
  iframe.title='Transmisión de Magia del Monte · Cerro Uritorco';
  iframe.allow='autoplay;encrypted-media;picture-in-picture;fullscreen';
  iframe.allowFullscreen=true;
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  $('uriPlayerHost').replaceChildren(iframe);
  $('uriVideoLabel').textContent='SEÑAL DE MAGIA DEL MONTE · REPRODUCTOR DE YOUTUBE';
}
async function play(id,reason='provided'){
  if(!isVideoId(id)||state.endedIds.has(id))return;
  if(state.activeId===id)return;
  destroyPlayer();
  const version=state.version;
  state.activeId=id;state.hasError=false;
  updateLinks(id);
  $('uriIntro').hidden=true;
  $('uriPlayerHost').hidden=false;
  $('uriPlayerHost').replaceChildren(Object.assign(document.createElement('div'),{id:'uriYoutubePlayer'}));
  $('uriVideoLabel').textContent='CONECTANDO DIRECTO DE MAGIA DEL MONTE · SIN SONIDO';
  status('CONECTANDO CON LA CÁMARA','Abriendo transmisión del canal',false);
  try{
    const YT=await youtubeApi();
    if(version!==state.version)return;
    state.player=new YT.Player('uriYoutubePlayer',{
      width:'100%',height:'100%',videoId:id,
      playerVars:{autoplay:1,mute:1,playsinline:1,controls:1,rel:0,origin:location.origin},
      events:{
        onReady:event=>{
          if(version!==state.version)return;
          event.target.mute();
          event.target.playVideo();
        },
        onStateChange:event=>{
          if(version!==state.version)return;
          if(event.data===YT.PlayerState.PLAYING){
            status('SEÑAL REPRODUCIÉNDOSE','Cámara de Magia del Monte',true);
            $('uriVideoLabel').textContent='● EN VIVO · MAGIA DEL MONTE · SIN SONIDO AL INICIAR';
            $('uriSound').hidden=false;
            $('uriSound').textContent=state.player&&state.player.isMuted()?'♫ Activar sonido':'♫ Silenciar';
          }
          if(event.data===YT.PlayerState.ENDED){
            state.endedIds.add(id);
            showMessage('Transmisión finalizada','Esta transmisión concluyó. Horionis buscará otra emisión del canal, sin reproducir videos antiguos.','Esperando otra emisión','ended');
            refresh();
          }
        },
        onError:()=>{
          if(version!==state.version)return;
          state.hasError=true;
          showMessage('No se puede mostrar la señal','YouTube rechazó la reproducción integrada de este directo. Podés verlo desde el enlace original.','Abrir el directo en YouTube','blocked');
        },
        onAutoplayBlocked:()=>{
          if(version!==state.version)return;
          $('uriVideoLabel').textContent='TU NAVEGADOR BLOQUEÓ EL INICIO AUTOMÁTICO · PULSÁ ▶';
        }
      }
    });
  }catch(_){fallbackIframe(id,version)}
}
async function refresh(){
  if(state.refreshing)return;
  state.refreshing=true;
  try{
    const result=await fetch('/api/uritorco',{cache:'no-store'});
    if(!result.ok)throw new Error('No responde el servicio');
    const data=await result.json();
    const newId=data.live===true&&isVideoId(data.videoId)?data.videoId:null;
    // Si YouTube no devuelve resultados para el canal NO significa que el enlace directo enviado por el usuario esté caído.
    if(newId&&!state.endedIds.has(newId)&&newId!==state.activeId)await play(newId,'detected');
    // Nunca reemplazar la emisión conocida por una grabación ni apagarla solo por ausencia de metadatos.
    if(!newId&&!state.activeId&&!state.hasError){
      status('BUSCANDO NUEVA SEÑAL','Esperando otro directo',false);
    }
  }catch(_){
    // Error de consulta de metadatos: mantener intacto el reproductor del vivo conocido.
    if(!state.activeId&&!state.hasError)status('SEÑAL PENDIENTE DE CONFIRMACIÓN','Consultar canal oficial',false);
  }finally{state.refreshing=false}
}
$('uriPlay').addEventListener('click',()=>window.open(state.activeId?makeUrl(state.activeId):ORIGINAL_VIDEO_URL,'_blank','noopener,noreferrer'));
$('uriRefresh').addEventListener('click',()=>{
  state.hasError=false;
  if(!state.activeId&&!state.endedIds.has(ORIGINAL_VIDEO_ID))play(ORIGINAL_VIDEO_ID,'manual');
  refresh();
});
$('uriSound').addEventListener('click',()=>{
  if(!state.player||typeof state.player.isMuted!=='function')return;
  if(state.player.isMuted()){state.player.unMute();$('uriSound').textContent='♫ Silenciar';}
  else{state.player.mute();$('uriSound').textContent='♫ Activar sonido';}
});
clock();
setInterval(clock,30000);
updateLinks(ORIGINAL_VIDEO_ID);
// Abrir inmediatamente el enlace del vivo compartido, sin esperar al detector de canales.
play(ORIGINAL_VIDEO_ID,'provided');
refresh();
setInterval(refresh,120000);
})();