const express = require('express');
const { createLead } = require('../db/database');
const { sendLeadEmails } = require('../lib/mailer');

const router = express.Router();

// Simple in-memory rate limit: 5 submissions per IP per 15 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

router.post('/', async (req, res) => {
  const b = req.body || {};

  // Honeypot: real people never fill this hidden field.
  if (clean(b.company_website)) return res.json({ ok: true });

  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many requests. Please call or text (207) 671-8802.' });
  }

  const lead = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    email: clean(b.email, 160),
    zip: clean(b.zip, 10),
    town: clean(b.town, 80),
    building_type: clean(b.building_type, 60),
    width: clean(b.width, 10),
    length: clean(b.length, 10),
    height: clean(b.height, 10),
    use_case: clean(b.use_case, 80),
    doors: clean(b.doors, 300),
    insulation: clean(b.insulation, 60),
    install: clean(b.install, 60),
    timeline: clean(b.timeline, 60),
    message: clean(b.message, 3000),
    source_page: clean(b.source_page, 200),
    ip: req.ip,
  };

  const errors = {};
  if (lead.name.length < 2) errors.name = 'Please enter your name.';
  if (lead.phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a 10-digit phone number.';
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.email = 'That email looks off.';
  if (!/^\d{5}$/.test(lead.zip)) errors.zip = 'Please enter a 5-digit ZIP code — freight is priced by distance.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  try {
    const saved = createLead(lead);
    sendLeadEmails(saved).catch((e) => console.error('[quote] email failed', e));
    return res.json({ ok: true, id: saved.id });
  } catch (e) {
    console.error('[quote] save failed', e);
    return res.status(500).json({ error: 'Something went wrong. Please call or text (207) 671-8802.' });
  }
});

module.exports = router;
