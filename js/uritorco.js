(() => {
'use strict';
const $=id=>document.getElementById(id);
const CHANNEL_URL='https://www.youtube.com/@MagiaDelMonte/live';
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{11}$/.test(v);
const state={videoId:null,player:null,version:0,api:null,checking:false,blocked:new Set(),ended:new Set(),currentLink:CHANNEL_URL,lastDeep:0,ready:false};
const link=id=>'https://www.youtube.com/watch?v='+encodeURIComponent(id);
function clock(){
  $('uriClock').textContent=new Intl.DateTimeFormat('es-AR',{
    timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false
  }).format(new Date())+' ART';
}
function setStatus(text,sub,isLive){
  $('uriStateText').textContent=text;
  $('uriSideState').textContent=sub;
  $('uriLed').classList.toggle('active',Boolean(isLive));
}
function setLink(id){
  state.currentLink=validId(id)?link(id):CHANNEL_URL;
  document.querySelectorAll('[data-uri-video-link]').forEach(a=>a.href=state.currentLink);
}
function stopPlayer(){
  state.version++;
  const player=state.player;
  state.player=null;state.videoId=null;
  if(player){try{player.destroy()}catch(_){}}
  $('uriPlayerHost').replaceChildren();
  $('uriPlayerHost').hidden=true;
  $('uriSound').hidden=true;
}
function placeholder(h,description,status,subtitle){
  if(state.videoId||state.player)stopPlayer();
  $('uriIntro').hidden=false;
  $('uriIntro').querySelector('h3').textContent=h;
  $('uriHint').textContent=description;
  $('uriPlay').textContent='Abrir canal en YouTube ↗';
  $('uriVideoLabel').textContent='SOLO EN DIRECTO · SIN GRABACIONES';
  setStatus(status,subtitle,false);
  setLink(null);
}
function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(state.api)return state.api;
  state.api=new Promise((resolve,reject)=>{
    let finished=false;
    const previous=window.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>done(new Error('Timeout')),11000);
    function done(error){
      if(finished)return;finished=true;clearTimeout(timer);
      if(error)reject(error);else resolve(window.YT);
    }
    window.onYouTubeIframeAPIReady=()=>{
      if(typeof previous==='function'){try{previous()}catch(_){}}
      done(null);
    };
    const script=document.createElement('script');
    script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.onerror=()=>done(new Error('Player unavailable'));
    document.head.appendChild(script);
  }).catch(error=>{state.api=null;throw error});
  return state.api;
}
async function start(id,title){
  if(!validId(id)||state.ended.has(id)||state.blocked.has(id))return;
  if(state.videoId===id)return;
  stopPlayer();
  const version=state.version;
  state.videoId=id;
  setLink(id);
  $('uriIntro').hidden=true;
  $('uriPlayerHost').hidden=false;
  $('uriPlayerHost').replaceChildren(Object.assign(document.createElement('div'),{id:'uriYTPlayer'}));
  $('uriVideoLabel').textContent='● CONECTANDO TRANSMISIÓN ACTIVA · AUDIO SILENCIADO';
  setStatus('SEÑAL EN DIRECTO ENCONTRADA',title||'Magia del Monte',true);
  try{
    const YT=await youtubeAPI();
    if(version!==state.version)return;
    state.player=new YT.Player('uriYTPlayer',{
      width:'100%',height:'100%',videoId:id,
      playerVars:{autoplay:1,mute:1,playsinline:1,controls:1,rel:0,origin:location.origin},
      events:{
        onReady:e=>{
          if(version!==state.version)return;
          e.target.mute();e.target.playVideo();
        },
        onStateChange:e=>{
          if(version!==state.version)return;
          if(e.data===YT.PlayerState.PLAYING){
            $('uriSound').hidden=false;
            $('uriSound').textContent=state.player?.isMuted()?'♫ Activar sonido':'♫ Silenciar';
            $('uriVideoLabel').textContent='● EN VIVO · MAGIA DEL MONTE · INICIO SIN SONIDO';
            setStatus('EN VIVO · REPRODUCIENDO',title||'Magia del Monte',true);
          }
          if(e.data===YT.PlayerState.ENDED){
            state.ended.add(id);
            placeholder('Transmisión finalizada','Buscando la siguiente cámara activa de Magia del Monte.','BUSCANDO PRÓXIMO DIRECTO','El canal cambió de emisión');
            refresh(true);
          }
        },
        onError:()=>{
          if(version!==state.version)return;
          state.blocked.add(id);
          placeholder('Señal no disponible','YouTube no permite reproducir esta cámara dentro de Horionis. Abrí el canal original para verla.','REPRODUCCIÓN EXTERNA RESTRINGIDA','Ver en el canal de YouTube');
        },
        onAutoplayBlocked:()=>{
          if(version===state.version)$('uriVideoLabel').textContent='AUTOPLAY BLOQUEADO EN ESTE NAVEGADOR · PULSÁ ▶';
        }
      }
    });
  }catch(_){
    if(version!==state.version)return;
    // Usar únicamente el ID verificado por YouTube Data API.
    const iframe=document.createElement('iframe');
    iframe.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&mute=1&playsinline=1&rel=0';
    iframe.title='En vivo desde Magia del Monte';
    iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allowFullscreen=true;
    $('uriPlayerHost').replaceChildren(iframe);
  }
}
async function query(deep){
  const url=deep?'/api/uritorco?deep=1':'/api/uritorco';
  const response=await fetch(url,{cache:'default'});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
}
async function refresh(forceDeep=false){
  if(state.checking)return;
  state.checking=true;
  try{
    let data=await query(false);
    const discovered=validId(data.videoId)&&data.status==='live';
    const needsDeep=forceDeep||(!discovered&&Date.now()-state.lastDeep>25*60*1000);
    if(needsDeep&&data.status!=='configuration_required'){
      state.lastDeep=Date.now();
      const deep=await query(true);
      if(deep.status==='live'&&validId(deep.videoId))data=deep;
      else if(data.status!=='live')data=deep;
    }
    if(data.status==='live'&&validId(data.videoId)){
      if(state.ended.has(data.videoId)){
        if(!state.videoId)placeholder('Esperando nueva transmisión','El vivo anterior ya terminó. Horionis seguirá buscando el nuevo.','CAMBIO DE CÁMARA','Esperando señal nueva');
      }else if(!state.blocked.has(data.videoId)){
        await start(data.videoId,data.title);
      }else if(!state.videoId){
        placeholder('Ver en YouTube','Esta transmisión no admite reproducción integrada.','SEÑAL NO INSERTABLE','Abrir canal original');
      }
    }else if(data.status==='configuration_required'){
      placeholder('Conexión en preparación','Estamos habilitando la detección automática de las cámaras del canal. Podés ver el directo en YouTube.','CONECTANDO YOUTUBE DATA API','Integración pendiente');
    }else if(data.status==='offline'){
      if(state.videoId)stopPlayer();
      placeholder('Cámara temporalmente fuera de línea','No hay un directo confirmado de Magia del Monte. La página seguirá comprobando las emisiones.','SIN DIRECTO ACTIVO','Esperando nueva emisión');
    }else if(!state.videoId){
      placeholder('Consultando la señal','No podemos verificar el directo en este momento. La página seguirá intentándolo.','SEÑAL NO VERIFICADA','Consultar canal original');
    }
  }catch(_){
    if(!state.videoId)placeholder('Sin señal confirmada','No se pudo consultar YouTube. Probá abrir el canal original.','CONEXIÓN TEMPORALMENTE NO DISPONIBLE','Esperando YouTube');
  }finally{state.checking=false;state.ready=true}
}
$('uriPlay').addEventListener('click',()=>window.open(state.currentLink,'_blank','noopener,noreferrer'));
$('uriRefresh').addEventListener('click',()=>{state.blocked.clear();refresh(true)});
$('uriSound').addEventListener('click',()=>{
  if(!state.player||typeof state.player.isMuted!=='function')return;
  if(state.player.isMuted()){state.player.unMute();$('uriSound').textContent='♫ Silenciar'}
  else{state.player.mute();$('uriSound').textContent='♫ Activar sonido'}
});
clock();setInterval(clock,30000);
setLink(null);
placeholder('Buscando el vivo','Consultando las cámaras de Magia del Monte.','BUSCANDO SEÑAL','Verificando YouTube');
refresh();
setInterval(refresh,120000);
})();