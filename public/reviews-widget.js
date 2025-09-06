// public/reviews-widget.js
(function () {
  // default options (override when init called)
  let opt = {
    endpoint: '/api/reviews',
    containerId: 'reviews-container',
    perPage: 12
  };

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.keys(attrs).forEach(k => {
      if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'on') {
        // { click: fn }
        Object.keys(attrs[k]).forEach(evt => el.addEventListener(evt, attrs[k][evt]));
      } else el.setAttribute(k, attrs[k]);
    });
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function renderReviews(container, reviews) {
  const grid = createEl('div', { class: 'r-grid' });
  reviews.forEach(r => {
    const card = createEl('div', { class: 'r-card' });
    const img = r.image ? createEl('img', { src: r.image, alt: 'photo', class: 'r-photo' }) : null;
    const name = createEl('div', { class: 'r-name', html: `${escapeHtml(r.name || '')} — ${escapeHtml(r.city || '')}` });
    const rating = createEl('div', { class: 'r-rating' });
    const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
    rating.innerHTML = stars;
    const text = createEl('div', { class: 'r-text', html: escapeHtml(r.text || '') });
    if (img) card.appendChild(img);
    card.appendChild(name); 
    card.appendChild(rating); 
    card.appendChild(text);
    grid.appendChild(card);
  });
  container.appendChild(grid);
}


  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderForm(container) {
    const form = createEl('form', { id: 'reviewSubmitForm', enctype: 'multipart/form-data' });
    form.innerHTML = `
      <h3>Submit your review</h3>
      <label> Your name <input name="name" required /></label><br/>
      <label> City <input name="city" /></label><br/>
      <label> Rating
        <select name="rating">
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Very good</option>
          <option value="3">3 - Good</option>
          <option value="2">2 - Fair</option>
          <option value="1">1 - Poor</option>
        </select>
      </label><br/>
      <label> Review <textarea name="text" rows="4" required></textarea></label><br/>
      <label> Photo (optional) <input type="file" name="image" accept="image/*" /></label><br/>
      <button type="submit">Submit review</button>
      <div id="r-msg" style="margin-top:10px"></div>
    `;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm(form);
    });
    container.appendChild(form);
  }

  function submitForm(form) {
    const msg = document.getElementById('r-msg');
    msg.innerText = 'Submitting...';
    const fd = new FormData(form);

    fetch(opt.endpoint, {
      method: 'POST',
      body: fd,
      // DO NOT set Content-Type header for multipart FormData - browser will set boundary
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.ok) {
        msg.innerText = 'Thanks — review submitted!';
        // optionally re-fetch reviews to show latest
        loadAndRender();
      } else {
        msg.innerText = data && data.message ? data.message : 'Submission failed';
      }
    })
    .catch(err => {
      console.error(err);
      msg.innerText = 'Error submitting review. Check console.';
    });
  }

  function empty(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function loadAndRender() {
    const container = document.getElementById(opt.containerId);
    if (!container) return console.warn('Reviews container not found:', opt.containerId);
    empty(container);

    // show loader
    const loader = createEl('div', { class: 'r-loader', html: 'Loading reviews...' });
    container.appendChild(loader);

    fetch(opt.endpoint)
      .then(r => r.json())
      .then(json => {
        empty(container);
        const reviews = json.reviews || [];
        renderForm(container);
        if (reviews.length === 0) {
          container.appendChild(createEl('div', { html: '<p>No reviews yet — be first!</p>' }));
        } else {
          renderReviews(container, reviews.slice(0, opt.perPage));
        }
      })
      .catch(err => {
        empty(container);
        container.appendChild(createEl('div', { html: '<p>Error loading reviews.</p>' }));
        console.error('load reviews error', err);
      });
  }

  // public init
  window.initReviewWidget = function (options) {
    opt = Object.assign(opt, options || {});
    // allow path-only endpoints, convert to absolute if needed
    if (window.location.protocol === 'https:' && opt.endpoint && opt.endpoint.indexOf('//') === -1 && opt.endpoint.indexOf('http') !== 0) {
      // if you provided relative path, leave it. (Shopify will call from customer's domain & CORS matters)
    }
    // Kickoff
    loadAndRender();
  };
})();
