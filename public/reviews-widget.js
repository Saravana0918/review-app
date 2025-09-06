// reviews-widget.js
// dependency-free reviews widget with horizontal carousel and neat cards
async function initReviewsWidget(opts){
  const endpoint = opts.endpoint;
  const containerId = opts.containerId || 'reviews-container';
  const perPage = opts.perPage || 12;

  const container = document.getElementById(containerId);
  if(!container){ console.error('reviews widget container missing', containerId); return; }

  // shell
  container.innerHTML = `
    <section class="rp-section">
      <h2 class="rp-title">What people think about us</h2>
      <p class="rp-sub">Photos, ratings & short stories from our customers</p>
      <div class="rp-carousel-wrap">
        <button class="rp-arrow rp-left" aria-label="scroll left">‹</button>
        <div class="rp-carousel-viewport"><div id="${containerId}-grid" class="rp-grid"></div></div>
        <button class="rp-arrow rp-right" aria-label="scroll right">›</button>
      </div>
    </section>
  `;

  const grid = document.getElementById(containerId+'-grid');
  const left = container.querySelector('.rp-left');
  const right = container.querySelector('.rp-right');

  function renderStars(n){
    n = parseInt(n) || 0;
    let s = '';
    for(let i=1;i<=5;i++) s += (i<=n) ? '★' : '☆';
    return `<span class="rp-stars" aria-hidden="true">${s}</span>`;
  }

  function esc(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function cardHtml(r){
    const img = r.image ? `<div class="rp-avatar"><img src="${esc(r.image)}" alt="customer image"></div>` : `<div class="rp-avatar"><img src="https://via.placeholder.com/150?text=User" alt="user"></div>`;
    const loc = r.city ? `<div class="rp-loc">${esc(r.city)}</div>` : '';
    const short = esc(r.text || '').length > 220 ? esc(r.text).slice(0,220) + '…' : esc(r.text || '');
    return `
      <article class="rp-card">
        ${img}
        <div class="rp-body">
          <div class="rp-name-row">
            <div>
              <div class="rp-name">${esc(r.name || 'Anonymous')}</div>
              ${loc}
            </div>
            <div class="rp-meta">${renderStars(r.rating)}</div>
          </div>
          <div class="rp-text">${short}</div>
          <div class="rp-cta"><button class="rp-view" data-id="${r.id}">Explore More</button></div>
        </div>
      </article>
    `;
  }

  // fetch
  async function fetchReviews(){
    try{
      grid.innerHTML = '<div style="padding:30px;color:#666">Loading reviews…</div>';
      const res = await fetch(endpoint, {cache:'no-store'});
      const j = await res.json();
      if(!j.ok){ grid.innerHTML = '<div style="padding:20px;color:#666">No reviews found.</div>'; return; }
      const reviews = (j.reviews || []).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
      if(reviews.length === 0){ grid.innerHTML = '<div style="padding:20px;color:#666">No reviews yet. Be first!</div>'; return; }
      // build cards
      grid.innerHTML = reviews.slice(0, perPage).map(cardHtml).join('');
      // optionally add more if larger perPage requested
      initInteractions();
      updateArrows();
    }catch(err){
      console.error(err);
      grid.innerHTML = '<div style="padding:20px;color:#666">Unable to load reviews.</div>';
    }
  }

  // interactions: arrows, buttons
  function initInteractions(){
    // arrow scroll amount
    const scrollBy = () => Math.floor(grid.clientWidth * 0.75);
    left.onclick = ()=> grid.scrollBy({ left: -scrollBy(), behavior:'smooth' });
    right.onclick = ()=> grid.scrollBy({ left: scrollBy(), behavior:'smooth' });

    // swipe/mouse wheel for nicer UX
    grid.addEventListener('wheel', (e)=>{
      if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){ e.preventDefault(); grid.scrollBy({ left: e.deltaY, behavior:'auto' }); }
    }, { passive:false });

    // "Explore More" button click — simple lightbox/show full text
    grid.querySelectorAll('.rp-view').forEach(btn=>{
      btn.addEventListener('click', async (ev)=>{
        const id = ev.currentTarget.dataset.id;
        // find review data (simple)
        const res = await fetch(endpoint, {cache:'no-store'});
        const j = await res.json();
        const r = (j.reviews || []).find(x=> String(x.id) === String(id));
        if(!r) return;
        showModal(r);
      });
    });

    // hide arrows on mobile (CSS does but ensure update)
    grid.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
  }

  function updateArrows(){
    // hide left/right when not scrollable
    const wrap = container.querySelector('.rp-carousel-viewport');
    if(!wrap) return;
    const canScroll = grid.scrollWidth > wrap.clientWidth + 10;
    left.style.display = canScroll ? 'flex' : 'none';
    right.style.display = canScroll ? 'flex' : 'none';
  }

  // modal to show full review when "Explore More"
  function showModal(r){
    // create overlay
    const ov = document.createElement('div');
    ov.style.position='fixed'; ov.style.left=0; ov.style.top=0; ov.style.right=0; ov.style.bottom=0;
    ov.style.background='rgba(0,0,0,0.55)'; ov.style.display='flex'; ov.style.alignItems='center'; ov.style.justifyContent='center';
    ov.style.zIndex=99999;
    ov.innerHTML = `
      <div style="max-width:820px;width:92%;background:#fff;border-radius:12px;padding:22px;box-shadow:0 20px 60px rgba(10,15,30,0.25);">
        <div style="display:flex;gap:18px;align-items:flex-start">
          <div style="width:120px;height:120px;border-radius:12px;overflow:hidden"><img src="${r.image||''}" style="width:100%;height:100%;object-fit:cover"></div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:18px">${r.name||'Anonymous'}</div>
            <div style="color:#777;margin-top:6px">${r.city||''} • ${new Date(r.created_at||'').toLocaleDateString()}</div>
            <div style="margin-top:10px;color:#f5a623">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</div>
            <div style="margin-top:12px;color:#333;line-height:1.5">${r.text||''}</div>
            <div style="margin-top:18px;text-align:right"><button style="background:#0b66ff;color:#fff;border:0;padding:8px 12px;border-radius:8px;cursor:pointer">Close</button></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    ov.querySelector('button').addEventListener('click', ()=> ov.remove());
    ov.addEventListener('click', (e)=> { if(e.target === ov) ov.remove(); });
  }

  // initial fetch
  fetchReviews();

  // expose refresh
  return { refresh: fetchReviews };
}
