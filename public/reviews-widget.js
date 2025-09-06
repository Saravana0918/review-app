// public/reviews-widget.js (replace)
(function(){
  let opt = { endpoint: '/api/reviews', containerId: 'reviews-container', perPage: 12 };

  function el(tag, attrs={}, html='') {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'cls') e.className = attrs[k];
      else if (k === 'on') {
        for (let ev in attrs[k]) e.addEventListener(ev, attrs[k][ev]);
      } else e.setAttribute(k, attrs[k]);
    }
    if (html) e.innerHTML = html;
    return e;
  }

  function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderForm(container) {
    const card = el('div',{cls:'r-form-card'});
    const h = el('h3',{}, 'Submit your review');
    card.appendChild(h);

    // form layout wrapper
    const form = el('form',{id:'reviewSubmitForm', enctype:'multipart/form-data'});
    // left fields
    const left = document.createElement('div');
    left.style.width = '100%';

    left.appendChild(el('label',{}, 'Your Name'));
    left.appendChild(el('input',{name:'name',type:'text',placeholder:'John'}));

    left.appendChild(el('label',{}, 'City'));
    left.appendChild(el('input',{name:'city',type:'text',placeholder:'Chennai'}));

    left.appendChild(el('label',{}, 'Rating'));
    const sel = el('select',{name:'rating'});
    ['5 - Excellent','4 - Very good','3 - Good','2 - Fair','1 - Poor'].forEach((t,i)=>{
      const optn = el('option',{value:5-i}, t);
      sel.appendChild(optn);
    });
    left.appendChild(sel);

    left.appendChild(el('label',{}, 'Review'));
    left.appendChild(el('textarea',{name:'text',placeholder:'Share your experience...'}));

    // right column: file preview + file input
    const right = el('div',{cls:'r-form-file'});
    right.style.width = '220px';
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '10px';

    const preview = el('div',{cls:'r-empty'}, 'photo');
    preview.style.height = '140px';
    right.appendChild(preview);

    right.appendChild(el('label',{}, 'Photo (optional)'));
    const fileInp = el('input',{type:'file', name:'image', accept:'image/*'});
    right.appendChild(fileInp);

    // show preview on file select
    fileInp.addEventListener('change', function(e){
      const f = this.files && this.files[0];
      if(!f){ preview.innerText='photo'; preview.style.background=''; return; }
      const url = URL.createObjectURL(f);
      preview.innerHTML = '';
      const img = el('img',{cls:'r-thumb', src: url});
      img.onload = ()=> URL.revokeObjectURL(url);
      preview.appendChild(img);
    });

    // row wrapper
    const row = el('div',{cls:'r-form-row'});
    row.appendChild(left);
    row.appendChild(right);

    form.appendChild(row);

    const submitRow = el('div',{cls:'r-submit-row'});
    const btn = el('button',{type:'submit', cls:'r-submit-btn'}, 'Submit review');
    const msg = el('div',{cls:'r-msg'}, '');
    submitRow.appendChild(btn);
    submitRow.appendChild(msg);
    form.appendChild(submitRow);

    form.addEventListener('submit', function(e){
      e.preventDefault();
      submitForm(new FormData(form), btn, msg);
    });

    card.appendChild(form);
    container.appendChild(card);
  }

  function createCard(r){
    const card = el('div',{cls:'r-card'});
    if(r.image){
      const img = el('img',{cls:'r-thumb', src: r.image, loading: 'lazy', alt: escapeHtml(r.name || 'photo')});
      card.appendChild(img);
    } else {
      card.appendChild(el('div',{cls:'r-empty'}, 'photo'));
    }

    const body = el('div',{cls:'r-body'});
    const top = el('div',{cls:'r-top'});
    // left side → reviewer name
    const name = el('div',{cls:'r-name'}, escapeHtml(r.name || 'Anonymous'));

    // right side → customer name (if available), illena fallback to city or name
    const customerName = (r.customer_name || r.name || r.city || '').toString().trim();
    let rightEl = null;
    if (customerName) {
      rightEl = el('div',{cls:'r-city'}, + escapeHtml(customerName));
    }

    top.appendChild(name);
    if (rightEl) top.appendChild(rightEl);

    body.appendChild(top);

    const stars = el('div',{cls:'r-stars'}, '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0)));
    body.appendChild(stars);

    const txt = el('div',{cls:'r-text'}, escapeHtml(r.text || ''));
    body.appendChild(txt);

    card.appendChild(body);
    return card;
  }

  function renderReviews(container, reviews){
    const grid = el('div',{cls:'r-grid'});
    reviews.forEach(r => grid.appendChild(createCard(r)));
    container.appendChild(grid);
  }

  function loadAndRender(){
    const container = document.getElementById(opt.containerId);
    if(!container) return console.warn('reviews container not found');
    container.innerHTML = '';
    renderForm(container);

    // loader
    const loader = el('div',{}, 'Loading reviews...');
    container.appendChild(loader);

    fetch(opt.endpoint)
      .then(r => r.json())
      .then(json => {
        container.removeChild(loader);
        if(!json || !Array.isArray(json.reviews) && !Array.isArray(json)) {
          const rows = json.reviews || [];
          renderReviews(container, rows.slice(0, opt.perPage));
        } else {
          // older format support
          const rows = json.reviews || json;
          renderReviews(container, rows.slice(0, opt.perPage));
        }
      })
      .catch(err => {
        console.error(err);
        loader.innerText = 'Failed to load reviews.';
      });
  }

  function submitForm(fd, btn, msgEl){
    btn.disabled = true;
    msgEl.innerText = 'Submitting...';

    // POST to /api/submit-review (server supports both /api/reviews and /api/submit-review)
    fetch(opt.endpoint.replace(/\/$/, '') , {
      method: 'POST',
      body: fd
    }).then(r => r.json())
      .then(json => {
        btn.disabled = false;
        if(json && json.ok){
          msgEl.innerText = 'Thanks! Review submitted.';
          // show toast
          showToast('Review submitted');
          // reload reviews after small delay
          setTimeout(loadAndRender, 900);
        } else {
          msgEl.innerText = (json && json.message) ? json.message : 'Submission failed';
        }
      })
      .catch(err => {
        console.error(err);
        btn.disabled = false;
        msgEl.innerText = 'Error submitting. Check console.';
      });
  }

  function showToast(text){
    let t = document.querySelector('.r-toast');
    if(!t){
      t = el('div',{cls:'r-toast'}, text);
      document.body.appendChild(t);
    }
    t.innerText = text;
    t.classList.add('show');
    setTimeout(()=> t.classList.remove('show'), 3000);
  }

  window.initReviewWidget = function(options){
    opt = Object.assign(opt, options || {});
    // if endpoint is /api/reviews on same host, use absolute (Shopify page is different host)
    // so prefer absolute endpoint passed in init
    loadAndRender();
  };
})();
