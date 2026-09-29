(function () {
  'use strict';

  var LABELS = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', won: 'Won', lost: 'Lost' };
  var state = { leads: [], statuses: Object.keys(LABELS), filter: 'all' };

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  // SQLite datetime('now') is UTC without a zone marker
  var toDate = function (s) { return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z'); };
  var hoursSince = function (s) { return (Date.now() - toDate(s).getTime()) / 36e5; };
  var ago = function (s) {
    var h = hoursSince(s);
    if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min ago';
    if (h < 48) return Math.round(h) + ' hr ago';
    return Math.round(h / 24) + ' days ago';
  };
  var size = function (l) { var p = [l.width, l.length, l.height].filter(Boolean); return p.length ? p.join('×') + ' ft' : 'Size TBD'; };

  function api(path, opts) {
    return fetch('/admin/api' + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}))
      .then(function (r) {
        if (r.status === 401) { location.href = '/admin/login'; throw new Error('signed out'); }
        return r.json();
      });
  }

  function load() {
    api('/leads').then(function (d) { state.leads = d.leads; state.statuses = d.statuses; render(); });
  }

  function render() {
    var L = state.leads;
    var count = function (s) { return L.filter(function (l) { return l.status === s; }).length; };
    var overdue = L.filter(function (l) { return l.status === 'new' && hoursSince(l.created_at) > 24; });
    var responded = L.filter(function (l) { return l.contacted_at; });
    var avgHrs = responded.length
      ? responded.reduce(function (a, l) { return a + (toDate(l.contacted_at) - toDate(l.created_at)) / 36e5; }, 0) / responded.length
      : null;

    document.getElementById('kpis').innerHTML = [
      ['New', count('new')],
      ['Quoted', count('quoted')],
      ['Won', count('won')],
      ['Avg. first response', avgHrs == null ? '—' : (avgHrs < 1 ? '<1 hr' : Math.round(avgHrs) + ' hr')],
    ].map(function (k) { return '<div class="kpi"><strong>' + k[1] + '</strong><span>' + k[0] + '</span></div>'; }).join('');

    var alert = document.getElementById('overdue');
    alert.hidden = !overdue.length;
    alert.textContent = overdue.length
      ? overdue.length + (overdue.length === 1 ? ' lead has' : ' leads have') + ' waited more than 24 hours for a reply. Call these first.'
      : '';

    var filters = ['all'].concat(state.statuses);
    document.getElementById('filters').innerHTML = filters.map(function (f) {
      var n = f === 'all' ? L.length : count(f);
      return '<button data-filter="' + f + '" class="' + (state.filter === f ? 'is-active' : '') + '">' + (f === 'all' ? 'All' : LABELS[f]) + ' <b>' + n + '</b></button>';
    }).join('');

    var shown = state.filter === 'all' ? L : L.filter(function (l) { return l.status === state.filter; });
    var el = document.getElementById('leads');
    if (!shown.length) { el.innerHTML = '<p class="empty">No quote requests here yet.</p>'; return; }

    el.innerHTML = shown.map(function (l) {
      var late = l.status === 'new' && hoursSince(l.created_at) > 24;
      var tel = String(l.phone).replace(/[^\d+]/g, '');
      var details = [
        ['Type', l.building_type], ['Use', l.use_case], ['Install', l.install], ['Insulation', l.insulation],
        ['Doors/windows', l.doors], ['Timeline', l.timeline], ['Location', [l.town, l.zip].filter(Boolean).join(' ')]
      ].filter(function (d) { return d[1]; });
      return '<article class="lead' + (late ? ' lead--late' : '') + '" data-id="' + l.id + '">' +
        '<div class="lead__top">' +
          '<div><h2>' + esc(l.name) + ' <span class="lead__size">' + esc(size(l)) + '</span></h2>' +
          '<p class="lead__meta">#' + l.id + ' · ' + ago(l.created_at) + (late ? ' · <b>overdue</b>' : '') + '</p></div>' +
          '<select class="lead__status status--' + l.status + '" aria-label="Status">' +
            state.statuses.map(function (s) { return '<option value="' + s + '"' + (s === l.status ? ' selected' : '') + '>' + LABELS[s] + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="lead__contact">' +
          '<a class="btn" href="tel:' + esc(tel) + '">Call ' + esc(l.phone) + '</a>' +
          '<a class="btn btn--ghost" href="sms:' + esc(tel) + '">Text</a>' +
          (l.email ? '<a class="btn btn--ghost" href="mailto:' + esc(l.email) + '?subject=' + encodeURIComponent('Your steel building quote — Pine Point Metal') + '">Email</a>' : '') +
        '</div>' +
        (details.length ? '<dl class="lead__details">' + details.map(function (d) { return '<div><dt>' + d[0] + '</dt><dd>' + esc(d[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        (l.message ? '<p class="lead__msg">“' + esc(l.message) + '”</p>' : '') +
        '<label class="lead__notes">Notes<textarea rows="2" placeholder="Called 9/28, sending quote Friday…">' + esc(l.notes) + '</textarea></label>' +
        '<div class="lead__foot"><span class="saved" aria-live="polite"></span><button class="link-danger" data-delete>Delete</button></div>' +
      '</article>';
    }).join('');
  }

  function save(card, patch) {
    var id = card.getAttribute('data-id');
    api('/leads/' + id, { method: 'PATCH', body: JSON.stringify(patch) }).then(function (d) {
      var i = state.leads.findIndex(function (l) { return String(l.id) === id; });
      if (i > -1) state.leads[i] = d.lead;
      if (patch.status) render();
      else { var s = card.querySelector('.saved'); s.textContent = 'Saved'; setTimeout(function () { s.textContent = ''; }, 1500); }
    });
  }

  document.getElementById('filters').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filter]');
    if (b) { state.filter = b.getAttribute('data-filter'); render(); }
  });

  var leadsEl = document.getElementById('leads');
  leadsEl.addEventListener('change', function (e) {
    var card = e.target.closest('.lead');
    if (card && e.target.classList.contains('lead__status')) save(card, { status: e.target.value });
  });
  leadsEl.addEventListener('focusout', function (e) {
    var card = e.target.closest('.lead');
    if (card && e.target.tagName === 'TEXTAREA') save(card, { notes: e.target.value });
  });
  leadsEl.addEventListener('click', function (e) {
    if (!e.target.hasAttribute('data-delete')) return;
    var card = e.target.closest('.lead');
    if (!confirm('Delete this lead permanently?')) return;
    api('/leads/' + card.getAttribute('data-id'), { method: 'DELETE' }).then(load);
  });

  document.getElementById('logout').addEventListener('click', function () {
    fetch('/admin/logout', { method: 'POST' }).then(function () { location.href = '/admin/login'; });
  });

  load();
  setInterval(load, 60000);
})();
