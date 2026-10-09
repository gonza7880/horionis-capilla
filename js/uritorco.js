(() => {
'use strict';
const $=id=>document.getElementById(id);
const LIVE_URL='https://www.youtube.com/@MagiaDelMonte/live';
const day={id:'WqozMbIy8UM',date:'12/06/2026'};
const night={id:'LskKW360XB4',date:'24/05/2026'};
const s={liveId:null,type:null,id:null,player:null,version:0,api:null,verified:false,hasError:false,timer:null};
function archive(){
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',hour12:false}).format(new Date()));
  return hour>=7&&hour<19?day:night;
}
function clock(){$('uriClock').textContent=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' ART'}
function status(label,side,live=false){$('uriStateText').textContent=label;$('uriSideState').textContent=side;$('uriLed').classList.toggle('active',live)}
function heading(type){$('uriSectionTitle').innerHTML=type==='live'?'El cerro, <em>ahora.</em>':'El cerro, <em>en imágenes.</em>'}
function legend(type){
  $('uriVideoLabel').textContent=type==='live'?'● EN VIVO · INICIO AUTOMÁTICO SIN SONIDO':'GRABACIÓN DEL CANAL ('+archive().date+') · NO ES EN VIVO';
  heading(type);
}
function intro(reason){
  $('uriPlayerHost').hidden=true;$('uriIntro').hidden=false;$('uriSound').hidden=true;
  $('uriHint').textContent=reason;
  $('uriPlay').innerHTML='Abrir señal en YouTube <span>↗</span>';
}
function youtubeApi(){
  if(window.YT&&window.YT.Player)return Promise.resolve(window.YT);
  if(s.api)return s.api;
  s.api=new Promise((resolve,reject)=>{
    let done=false;
    const prev=window.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>settle(new Error('YouTube timeout')),11000);
    function settle(e){if(done)return;done=true;clearTimeout(timer);if(e)reject(e);else resolve(window.YT)}
    window.onYouTubeIframeAPIReady=()=>{
      if(typeof prev==='function'){try{prev()}catch(_){}}
      settle(null);
    };
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.onerror=()=>settle(new Error('YouTube API unavailable'));document.head.appendChild(script);
  });
  return s.api;
}
function manualFrame(type,id,v){
  if(v!==s.version)return;
  const iframe=document.createElement('iframe');
  iframe.title=type==='live'?'Cámara del Uritorco en directo':'Grabación del Cerro Uritorco';
  iframe.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&mute=1&playsinline=1&rel=0';
  iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  $('uriPlayerHost').replaceChildren(iframe);
  $('uriSound').hidden=true;
}
function videoError(type,v){
  if(v!==s.version)return;
  if(s.player){try{s.player.destroy()}catch(_){}s.player=null}
  if(type==='live'&&!s.hasError){
    s.hasError=true;
    status('VIVO NO INSERTABLE · ARCHIVO','Grabación anterior · no en vivo');
    start('archive',archive().id);
    return;
  }
  s.type=null;s.id=null;s.hasError=true;
  status('REPRODUCCIÓN EXTERNA NO DISPONIBLE','Ver directamente en YouTube');
  $('uriVideoLabel').textContent='YOUTUBE NO PERMITE MOSTRAR ESTE VIDEO AQUÍ';
  intro('No es posible mostrar esta señal dentro de Horionis ahora. Podés abrir el canal original.');
}
async function start(type,id){
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
  if(s.type===type&&s.id===id)return;
  s.version++;const v=s.version;
  if(s.player){try{s.player.destroy()}catch(_){}s.player=null}
  s.type=type;s.id=id;
  $('uriIntro').hidden=true;$('uriPlayerHost').hidden=false;$('uriSound').hidden=true;
  legend(type);
  const mount=document.createElement('div');mount.id='uriYoutubePlayer';$('uriPlayerHost').replaceChildren(mount);
  try{
    const YT=await youtubeApi();
    if(v!==s.version)return;
    s.player=new YT.Player('uriYoutubePlayer',{
      width:'100%',height:'100%',videoId:id,
      playerVars:{autoplay:1,mute:1,playsinline:1,controls:1,rel:0,origin:location.origin},
      events:{
        onReady:e=>{if(v===s.version){e.target.mute();e.target.playVideo()}},
        onError:()=>videoError(type,v),
        onStateChange:e=>{
          if(v===s.version&&e.data===YT.PlayerState.PLAYING){
            $('uriSound').hidden=false;
            $('uriSound').textContent=s.player&&s.player.isMuted()?'♫ Activar sonido':'♫ Silenciar';
          }
        },
        onAutoplayBlocked:()=>{
          if(v===s.version)$('uriVideoLabel').textContent=(type==='live'?'EN VIVO':'GRABACIÓN')+' · AUTOPLAY BLOQUEADO · TOCÁ ▶';
        }
      }
    });
  }catch(_){manualFrame(type,id,v)}
}
async function refresh(){
  try{
    const response=await fetch('/api/uritorco',{cache:'no-store'});
    if(!response.ok)throw Error('Unavailable');
    const data=await response.json();
    clearTimeout(s.timer);s.verified=true;
    const id=data.live&&/^[A-Za-z0-9_-]{11}$/.test(data.videoId||'')?data.videoId:null;
    s.liveId=id;
    if(id){
      status('SEÑAL EN DIRECTO IDENTIFICADA','Transmisión identificada',true);
      await start('live',id);
    }else{
      status('SIN VIVO CONFIRMADO · ARCHIVO','Grabación anterior · no en vivo');
      if(s.type!=='archive'&&!s.hasError)await start('archive',archive().id);
    }
  }catch(_){
    clearTimeout(s.timer);
    status('VIVO NO VERIFICABLE · ARCHIVO','No se pudo consultar YouTube');
    if(!s.type&&!s.hasError)await start('archive',archive().id);
  }
}
$('uriPlay').addEventListener('click',()=>{
  if(s.hasError&&!s.type){window.open(LIVE_URL,'_blank','noopener,noreferrer');return}
  start(s.liveId?'live':'archive',s.liveId||archive().id);
});
$('uriSound').addEventListener('click',()=>{
  if(!s.player||typeof s.player.isMuted!=='function')return;
  if(s.player.isMuted()){s.player.unMute();$('uriSound').textContent='♫ Silenciar'}
  else{s.player.mute();$('uriSound').textContent='♫ Activar sonido'}
});
$('uriRefresh').addEventListener('click',refresh);
clock();setInterval(clock,30000);
s.timer=setTimeout(()=>{
  if(!s.verified&&!s.type){status('BUSCANDO VIVO · ARCHIVO TEMPORAL','Grabación anterior · no en vivo');start('archive',archive().id)}
},1800);
refresh();setInterval(refresh,300000);
})();