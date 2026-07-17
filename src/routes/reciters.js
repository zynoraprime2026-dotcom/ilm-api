const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /v1/reciters — list available reciters for audio recitation
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  const { rows } = await db.query('SELECT slug, name FROM reciters ORDER BY name');
  res.json(rows);
});

module.exports = router;
