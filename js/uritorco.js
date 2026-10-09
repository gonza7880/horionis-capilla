(() => {
'use strict';
const $=id=>document.getElementById(id);
const LIVE_URL='https://www.youtube.com/@MagiaDelMonte/live';
const state={liveId:null,videoId:null,player:null,version:0,api:null,loading:false,lastCheckOk:false,lastError:false};
function clock(){
  $('uriClock').textContent=new Intl.DateTimeFormat('es-AR',{
    timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false
  }).format(new Date())+' ART';
}
function status(label,detail,live=false){
  $('uriStateText').textContent=label;
  $('uriSideState').textContent=detail;
  $('uriLed').classList.toggle('active',live);
}
function clearPlayer(){
  state.version++;
  const old=state.player;
  state.player=null;state.videoId=null;
  if(old){try{old.destroy()}catch(_){}}
  $('uriPlayerHost').replaceChildren();
  $('uriPlayerHost').hidden=true;
  $('uriSound').hidden=true;
}
function showMessage(title,description,detail,kind='offline'){
  if(state.player||state.videoId)clearPlayer();
  $('uriIntro').hidden=false;
  $('uriIntro').querySelector('h3').textContent=title;
  $('uriHint').textContent=description;
  $('uriPlay').textContent='Abrir señal oficial en YouTube ↗';
  $('uriSectionTitle').innerHTML='El cerro, <em>ahora.</em>';
  $('uriVideoLabel').textContent=kind==='unavailable'?'EL CANAL NO PERMITE VER ESTA SEÑAL AQUÍ':'EXCLUSIVAMENTE EN VIVO · SIN GRABACIONES';
  status(kind==='unavailable'?'NO DISPONIBLE PARA INSERTAR':'CÁMARA TEMPORALMENTE FUERA DE LÍNEA',detail,false);
}
function loading(){
  $('uriIntro').hidden=false;
  $('uriIntro').querySelector('h3').innerHTML='Buscando<br>la señal.';
  $('uriHint').textContent='Comprobando la cámara de Magia del Monte. Esta ventana únicamente reproduce transmisiones en directo.';
  $('uriPlay').textContent='Abrir canal en YouTube ↗';
  $('uriVideoLabel').textContent='VERIFICANDO TRANSMISIÓN EN DIRECTO';
  status('CONSULTANDO SEÑAL','Verificando el canal…',false);
}
function youtubeApi(){
  if(window.YT&&window.YT.Player)return Promise.resolve(window.YT);
  if(state.api)return state.api;
  state.api=new Promise((resolve,reject)=>{
    let finished=false;
    const previous=window.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>done(new Error('YouTube timeout')),11000);
    function done(err){if(finished)return;finished=true;clearTimeout(timer);if(err)reject(err);else resolve(window.YT)}
    window.onYouTubeIframeAPIReady=()=>{
      if(typeof previous==='function'){try{previous()}catch(_){}}
      done(null);
    };
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.onerror=()=>done(new Error('YouTube no disponible'));
    document.head.appendChild(script);
  }).catch(e=>{state.api=null;throw e});
  return state.api;
}
async function playLive(id){
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
  if(state.videoId===id&&state.player)return;
  clearPlayer();
  const version=state.version;
  state.videoId=id;
  $('uriIntro').hidden=true;
  $('uriPlayerHost').hidden=false;
  $('uriPlayerHost').innerHTML='<div id="uriYoutubePlayer"></div>';
  $('uriVideoLabel').textContent='● TRANSMISIÓN EN DIRECTO · AUTOPLAY SIN SONIDO';
  status('SEÑAL EN VIVO IDENTIFICADA','Transmisión activa detectada',true);
  try{
    const YT=await youtubeApi();
    if(version!==state.version)return;
    state.player=new YT.Player('uriYoutubePlayer',{
      width:'100%',height:'100%',videoId:id,
      playerVars:{autoplay:1,mute:1,playsinline:1,controls:1,rel:0,origin:location.origin},
      events:{
        onReady:e=>{
          if(version!==state.version)return;
          e.target.mute();
          e.target.playVideo();
        },
        onError:()=>{
          if(version!==state.version)return;
          state.lastError=true;
          showMessage('Señal no disponible','YouTube no permite reproducir esta transmisión dentro de Horionis. Podés verla en el canal original.','Abrir en YouTube','unavailable');
        },
        onStateChange:e=>{
          if(version!==state.version)return;
          if(e.data===YT.PlayerState.PLAYING){
            $('uriSound').hidden=false;
            $('uriSound').textContent=state.player&&state.player.isMuted()?'♫ Activar sonido':'♫ Silenciar';
          }
          if(e.data===YT.PlayerState.ENDED){
            showMessage('Cámara temporalmente fuera de línea','La transmisión finalizó. Horionis revisará automáticamente cuándo comienza el próximo directo.','Esperando nueva emisión');
            refresh();
          }
        },
        onAutoplayBlocked:()=>{
          if(version===state.version)$('uriVideoLabel').textContent='SEÑAL EN DIRECTO · TU NAVEGADOR REQUIERE PULSAR ▶';
        }
      }
    });
  }catch(_){
    if(version!==state.version)return;
    // Si falla la API de YouTube, intentamos el video verificado directamente, nunca una grabación.
    const frame=document.createElement('iframe');
    frame.title='Cámara en directo del Cerro Uritorco · Magia del Monte';
    frame.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&mute=1&playsinline=1&rel=0';
    frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    $('uriPlayerHost').replaceChildren(frame);
  }
}
async function refresh(){
  if(state.loading)return;
  state.loading=true;
  if(!state.player&&state.lastCheckOk===false)loading();
  try{
    const result=await fetch('/api/uritorco',{cache:'no-store'});
    if(!result.ok)throw new Error('HTTP '+result.status);
    const data=await result.json();
    const id=data.live===true&&/^[A-Za-z0-9_-]{11}$/.test(data.videoId||'')?data.videoId:null;
    state.lastCheckOk=true;
    if(id){
      state.liveId=id;
      if(state.videoId!==id || !state.player){
        // Evita reintentos en cada chequeo cuando YouTube rechaza embeber un vivo aún activo.
        if(!state.lastError||state.videoId!==id){
          state.lastError=false;
          await playLive(id);
        }
      }
    }else{
      state.liveId=null;state.lastError=false;
      showMessage('Cámara temporalmente fuera de línea','No se detecta una transmisión en directo disponible del canal Magia del Monte. Volveremos a comprobarla automáticamente.','Sin emisión en vivo confirmada');
    }
  }catch(_){
    if(!state.player){
      showMessage('Señal temporalmente no disponible','No logramos comprobar la transmisión de Magia del Monte. Podés consultar el canal oficial mientras reintentamos.','No se pudo verificar el vivo');
    }
  }finally{state.loading=false}
}
$('uriPlay').addEventListener('click',()=>window.open(LIVE_URL,'_blank','noopener,noreferrer'));
$('uriSound').addEventListener('click',()=>{
  if(!state.player||typeof state.player.isMuted!=='function')return;
  if(state.player.isMuted()){state.player.unMute();$('uriSound').textContent='♫ Silenciar'}
  else{state.player.mute();$('uriSound').textContent='♫ Activar sonido'}
});
$('uriRefresh').addEventListener('click',refresh);
clock();setInterval(clock,30000);loading();refresh();setInterval(refresh,120000);
})();