# Pine Point Metal — Website

Steel garages, shops, and red iron buildings · Scarborough, Maine
Built by Real Easy Sites.

## Stack
Node 20 + Express, SQLite (better-sqlite3) for quote requests, Nodemailer for email.

```
server.js          thin entry point
db/database.js     SQLite schema + lead queries
lib/auth.js        admin login (signed cookie)
lib/mailer.js      owner notification + customer auto-reply
routes/quote.js    POST /api/quote  (validation, honeypot, rate limit)
routes/admin.js    /admin dashboard + lead API + CSV export
public/            website (index.html, css, js, media, images)
```

## Run
```bash
cp .env.example .env     # fill in ADMIN_PASSWORD, SESSION_SECRET, SMTP_PASS
npm install
npm start                # http://localhost:3000   dashboard: /admin
```
Node **20.x** is required (better-sqlite3 has no prebuilt binaries for newer Node).

## Email (Yahoo)
Quote requests go to `NOTIFY_EMAIL`, and the customer gets an automatic "we got your request" email.
Yahoo needs an **app password**: Yahoo Account → Account Security → *Generate app password* → paste into `SMTP_PASS`.
If SMTP isn't set, leads still save to the dashboard.

## Hero video
Put the file at `public/media/hero.mp4` and a still frame at `public/media/hero-poster.jpg`.
Compress it first so the page loads fast on phones (target **under 6 MB**, 10–20 sec loop, no audio):
```bash
ffmpeg -i original.mov -t 20 -an -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 28 -preset slow -movflags +faststart public/media/hero.mp4
ffmpeg -i public/media/hero.mp4 -ss 00:00:02 -frames:v 1 -q:v 3 public/media/hero-poster.jpg
```
Until the video is added, the hero shows a sunset gradient.

## Photos
Edit `public/js/gallery.js`: add gallery photos and map each photo slot (product cards, red iron, cold-formed, Sara) to an image path. Keep images ~1600px wide, JPG, under 400 KB.

## Admin dashboard (`/admin`)
- Every quote request with a one-tap Call / Text / Email
- Status: New → Contacted → Quoted → Won / Lost
- Leads left in "New" over 24 hours are flagged red; tracks average first-response time
- Notes per lead, CSV export
