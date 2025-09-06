// Usage:
// 1) include this script on the Fan Reviews page or in a section
// 2) create a container: <div id="reviews-container"></div>
// 3) call initReviewsWidget({ endpoint: 'https://YOUR_SERVER/api/reviews', containerId: 'reviews-container' })

async function initReviewsWidget(opts){
  const endpoint = opts.endpoint;
  const container = document.getElementById(opts.containerId || 'reviews-container');
  if(!container) return;
  container.innerHTML = '<p>Loading reviews...</p>';
  try{
    const resp = await fetch(endpoint);
    const json = await resp.json();
    if(!json.ok){ container.innerText = 'Failed to load'; return; }
    const reviews = json.reviews || [];
    if(reviews.length === 0){ container.innerText = 'No reviews yet.'; return; }
    const cards = reviews.map(r=>{
      return `<div class="rp-card" style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 6px 14px rgba(0,0,0,0.06);margin:8px;display:flex;gap:12px;align-items:flex-start;">
        ${ r.image ? `<img src="${r.image}" style="width:80px;height:80px;object-fit:cover;border-radius:8px" />` : `<div style="width:80px;height:80px;background:#f3f3f3;border-radius:8px"></div>` }
        <div>
          <strong>${escapeHtml(r.name||'')}</strong> <div style="color:#666">${escapeHtml(r.city||'')}</div>
          <div style="margin:6px 0">${renderStars(r.rating||0)}</div>
          <div style="color:#333">${escapeHtml(r.text||'')}</div>
        </div>
      </div>`; }).join('');
    container.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">'+cards+'</div>';
  }catch(err){
    container.innerText = 'Network error';
  }
}
function renderStars(n){
  let out=''; for(let i=1;i<=5;i++){ out += (i<=n ? '★' : '☆'); }
  return '<span style="color:#f5b301">'+out+'</span>';
}
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
