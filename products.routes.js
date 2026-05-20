import { Router } from 'express';
import { query } from '../../db/pool.js';
import { auth, allow } from '../../middleware/auth.js';

const router = Router();
router.use(auth());

router.get('/categories', async (_, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

router.get('/', async (_, res) => {
  const { rows } = await query(`
    SELECT p.*, c.name category_name
    FROM products p LEFT JOIN categories c ON c.id=p.category_id
    WHERE p.active=true ORDER BY p.name
  `);
  res.json(rows);
});

router.post('/', allow('admin','accountant'), async (req, res) => {
  const { category_id, name, sku, image_url, cost_price, selling_price, stock_qty } = req.body;
  const { rows } = await query(`
    INSERT INTO products(category_id,name,sku,image_url,cost_price,selling_price,stock_qty)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [category_id, name, sku, image_url, cost_price, selling_price, stock_qty || 0]);
  res.status(201).json(rows[0]);
});

router.put('/:id', allow('admin','accountant'), async (req, res) => {
  const { name, cost_price, selling_price, stock_qty, active } = req.body;
  const { rows } = await query(`
    UPDATE products SET name=COALESCE($2,name), cost_price=COALESCE($3,cost_price),
    selling_price=COALESCE($4,selling_price), stock_qty=COALESCE($5,stock_qty), active=COALESCE($6,active)
    WHERE id=$1 RETURNING *
  `, [req.params.id, name, cost_price, selling_price, stock_qty, active]);
  res.json(rows[0]);
});

export default router;
