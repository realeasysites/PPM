const path = require('path');
const express = require('express');
const { listLeads, updateLead, deleteLead, STATUSES } = require('../db/database');
const { checkPassword, setSessionCookie, clearSessionCookie, isAuthed, requireAuth } = require('../lib/auth');

const router = express.Router();
const ADMIN_DIR = path.join(__dirname, '..', 'public', 'admin');

// Login attempts: 10 per IP per 15 minutes.
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 10;
}

router.get('/login', (req, res) => {
  if (isAuthed(req)) return res.redirect('/admin');
  res.sendFile(path.join(ADMIN_DIR, 'login.html'));
});

router.post('/login', (req, res) => {
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  if (!checkPassword(req.body && req.body.password)) return res.status(401).json({ error: 'Wrong password.' });
  setSessionCookie(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.use(requireAuth);

router.get('/', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'dashboard.html')));
router.get('/admin.js', (req, res) => res.sendFile(path.join(ADMIN_DIR, 'admin.js')));

router.get('/api/leads', (req, res) => {
  res.json({ leads: listLeads({ status: req.query.status }), statuses: STATUSES });
});

router.patch('/api/leads/:id', (req, res) => {
  const lead = updateLead(Number(req.params.id), req.body || {});
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ lead });
});

router.delete('/api/leads/:id', (req, res) => {
  if (!deleteLead(Number(req.params.id))) return res.status(404).json({ error: 'Lead not found' });
  res.json({ ok: true });
});

router.get('/api/leads.csv', (req, res) => {
  const leads = listLeads();
  const cols = ['id', 'created_at', 'status', 'name', 'phone', 'email', 'town', 'zip', 'building_type', 'width', 'length', 'height', 'use_case', 'doors', 'insulation', 'install', 'timeline', 'message', 'notes'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...leads.map((l) => cols.map((c) => q(l[c])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pine-point-metal-leads.csv"');
  res.send(csv);
});

module.exports = router;
