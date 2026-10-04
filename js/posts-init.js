window.HORIONIS_POSTS=[];
window.HORIONIS_COUNTS={};
window.HORIONIS_READY=(async()=>{
  const BASE='https://horionis.com/wp-json/wp/v2';
  const decode=s=>{const t=document.createElement('textarea');t.innerHTML=s||'';return t.value};
  const strip=s=>decode(String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
  const req=async url=>{const r=await fetch(url,{mode:'cors',credentials:'omit'});if(!r.ok)throw new Error(`WP API ${r.status}`);return r.json()};
  const [cats,p1,p2]=await Promise.all([
    req(`${BASE}/categories?per_page=100&hide_empty=false`),
    req(`${BASE}/posts?per_page=100&page=1&_embed=1&orderby=date&order=desc`),
    req(`${BASE}/posts?per_page=100&page=2&_embed=1&orderby=date&order=desc`).catch(()=>[])
  ]);
  const cmap=new Map(cats.map(c=>[c.id,c.name]));
  const posts=[...p1,...p2].map(p=>({
    title:decode(p.title?.rendered||''),link:p.link,slug:p.slug,date:(p.date||'').replace('T',' '),author:p.author===2?'equiposcidata':'horionis_admin',
    categories:(p.categories||[]).map(id=>cmap.get(id)).filter(Boolean),tags:[],
    thumbnail:p._embedded?.['wp:featuredmedia']?.[0]?.source_url||'',excerpt:strip(p.excerpt?.rendered||'').replace(/\[…\]$/,'').slice(0,360),
    content:p.content?.rendered||''
  }));
  window.HORIONIS_POSTS.push(...posts);
  for(const p of posts)for(const c of p.categories)window.HORIONIS_COUNTS[c]=(window.HORIONIS_COUNTS[c]||0)+1;
  return posts;
})().catch(err=>{console.error('Horionis content load failed',err);return window.HORIONIS_POSTS});
