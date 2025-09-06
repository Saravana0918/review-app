// server.js - paste-ready
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const PUBLIC_URL = process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/, '') : null;

const app = express();

// allow CORS (during development allow all origins). For production, restrict to your shop domain.
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ensure uploads dir exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer setup (5MB limit)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// SQLite DB init
const DB_PATH = path.join(__dirname, 'reviews.db');
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    city TEXT,
    rating INTEGER,
    text TEXT,
    image TEXT,
    approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// serve uploads and public
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/', express.static(path.join(__dirname, 'public')));

// helper: build absolute URL for an uploaded file
function makeAbsoluteUrl(req, relPath) {
  // prefer explicit PUBLIC_URL if provided
  if (PUBLIC_URL) {
    return PUBLIC_URL + '/' + relPath.replace(/^\//, '');
  }
  // fallback: build from request (works behind proxies that set x-forwarded-proto)
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/${relPath.replace(/^\//, '')}`;
}

/**
 * POST /api/submit-review
 * Accepts multipart/form-data with fields: name, city, rating, text
 * Optional file field: image
 */
app.post('/api/submit-review', upload.single('image'), (req, res) => {
  try {
    const { name, city, rating, text } = req.body;
    const file = req.file;

    if (!name || !text) {
      return res.status(400).json({ ok: false, message: 'Name and review text required' });
    }

    // build absolute image URL (or null)
    let imageUrl = null;
    if (file && file.filename) {
      const rel = `uploads/${file.filename}`;
      imageUrl = makeAbsoluteUrl(req, rel);
    }

    const stmt = db.prepare('INSERT INTO reviews (name, city, rating, text, image, approved) VALUES (?,?,?,?,?,1)');
    stmt.run(name, city || '', rating ? parseInt(rating) : null, text, imageUrl, function (err) {
      if (err) {
        console.error('DB insert error', err);
        return res.status(500).json({ ok: false, message: 'DB error' });
      }
      const created = {
        id: this.lastID,
        name,
        city: city || '',
        rating: rating ? parseInt(rating) : null,
        text,
        image: imageUrl,
        created_at: new Date().toISOString()
      };
      return res.json({ ok: true, message: 'Thank you! Your review is published.', review: created });
    });

  } catch (e) {
    console.error('submit-review error', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/reviews
 * Alias endpoint for widgets that POST to /api/reviews
 */
app.post('/api/reviews', upload.single('image'), (req, res) => {
  try {
    const { name, city, rating, text } = req.body;
    const file = req.file;

    if (!name || !text) {
      return res.status(400).json({ ok: false, message: 'Name and review text required' });
    }

    let imageUrl = null;
    if (file && file.filename) {
      const rel = `uploads/${file.filename}`;
      imageUrl = makeAbsoluteUrl(req, rel);
    }

    const stmt = db.prepare('INSERT INTO reviews (name, city, rating, text, image, approved) VALUES (?,?,?,?,?,1)');
    stmt.run(name, city || '', rating ? parseInt(rating) : null, text, imageUrl, function (err) {
      if (err) {
        console.error('DB insert error', err);
        return res.status(500).json({ ok: false, message: 'DB error' });
      }
      const created = {
        id: this.lastID,
        name,
        city: city || '',
        rating: rating ? parseInt(rating) : null,
        text,
        image: imageUrl,
        created_at: new Date().toISOString()
      };
      return res.json({ ok: true, message: 'Thank you! Your review is published.', review: created });
    });

  } catch (e) {
    console.error('POST /api/reviews error', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * GET /api/reviews
 * Return public (approved) reviews with absolute image URLs
 */
app.get('/api/reviews', (req, res) => {
  db.all('SELECT id, name, city, rating, text, image, created_at FROM reviews WHERE approved=1 ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('GET /api/reviews DB error', err);
      return res.status(500).json({ ok: false, message: 'DB error' });
    }
    rows = rows.map(r => {
      if (r.image) {
        // if already absolute, keep it; otherwise make absolute
        if (!/^https?:\/\//i.test(r.image)) {
          r.image = makeAbsoluteUrl(req, r.image.replace(/^\//, ''));
        }
      }
      return r;
    });
    res.json({ ok: true, reviews: rows });
  });
});

// ---------------- Admin routes ----------------
function adminAuth(req, res, next) {
  const pw = req.headers['x-admin-password'] || req.query.admin_password || req.body.admin_password;
  if (pw && pw === ADMIN_PASSWORD) return next();
  res.status(401).json({ ok: false, message: 'Unauthorized' });
}

app.get('/api/admin/reviews', adminAuth, (req, res) => {
  db.all('SELECT id, name, city, rating, text, image, approved, created_at FROM reviews ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('admin list DB error', err);
      return res.status(500).json({ ok: false, message: 'DB error' });
    }
    rows = rows.map(r => {
      if (r.image && !/^https?:\/\//i.test(r.image)) {
        r.image = makeAbsoluteUrl(req, r.image.replace(/^\//, ''));
      }
      return r;
    });
    res.json({ ok: true, reviews: rows });
  });
});

app.post('/api/admin/approve/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  db.run('UPDATE reviews SET approved=1 WHERE id=?', [id], function (err) {
    if (err) {
      console.error('admin approve DB error', err);
      return res.status(500).json({ ok: false, message: 'DB error' });
    }
    res.json({ ok: true, message: 'Approved' });
  });
});

// optional admin delete
app.delete('/api/admin/review/:id', adminAuth, (req, res) => {
  const id = req.params.id;
  // optional: delete associated file if present
  db.get('SELECT image FROM reviews WHERE id=?', [id], (err, row) => {
    if (err) return res.status(500).json({ ok: false, message: 'DB error' });
    if (row && row.image && !/^https?:\/\//i.test(row.image)) {
      const rel = row.image.replace(/^\//, '');
      const filePath = path.join(__dirname, rel);
      fs.unlink(filePath, _ => {
        // ignore unlink errors
        db.run('DELETE FROM reviews WHERE id=?', [id], function (err2) {
          if (err2) return res.status(500).json({ ok: false, message: 'DB error' });
          res.json({ ok: true, message: 'Deleted' });
        });
      });
    } else {
      db.run('DELETE FROM reviews WHERE id=?', [id], function (err2) {
        if (err2) return res.status(500).json({ ok: false, message: 'DB error' });
        res.json({ ok: true, message: 'Deleted' });
      });
    }
  });
});

// start server
app.listen(PORT, () => {
  console.log('Server listening on', PORT);
  if (PUBLIC_URL) console.log('PUBLIC_URL =', PUBLIC_URL);
});
