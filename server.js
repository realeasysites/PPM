require('dotenv').config();

const path = require('path');
const express = require('express');

const { initDb } = require('./db/database');
const quoteRoutes = require('./routes/quote');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use('/api/quote', quoteRoutes);
app.use('/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '7d' }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => console.log(`Pine Point Metal running on http://localhost:${PORT}`));
