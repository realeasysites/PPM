const nodemailer = require('nodemailer');

const BUSINESS = {
  name: 'Pine Point Metal',
  phone: '(207) 671-8802',
  phoneHref: 'tel:+12076718802',
  email: 'pinepointmetal@yahoo.com',
};

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sizeOf(lead) {
  const parts = [lead.width, lead.length, lead.height].filter(Boolean);
  return parts.length ? `${parts.join(' x ')} ft` : 'Not sure yet';
}

function ownerEmail(lead) {
  const rows = [
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Town / ZIP', [lead.town, lead.zip].filter(Boolean).join(' ')],
    ['Building type', lead.building_type],
    ['Size (W x L x H)', sizeOf(lead)],
    ['Use', lead.use_case],
    ['Doors & windows', lead.doors],
    ['Insulation', lead.insulation],
    ['Install needed', lead.install],
    ['Timeline', lead.timeline],
    ['Notes', lead.message],
  ].filter(([, v]) => v);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="margin:0 0 4px">New quote request #${lead.id}</h2>
      <p style="margin:0 0 16px;color:#b4461b"><strong>Call or text within 24 hours</strong> — fast replies win steel building jobs.</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%">
        ${rows.map(([k, v]) => `<tr><td style="border-bottom:1px solid #eee;color:#666;width:40%">${esc(k)}</td><td style="border-bottom:1px solid #eee"><strong>${esc(v)}</strong></td></tr>`).join('')}
      </table>
      <p style="margin-top:16px"><a href="tel:${esc(String(lead.phone).replace(/[^\d+]/g, ''))}">Tap to call ${esc(lead.name)}</a></p>
    </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { subject: `New quote: ${sizeOf(lead)} ${lead.building_type || ''} — ${lead.name} (${lead.zip})`.trim(), html, text };
}

function customerEmail(lead) {
  const first = String(lead.name).split(' ')[0];
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#1c1f22">
      <h2 style="margin:0 0 12px">Thanks, ${esc(first)} — we got your request.</h2>
      <p>We received your quote request for a <strong>${esc(sizeOf(lead))}</strong> ${esc(lead.building_type || 'steel building')} near <strong>${esc(lead.zip)}</strong>.</p>
      <p>Sara will reach out personally, usually within one business day, with pricing and next steps. Freight is priced by distance, so your ZIP code helps us get you an accurate number.</p>
      <p>Need an answer sooner? Call or text <a href="${BUSINESS.phoneHref}">${BUSINESS.phone}</a>.</p>
      <p style="margin-top:24px">— ${BUSINESS.name}<br><span style="color:#666">Steel garages, shops &amp; buildings · Scarborough, Maine</span></p>
    </div>`;
  const text = `Thanks, ${first} — we got your request for a ${sizeOf(lead)} ${lead.building_type || 'steel building'} near ${lead.zip}.\n\nSara will reach out personally, usually within one business day. Need an answer sooner? Call or text ${BUSINESS.phone}.\n\n— ${BUSINESS.name}`;
  return { subject: `We received your steel building quote request`, html, text };
}

async function sendLeadEmails(lead) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — lead saved to the dashboard but no email sent.');
    return;
  }
  const from = process.env.MAIL_FROM || `${BUSINESS.name} <${process.env.SMTP_USER}>`;
  const to = process.env.NOTIFY_EMAIL || BUSINESS.email;
  const jobs = [t.sendMail({ from, to, replyTo: lead.email || undefined, ...ownerEmail(lead) })];
  if (lead.email) jobs.push(t.sendMail({ from, to: lead.email, replyTo: to, ...customerEmail(lead) }));
  const results = await Promise.allSettled(jobs);
  results.filter((r) => r.status === 'rejected').forEach((r) => console.error('[mailer]', r.reason?.message || r.reason));
}

module.exports = { sendLeadEmails, BUSINESS };
