(() => {
'use strict';
const $=id=>document.getElementById(id);
const CURRENT_PROVIDED='OyIJiYTY61g';
const CURRENT_PROVIDED_UNTIL=Date.parse('2026-10-27T04:00:00Z');
const CHANNEL_LIVE='https://www.youtube.com/@MagiaDelMonte/live';
const isId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{11}$/.test(value);
const state={activeId:null,verified:false,player:null,version:0,api:null,checking:false,blockedId:null,ended:new Set(),currentLink:CHANNEL_LIVE};
const videoLink=id=>'https://www.youtube.com/watch?v='+encodeURIComponent(id);
function clock(){
  $('uriClock').textContent=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' ART';
}
function status(text,detail,live){
  $('uriStateText').textContent=text;$('uriSideState').textContent=detail;
  $('uriLed').classList.toggle('active',!!live);
}
function links(id){
  state.currentLink=id?videoLink(id):CHANNEL_LIVE;
  document.querySelectorAll('[data-uri-video-link]').forEach(a=>a.href=state.currentLink);
}
function removePlayer(){
  state.version++;
  const existing=state.player;
  state.player=null;state.activeId=null;state.verified=false;
  if(existing){try{existing.destroy()}catch(_){}}
  $('uriPlayerHost').replaceChildren();
  $('uriPlayerHost').hidden=true;
  $('uriSound').hidden=true;
}
function standby(heading,message,detail,label='CÁMARA TEMPORALMENTE FUERA DE LÍNEA'){
  removePlayer();
  $('uriIntro').hidden=false;
  $('uriIntro').querySelector('h3').textContent=heading;
  $('uriHint').textContent=message;
  $('uriPlay').textContent='Abrir canal de YouTube ↗';
  $('uriVideoLabel').textContent='SOLO TRANSMISIONES EN DIRECTO · SIN GRABACIONES';
  status(label,detail,false);
  links(null);
}
function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(state.api)return state.api;
  state.api=new Promise((resolve,reject)=>{
    let settled=false;
    const previous=window.onYouTubeIframeAPIReady;
    const timeout=setTimeout(()=>finish(new Error('YouTube no respondió')),11000);
    function finish(error){
      if(settled)return;
      settled=true;clearTimeout(timeout);
      if(error)reject(error);else resolve(window.YT);
    }
    window.onYouTubeIframeAPIReady=()=>{
      if(typeof previous==='function'){try{previous()}catch(_){}}
      finish(null);
    };
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.onerror=()=>finish(new Error('YouTube bloqueó su reproductor'));
    document.head.appendChild(script);
  }).catch(e=>{state.api=null;throw e});
  return state.api;
}
function fallbackIframe(id,v){
  if(v!==state.version)return;
  const f=document.createElement('iframe');
  f.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&mute=1&playsinline=1&rel=0';
  f.title='Señal de Magia del Monte en Capilla del Monte';
  f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;
  f.referrerPolicy='strict-origin-when-cross-origin';
  $('uriPlayerHost').replaceChildren(f);
  $('uriVideoLabel').textContent='TRANSMISIÓN DE YOUTUBE · PUEDE REQUERIR ▶';
}
async function play(id,verified){
  if(!isId(id)||state.ended.has(id))return;
  if(state.activeId===id){
    if(verified&&!state.verified){
      state.verified=true;status('SEÑAL EN DIRECTO DETECTADA','Magia del Monte · emisión confirmada',true);
      $('uriVideoLabel').textContent='● EN VIVO · MAGIA DEL MONTE · AUDIO SILENCIADO AL INICIAR';
    }
    return;
  }
  if(state.blockedId===id)return;
  removePlayer();
  const v=state.version;
  state.activeId=id;state.verified=Boolean(verified);
  links(id);
  $('uriIntro').hidden=true;$('uriPlayerHost').hidden=false;
  $('uriPlayerHost').replaceChildren(Object.assign(document.createElement('div'),{id:'uriYTPlayer'}));
  status(verified?'SEÑAL EN DIRECTO DETECTADA':'VERIFICANDO SEÑAL COMPARTIDA',verified?'Magia del Monte · directo':'Esperando confirmación de YouTube',verified);
  $('uriVideoLabel').textContent=verified?'● EN VIVO · MAGIA DEL MONTE':'SEÑAL RECIENTE COMPARTIDA · VALIDACIÓN PENDIENTE';
  try{
    const YT=await youtubeAPI();
    if(v!==state.version)return;
    state.player=new YT.Player('uriYTPlayer',{
      width:'100%',height:'100%',videoId:id,
      playerVars:{autoplay:1,mute:1,playsinline:1,controls:1,rel:0,origin:location.origin},
      events:{
        onReady:e=>{if(v!==state.version)return;e.target.mute();e.target.playVideo()},
        onStateChange:e=>{
          if(v!==state.version)return;
          if(e.data===YT.PlayerState.PLAYING){
            $('uriSound').hidden=false;
            $('uriSound').textContent=state.player?.isMuted()?'♫ Activar sonido':'♫ Silenciar';
            // Reproduciendo no prueba que sea vivo: mantener estado pendiente hasta verificar.
            if(state.verified){
              status('SEÑAL EN DIRECTO · REPRODUCIENDO','Magia del Monte · transmisión activa',true);
              $('uriVideoLabel').textContent='● EN VIVO · MAGIA DEL MONTE · INICIO SIN SONIDO';
            }
          }
          if(e.data===YT.PlayerState.ENDED){
            state.ended.add(id);
            standby('Transmisión finalizada','Este directo terminó. Buscamos automáticamente la siguiente transmisión, sin reproducir archivos anteriores.','Esperando nuevo vivo');
            refresh();
          }
        },
        onError:()=>{
          if(v!==state.version)return;
          state.blockedId=id;
          standby('Reproductor no disponible','YouTube no permite mostrar esta transmisión en Horionis. Consultá el vivo en el canal original.','Abrir canal original','SEÑAL NO INSERTABLE');
        },
        onAutoplayBlocked:()=>{
          if(v===state.version)$('uriVideoLabel').textContent='TU NAVEGADOR PIDE PULSAR ▶ · SEÑAL SIN SONIDO';
        }
      }
    });
  }catch(_){fallbackIframe(id,v)}
}
async function refresh(){
  if(state.checking)return;
  state.checking=true;
  try{
    const response=await fetch('/api/uritorco',{cache:'no-store'});
    if(!response.ok)throw new Error('Falla la consulta');
    const data=await response.json();
    const id=isId(data.videoId)?data.videoId:null;
    if(data.status==='live'&&id&&!state.ended.has(id)){
      await play(id,true); // reemplaza un directo anterior si cambió el videoId
    }else if(data.status==='unverified'&&id&&Date.now()<Date.parse(data.expiresAt||0)&&!state.activeId&&!state.ended.has(id)){
      await play(id,false);
    }else if(data.status==='offline'){
      standby('Cámara temporalmente fuera de línea','No se detecta una transmisión activa de Magia del Monte. La página seguirá buscando automáticamente.','Sin vivo confirmado');
    }else if(!state.activeId){
      standby('Esperando transmisión','No pudimos identificar un directo activo. Seguiremos revisando el canal y el enlace se actualizará cuando haya señal.','Consultando Magia del Monte','BUSCANDO NUEVA SEÑAL');
    }
  }catch(_){
    if(!state.activeId)standby('Señal no verificable','La conexión con YouTube no respondió. Podés abrir el canal original mientras Horionis vuelve a comprobar el vivo.','Consulta temporalmente no disponible','BUSCANDO NUEVA SEÑAL');
  }finally{state.checking=false}
}
$('uriPlay').addEventListener('click',()=>window.open(state.currentLink,'_blank','noopener,noreferrer'));
$('uriRefresh').addEventListener('click',()=>{state.blockedId=null;refresh()});
$('uriSound').addEventListener('click',()=>{
  if(!state.player||typeof state.player.isMuted!=='function')return;
  if(state.player.isMuted()){state.player.unMute();$('uriSound').textContent='♫ Silenciar'}
  else{state.player.mute();$('uriSound').textContent='♫ Activar sonido'}
});
clock();setInterval(clock,30000);
links(CURRENT_PROVIDED);
// La transmisión aportada por el usuario se intenta abrir inmediatamente, pero expira.
if(Date.now()<CURRENT_PROVIDED_UNTIL)play(CURRENT_PROVIDED,false);
else standby('Buscando el vivo','Detectando la emisión actual de Magia del Monte.','Buscando nueva señal','BUSCANDO NUEVA SEÑAL');
refresh();
setInterval(refresh,120000);
})();
