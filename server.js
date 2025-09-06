require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// SQLite DB
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

// Serve uploads and public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', express.static(path.join(__dirname, 'public')));

// Submit review endpoint
app.post('/api/submit-review', upload.single('image'), (req, res) => {
  try {
    const { name, city, rating, text } = req.body;
    const file = req.file;
    if(!name || !text) return res.status(400).json({ ok:false, message: 'Name and review text required' });
    const imagePath = file ? ('/uploads/' + file.filename) : null;
    const stmt = db.prepare('INSERT INTO reviews (name, city, rating, text, image, approved) VALUES (?,?,?,?,?,1)');
    stmt.run(name, city || '', rating ? parseInt(rating) : null, text, imagePath, function(err){
      if(err) return res.status(500).json({ ok:false, message: 'DB error' });
      res.json({ ok:true, message: 'Thank you! Your review is published.' });
    });

  } catch(e) {
    console.error(e);
    res.status(500).json({ ok:false, message: 'Server error' });
  }
});

// Public approved reviews
app.get('/api/reviews', (req, res) => {
  db.all('SELECT id, name, city, rating, text, image, created_at FROM reviews WHERE approved=1 ORDER BY created_at DESC', (err, rows)=>{
    if(err) return res.status(500).json({ ok:false, message: 'DB error' });
    // convert image to full URL
    const host = req.protocol + '://' + req.get('host');
    rows = rows.map(r => {
      if(r.image) r.image = host + r.image;
      return r;
    });
    res.json({ ok:true, reviews: rows });
  });
});

// Simple admin auth middleware
function adminAuth(req,res,next){
  const pw = req.headers['x-admin-password'] || req.query.admin_password || req.body.admin_password;
  if(pw && pw === ADMIN_PASSWORD) return next();
  res.status(401).json({ ok:false, message: 'Unauthorized' });
}

// Admin: list all reviews
app.get('/api/admin/reviews', adminAuth, (req,res)=>{
  db.all('SELECT id, name, city, rating, text, image, approved, created_at FROM reviews ORDER BY created_at DESC', (err, rows)=>{
    if(err) return res.status(500).json({ ok:false, message:'DB error' });
    const host = req.protocol + '://' + req.get('host');
    rows = rows.map(r => { if(r.image) r.image = host + r.image; return r; });
    res.json({ ok:true, reviews: rows });
  });
});

// Admin: approve
app.post('/api/admin/approve/:id', adminAuth, (req,res)=>{
  const id = req.params.id;
  db.run('UPDATE reviews SET approved=1 WHERE id=?', [id], function(err){
    if(err) return res.status(500).json({ ok:false, message:'DB error' });
    res.json({ ok:true, message: 'Approved' });
  });
});

// Admin UI static page is in public/admin.html which will call admin APIs

app.listen(PORT, ()=> console.log('Server listening on', PORT));
