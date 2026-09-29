const crypto = require('crypto');

const COOKIE = 'ppm_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    console.warn('[auth] SESSION_SECRET is missing or short — set a long random value in .env');
  }
  return s || 'dev-only-insecure-secret';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

function createToken() {
  const expires = String(Date.now() + MAX_AGE_MS);
  return `${expires}.${sign(expires)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [expires, sig] = token.split('.');
  if (!expires || !sig) return false;
  const expected = sign(expires);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(expires) > Date.now();
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

function setSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(createToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_MS / 1000}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

function isAuthed(req) {
  return verifyToken(parseCookies(req.headers.cookie)[COOKIE]);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not signed in' });
  return res.redirect('/admin/login');
}

module.exports = { checkPassword, setSessionCookie, clearSessionCookie, isAuthed, requireAuth };
