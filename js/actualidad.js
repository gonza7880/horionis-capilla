function relDate(s){
  const d=new Date(s),now=new Date(),ms=now-d;if(!Number.isFinite(ms))return'';
  const h=Math.floor(ms/36e5);if(h<1)return'Ahora';if(h<24)return'hace '+h+' h';
  const days=Math.floor(h/24);if(days<7)return'hace '+days+' d';
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'short'});
}
function safeUrl(s=''){try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:'#'}catch{return'#'}}
function newsCard(n,compact=false){
  return `<a class="live-news-card ${compact?'compact':''}" href="${safeUrl(n.url)}" target="_blank" rel="noopener"><div class="live-card-top"><span class="live-dot"></span><span>${esc(n.source||'Fuente')}</span><time>${relDate(n.date)}</time></div><h3>${esc(n.title)}</h3><span class="live-arrow">Abrir fuente ↗</span></a>`;
}
function channelCard(c,compact=false){
  return `<article class="live-video-card live-channel-card ${compact?'compact':''}" data-playlist="${esc(c.playlist)}"><button class="live-video-hit" type="button" aria-label="Ver últimos videos de ${esc(c.name)}"><div class="live-video-media"><img loading="lazy" src="${esc(c.cover)}" alt=""><span class="live-play">▶</span><span class="live-lang">${esc(c.lang||'')}</span><span class="live-channel-live">ÚLTIMOS VIDEOS</span></div><div class="live-video-copy"><div class="live-card-top"><span class="live-dot"></span><span>Canal seleccionado</span></div><h3>${esc(c.name)}</h3><span class="live-arrow">Abrir canal en Horionis →</span></div></button></article>`;
}
function mountChannelPlayers(root=document){
  root.querySelectorAll('.live-channel-card[data-playlist]').forEach(card=>{
    const btn=card.querySelector('.live-video-hit');if(!btn||btn.dataset.ready)return;btn.dataset.ready='1';
    btn.addEventListener('click',()=>{
      const list=card.dataset.playlist;if(!list)return;
      card.innerHTML=`<div class="live-embed"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&autoplay=1&rel=0" title="Últimos videos de YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    },{once:true});
  });
}
async function getActualidad(){
  const r=await fetch('/api/actualidad',{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error('Actualidad '+r.status);return r.json();
}
async function renderActualidadPage(){
  const newsRoot=document.getElementById('liveNewsGrid'),videoRoot=document.getElementById('liveVideoGrid');
  if(!newsRoot&&!videoRoot)return;
  try{
    const d=await getActualidad();
    if(newsRoot)newsRoot.innerHTML=d.news.length?d.news.map(n=>newsCard(n)).join(''):'<div class="live-empty">No hay noticias relevantes disponibles en este momento.</div>';
    if(videoRoot)videoRoot.innerHTML=(d.channels||[]).map(c=>channelCard(c)).join('');
    const stamp=document.getElementById('actualidadStamp');if(stamp&&d.generatedAt)stamp.textContent='Actualizado '+new Date(d.generatedAt).toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    mountChannelPlayers(document);mountReveal();
  }catch(e){
    console.error(e);if(newsRoot)newsRoot.innerHTML='<div class="live-empty">La señal de noticias está temporalmente fuera de línea.</div>';
  }
}
async function renderHomeActualidad(){
  const newsRoot=document.getElementById('homeLiveNews'),videoRoot=document.getElementById('homeLiveVideos');
  if(!newsRoot&&!videoRoot)return;
  try{
    const d=await getActualidad();
    if(newsRoot)newsRoot.innerHTML=d.news.slice(0,3).map(n=>newsCard(n,true)).join('');
    if(videoRoot)videoRoot.innerHTML=(d.channels||[]).slice(0,4).map(c=>channelCard(c,true)).join('');
    mountChannelPlayers(document);mountReveal();
  }catch(e){console.error(e);const box=document.getElementById('homeActualidad');if(box)box.classList.add('live-offline')}
}
document.addEventListener('DOMContentLoaded',()=>{renderActualidadPage();renderHomeActualidad()});
