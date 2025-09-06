// reviews-widget.js
// Simple, dependency-free reviews widget
// Usage: initReviewsWidget({ endpoint: 'https://.../api/reviews', containerId: 'reviews-container' })

(function(){
  function qs(id){ return document.getElementById(id); }

  function starHtml(n){
    n = Math.max(0, Math.min(5, parseInt(n||0)));
    let s = '';
    for(let i=0;i<5;i++){
      s += (i < n) ? '★' : '☆';
    }
    return '<span class="rp-stars" aria-hidden="true">'+s+'</span>';
  }

  function timeAgo(dateStr){
    if(!dateStr) return '';
    const t = Date.parse(dateStr);
    if(isNaN(t)) return '';
    const sec = Math.floor((Date.now() - t)/1000);
    if(sec < 60) return sec + 's ago';
    if(sec < 3600) return Math.floor(sec/60) + 'm ago';
    if(sec < 86400) return Math.floor(sec/3600) + 'h ago';
    return Math.floor(sec/86400) + 'd ago';
  }

  function createCard(r){
    const img = r.image ? `<div class="rp-thumb"><img loading="lazy" src="${r.image}" alt="${escapeHtml(r.name)} review image"></div>` : '';
    const city = r.city ? `<div class="rp-city">${escapeHtml(r.city)}</div>` : '';
    return `
      <article class="rp-card">
        ${img}
        <div class="rp-body">
          <div class="rp-head">
            <strong class="rp-name">${escapeHtml(r.name)}</strong>
            ${r.verified ? '<span class="rp-verified">✔ Verified</span>' : ''}
            <div class="rp-meta">${starHtml(r.rating)} <span class="rp-date">${timeAgo(r.created_at)}</span></div>
          </div>
          ${city}
          <p class="rp-text">${escapeHtml(r.text)}</p>
        </div>
      </article>
    `;
  }

  function escapeHtml(s){
    if(!s) return '';
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'", '&#39;');
  }

  // Public init function
  window.initReviewsWidget = function(opts){
    if(!opts || !opts.endpoint || !opts.containerId) {
      console.error('initReviewsWidget: endpoint and containerId required');
      return;
    }
    const endpoint = opts.endpoint;
    const container = qs(opts.containerId);
    if(!container){
      console.error('initReviewsWidget: container not found:', opts.containerId);
      return;
    }

    // create shell
    container.innerHTML = `
      <div class="rp-widget">
        <div id="${opts.containerId}-grid" class="rp-grid"></div>
        <div class="rp-controls"><button id="${opts.containerId}-load" class="rp-load">Load more</button></div>
      </div>
    `;

    const grid = qs(opts.containerId+'-grid');
    const loadBtn = qs(opts.containerId+'-load');

    let allReviews = [];
    let perPage = opts.perPage || 6;
    let page = 0;

    async function fetchReviews(){
      try{
        const res = await fetch(endpoint, {cache:'no-store'});
        const j = await res.json();
        if(!j.ok) {
          grid.innerHTML = `<div class="rp-empty">No reviews found.</div>`;
          return;
        }
        allReviews = j.reviews || [];
        // newest first
        allReviews.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
        page = 0;
        renderPage();
      }catch(err){
        console.error(err);
        grid.innerHTML = `<div class="rp-empty">Unable to load reviews.</div>`;
      }
    }

    function renderPage(){
      const start = page * perPage;
      const end = start + perPage;
      const slice = allReviews.slice(start, end);
      if(page === 0) grid.innerHTML = '';
      slice.forEach(r => grid.insertAdjacentHTML('beforeend', createCard(r)));
      page++;
      // hide load more if nothing left
      if(end >= allReviews.length) loadBtn.style.display = 'none';
      else loadBtn.style.display = 'inline-block';
      // add accessible focus
    }

    loadBtn.addEventListener('click', ()=> renderPage());

    // initial fetch
    fetchReviews();

    // public refresh hook
    if(opts.onLoad) opts.onLoad();
    return {
      refresh: fetchReviews
    };
  };

})();
