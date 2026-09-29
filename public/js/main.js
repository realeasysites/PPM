(function () {
  'use strict';

  // Year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile nav
  var toggle = document.querySelector('.nav__toggle');
  var list = document.getElementById('nav-list');
  if (toggle && list) {
    toggle.addEventListener('click', function () {
      var open = list.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    list.addEventListener('click', function (e) {
      if (e.target.closest('a')) { list.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Hero video: pause for reduced motion, and hide if the file is missing so the gradient shows
  var video = document.querySelector('.hero__video');
  if (video) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.pause();
    var src = video.querySelector('source');
    if (src) src.addEventListener('error', function () { video.style.display = 'none'; });
  }

  // Photos
  var photos = window.PPM_PHOTOS || { gallery: [], slots: {} };
  Object.keys(photos.slots || {}).forEach(function (key) {
    document.querySelectorAll('[data-photo="' + key + '"]').forEach(function (el) {
      var img = new Image();
      img.src = photos.slots[key];
      img.alt = (el.textContent || '').trim();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = function () { img.remove(); el.classList.remove('has-photo'); };
      el.prepend(img);
      el.classList.add('has-photo');
    });
  });

  var grid = document.getElementById('gallery-grid');
  if (grid) {
    var items = (photos.gallery || []).length ? photos.gallery : [
      { caption: 'Project photo' }, { caption: 'Project photo' }, { caption: 'Project photo' },
      { caption: 'Project photo' }, { caption: 'Project photo' }, { caption: 'Project photo' }
    ];
    items.forEach(function (p) {
      var fig = document.createElement('figure');
      fig.setAttribute('data-photo', '');
      if (p.src) {
        var img = new Image();
        img.src = p.src; img.alt = p.caption || 'Pine Point Metal steel building'; img.loading = 'lazy'; img.decoding = 'async';
        fig.appendChild(img);
        fig.classList.add('has-photo');
      }
      var cap = document.createElement('span');
      cap.textContent = p.caption || '';
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }

  // "Quote this size" buttons prefill the form
  var form = document.getElementById('quote-form');
  document.querySelectorAll('[data-size], [data-type]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!form) return;
      var size = btn.getAttribute('data-size');
      var type = btn.getAttribute('data-type');
      if (size) {
        var p = size.split('x');
        form.width.value = p[0] || ''; form.length.value = p[1] || ''; form.height.value = p[2] || '';
      }
      if (type) form.building_type.value = type;
      setTimeout(function () { form.name.focus({ preventScroll: true }); }, 500);
    });
  });

  // Quote form submit
  if (form) {
    var status = form.querySelector('.form__status');
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
      status.className = 'form__status';

      var data = Object.fromEntries(new FormData(form).entries());
      data.source_page = location.pathname;

      var errs = [];
      if ((data.name || '').trim().length < 2) errs.push('name');
      if ((data.phone || '').replace(/\D/g, '').length < 10) errs.push('phone');
      if (!/^\d{5}$/.test((data.zip || '').trim())) errs.push('zip');
      if (errs.length) {
        errs.forEach(function (n) { form[n].classList.add('is-invalid'); });
        form[errs[0]].focus();
        status.textContent = 'Please add your name, a 10-digit phone number, and a 5-digit ZIP code.';
        status.classList.add('is-error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            var fields = (res.body && res.body.fields) || {};
            Object.keys(fields).forEach(function (n) { if (form[n]) form[n].classList.add('is-invalid'); });
            throw new Error((res.body && res.body.error) || 'Something went wrong.');
          }
          var first = (data.name || '').trim().split(' ')[0];
          form.innerHTML =
            '<div class="form-success"><h3>Got it, ' + first.replace(/[<>&"]/g, '') + '!</h3>' +
            '<p>Your quote request is in. Sara will follow up personally, usually within one business day.' +
            (data.email ? ' We just sent a confirmation to your email.' : '') + '</p>' +
            '<p>Need an answer sooner? <a href="tel:+12076718802"><strong>Call or text (207) 671-8802</strong></a></p></div>';
        })
        .catch(function (err) {
          status.textContent = err.message + ' You can also call or text (207) 671-8802.';
          status.classList.add('is-error');
          btn.disabled = false;
          btn.textContent = 'Send my quote request';
        });
    });
  }
})();
