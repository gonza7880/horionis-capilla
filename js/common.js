const POSTS=window.HORIONIS_POSTS||[];const COUNTS=window.HORIONIS_COUNTS||{};const FALLBACK_POOLS={
  ovnis:['/assets/fallbacks/ovnis-1.svg','/assets/fallbacks/ovnis-2.svg','/assets/fallbacks/ovnis-3.svg'],
  cosmos:['/assets/fallbacks/cosmos-1.svg','/assets/fallbacks/cosmos-2.svg','/assets/fallbacks/cosmos-3.svg'],
  historia:['/assets/fallbacks/historia-1.svg','/assets/fallbacks/historia-2.svg','/assets/fallbacks/historia-3.svg'],
  ciencia:['/assets/fallbacks/ciencia-1.svg','/assets/fallbacks/ciencia-2.svg','/assets/fallbacks/ciencia-3.svg'],
  eventos:['/assets/fallbacks/eventos-1.svg','/assets/fallbacks/eventos-2.svg','/assets/fallbacks/eventos-3.svg'],
  misterio:['/assets/fallbacks/misterio-1.svg','/assets/fallbacks/misterio-2.svg','/assets/fallbacks/misterio-3.svg']
};
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmtDate(s){if(!s)return'';const d=new Date(s.replace(' ','T'));return d.toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})}
function coverHash(s=''){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function fallbackTheme(post){
  const text=`${post?.title||''} ${post?.excerpt||''} ${(post?.categories||[]).join(' ')}`.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/ovni|ufo|alien|extraterrestre|abducc|roswell|area 51|nave|contacto|platillo|no identificado/.test(text))return'ovnis';
  if(/luna|marte|planeta|galax|universo|cosmos|astronom|estrella|sol|astronauta|espacio|meteor|cometa/.test(text))return'cosmos';
  if(/egipto|nazi|arqueolog|civiliz|antigu|templo|historia|piramid|mito|leyenda|ritual/.test(text))return'historia';
  if(/ciencia|tiempo|tecnolog|tesla|experimento|teletransport|fisica|energia|dimension|maquina/.test(text))return'ciencia';
  if(/congreso|conferencia|entrevista|documental|presentacion|radio|trailer|evento|charla/.test(text))return'eventos';
  return'misterio';
}
function fallbackFor(post,i=0){
  const theme=fallbackTheme(post),pool=FALLBACK_POOLS[theme]||FALLBACK_POOLS.misterio;
  const key=post?.slug||post?.title||String(i);
  return pool[coverHash(key)%pool.length];
}
const LEGACY_MEDIA_ARCHIVE={
'/wp-content/uploads/2019/06/afichecongresocurvas.png':'https://web.archive.org/web/20191211011408id_/http://horionis.com/wp-content/uploads/2019/06/afichecongresocurvas.png',
'/wp-content/uploads/2022/10/afichecongresocurvas.png':'https://web.archive.org/web/20230130234029id_/http://horionis.com/wp-content/uploads/2022/10/afichecongresocurvas.png'
};
const LEGACY_MEDIA_MISSING=new Set([
'/wp-content/uploads/2019/06/Zerpa.jpg',
'/wp-content/uploads/2019/06/Yohanan.jpg',
'/wp-content/uploads/2019/06/lorenzo.jpg',
'/wp-content/uploads/2019/06/abel.jpg',
'/wp-content/uploads/2019/06/juan_andres.jpg',
'/wp-content/uploads/2019/06/ricardo.jpg',
'/wp-content/uploads/2019/06/giorgio.jpg',
'/wp-content/uploads/2019/06/paul.jpg',
'/wp-content/uploads/2019/06/logo_legado.png',
'/wp-content/uploads/2019/06/logo_horionis.png',
'/wp-content/uploads/2019/06/logo_capilla_del_monte.png'
]);
const HISTORICAL_COVERS={
'2o-congreso-de-enigmas-y-misterios-del-cosmos':LEGACY_MEDIA_ARCHIVE['/wp-content/uploads/2019/06/afichecongresocurvas.png'],
'3er-congreso-de-enigmas-y-misterios-del-cosmos':LEGACY_MEDIA_ARCHIVE['/wp-content/uploads/2022/10/afichecongresocurvas.png'],
'trailer-3er-congreso-enigmas-y-misterios-del-cosmos':LEGACY_MEDIA_ARCHIVE['/wp-content/uploads/2022/10/afichecongresocurvas.png']
};
function legacyArchiveUrl(src=''){try{return LEGACY_MEDIA_ARCHIVE[new URL(src,location.origin).pathname]||''}catch{return''}}
function legacyPlaceholder(label='Archivo multimedia'){
  const safe=String(label||'Archivo multimedia').replace(/[&<>"]/g,'').slice(0,46);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#070a18"/><stop offset="1" stop-color="#10162e"/></linearGradient><radialGradient id="r"><stop stop-color="#72e8ff" stop-opacity=".22"/><stop offset="1" stop-color="#72e8ff" stop-opacity="0"/></radialGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="630" cy="110" r="210" fill="url(#r)"/><circle cx="400" cy="250" r="150" fill="none" stroke="#72e8ff" stroke-opacity=".17"/><circle cx="400" cy="250" r="95" fill="none" stroke="#9a86ff" stroke-opacity=".13" stroke-dasharray="7 10"/><text x="48" y="72" fill="#72e8ff" font-family="Arial,sans-serif" font-size="17" letter-spacing="4">ARCHIVO HORIONIS</text><text x="48" y="365" fill="#f6f8ff" font-family="Arial,sans-serif" font-size="30" font-weight="700">${safe}</text><text x="48" y="405" fill="#8995b5" font-family="Arial,sans-serif" font-size="17">Imagen histórica no recuperada del servidor original</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function repairLegacyMedia(root){
  if(!root)return;
  root.querySelectorAll('img').forEach(img=>{
    const original=img.getAttribute('src')||'';
    let pathname='';try{pathname=new URL(original,location.origin).pathname}catch{}
    const archived=legacyArchiveUrl(original);
    if(archived)img.src=archived;
    const fail=()=>{
      if(img.dataset.legacyFallback==='1')return;
      img.dataset.legacyFallback='1';
      const figure=img.closest('figure');
      const caption=figure?.querySelector('figcaption')?.textContent?.trim();
      const label=caption||img.alt||'Archivo multimedia';
      img.onerror=null;
      img.src=legacyPlaceholder(label);
      img.classList.add('legacy-media-placeholder');
      img.title='La imagen original ya no está disponible en el servidor histórico.';
    };
    if(LEGACY_MEDIA_MISSING.has(pathname)){fail();return}
    img.addEventListener('error',fail,{once:true});
    requestAnimationFrame(()=>{if(img.complete&&img.naturalWidth===0)fail()});
  });
}
function firstContentImage(post){
  const m=(post?.content||'').match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  if(!m)return'';
  const src=m[1].replace(/&amp;/g,'&');
  let pathname='';try{pathname=new URL(src,location.origin).pathname}catch{}
  if(LEGACY_MEDIA_ARCHIVE[pathname])return LEGACY_MEDIA_ARCHIVE[pathname];
  if(LEGACY_MEDIA_MISSING.has(pathname))return'';
  return src;
}
function imgFor(post,i=0){return HISTORICAL_COVERS[post.slug]||post.thumbnail||firstContentImage(post)||fallbackFor(post,i)}function articleUrl(p){return`/${encodeURIComponent(p.slug)}`}
function mountNav(){const nav=document.querySelector('.nav');if(!nav)return;const tick=()=>nav.classList.toggle('scrolled',scrollY>18);tick();addEventListener('scroll',tick,{passive:true});const b=document.querySelector('.menu-btn');if(b)b.onclick=()=>document.querySelector('.nav-links')?.classList.toggle('mobile-open')}
function mountReveal(){if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));return}const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.reveal:not(.in)').forEach(el=>io.observe(el))}
function mountCursor(){const g=document.querySelector('.cursor-glow');if(!g||matchMedia('(pointer:coarse)').matches)return;addEventListener('pointermove',e=>{g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'},{passive:true})}
function mountStars(){const c=document.getElementById('starfield');if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const x=c.getContext('2d');let stars=[];function rs(){const r=Math.min(devicePixelRatio,2);c.width=innerWidth*r;c.height=innerHeight*r;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';x.setTransform(r,0,0,r,0,0);stars=Array.from({length:Math.min(180,Math.floor(innerWidth/7))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.25+.15,a:Math.random()*.78+.2,v:Math.random()*.1+.02}))}function draw(){x.clearRect(0,0,innerWidth,innerHeight);for(const s of stars){s.y+=s.v;if(s.y>innerHeight)s.y=0;x.beginPath();x.arc(s.x,s.y,s.r,0,Math.PI*2);x.fillStyle=`rgba(210,235,255,${s.a})`;x.fill()}requestAnimationFrame(draw)}rs();draw();addEventListener('resize',rs,{passive:true})}
function mountTilt(){if(matchMedia('(pointer:coarse)').matches)return;document.querySelectorAll('[data-tilt]').forEach(card=>{if(card.dataset.tiltMounted)return;card.dataset.tiltMounted='1';card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateY(${x*3.5}deg) rotateX(${-y*3.5}deg) translateY(-3px)`});card.addEventListener('pointerleave',()=>card.style.transform='')})}
function firstVideoId(p){const s=p.content||'';let m=s.match(/youtube\.com\/embed\/([\w-]+)/i)||s.match(/youtube\.com\/watch\?v=([\w-]+)/i)||s.match(/youtu\.be\/([\w-]+)/i);return m?m[1]:''}
function normalizeLegacyHtml(content=''){const clean=content.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/\son\w+\s*=\s*(["']).*?\1/gi,'').replace(/javascript:/gi,'').replace(/<!--more-->/gi,'').replace(/\swidth=["']\d+["']/gi,'').replace(/\sheight=["']\d+["']/gi,'');const chunks=clean.split(/\n\s*\n+/).map(s=>s.trim()).filter(Boolean);return chunks.map(ch=>/^<(?:p|div|iframe|img|ul|ol|blockquote|h[1-6]|table|figure|video)\b/i.test(ch)?ch:`<p>${ch.replace(/\n/g,'<br>')}</p>`).join('\n')}
function postCard(p,i=0){return`<article class="post-card reveal"><a href="${articleUrl(p)}"><div class="post-media"><img loading="lazy" src="${esc(imgFor(p,i))}" onerror="this.onerror=null;this.src='${fallbackFor(p,i)}'" alt=""></div><div class="post-body"><div class="post-meta"><span>${esc((p.categories||[])[0]||'Archivo')}</span><span>${fmtDate(p.date)}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.excerpt||'Exploración del archivo Horionis.')}</p><span class="readmore">Abrir expediente →</span></div></a></article>`}
function mountImageSafety(){
  document.addEventListener('error',e=>{
    const img=e.target;
    if(!(img instanceof HTMLImageElement)||img.dataset.horionisSafe==='1')return;
    img.dataset.horionisSafe='1';
    img.onerror=null;
    const pseudo={slug:location.pathname,title:img.alt||document.title,categories:[]};
    img.src=fallbackFor(pseudo,coverHash(img.currentSrc||img.src||location.pathname));
  },true);
}
function footerYear(){const y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear()}
function initCommon(){mountNav();mountReveal();mountCursor();mountStars();mountTilt();mountImageSafety();footerYear()}document.addEventListener('DOMContentLoaded',initCommon);