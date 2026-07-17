const express = require('express');
const router = express.Router();
const db = require('../config/db');
const userAuth = require('../middleware/userAuth');

router.use(userAuth); // every route below requires a logged-in user

// GET /v1/bookmarks — list the current user's bookmarks (optionally by study list)
router.get('/', async (req, res) => {
  const { study_list_id } = req.query;
  const params = [req.userId];
  let sql = 'SELECT * FROM bookmarks WHERE user_id = $1';
  if (study_list_id) {
    params.push(study_list_id);
    sql += ` AND study_list_id = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';

  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// POST /v1/bookmarks — { item_type, item_ref, note?, study_list_id? }
router.post('/', async (req, res) => {
  const { item_type, item_ref, note, study_list_id } = req.body;
  if (!item_type || !item_ref) {
    return res.status(400).json({ error: 'item_type and item_ref are required' });
  }
  if (!['ayah', 'hadith', 'dua'].includes(item_type)) {
    return res.status(400).json({ error: "item_type must be one of: 'ayah', 'hadith', 'dua'" });
  }

  try {
    const result = await db.query(
      `INSERT INTO bookmarks (user_id, study_list_id, item_type, item_ref, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, item_type, item_ref) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [req.userId, study_list_id || null, item_type, item_ref, note || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Bookmark creation error:', err);
    res.status(500).json({ error: 'Internal server error creating bookmark' });
  }
});

// DELETE /v1/bookmarks/:id
router.delete('/:id', async (req, res) => {
  const result = await db.query(
    'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  res.json({ deleted: true });
});

// GET /v1/bookmarks/lists — the current user's study lists
router.get('/lists', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM study_lists WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  res.json(rows);
});

// POST /v1/bookmarks/lists — { name }
router.post('/lists', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = await db.query(
    'INSERT INTO study_lists (user_id, name) VALUES ($1, $2) RETURNING *',
    [req.userId, name]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
