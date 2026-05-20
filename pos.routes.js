import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { query, tx } from '../../db/pool.js';

const router = Router();
router.use(auth());

router.get('/tables', async (_, res) => {
  const { rows } = await query('SELECT * FROM cafe_tables WHERE active=true ORDER BY name');
  res.json(rows);
});

router.post('/orders', async (req, res) => {
  const { order_type='takeaway', table_id=null, items=[], payment_method='cash' } = req.body;
  if (!items.length) return res.status(400).json({ message: 'Cart is empty' });

  const result = await tx(async client => {
    const productIds = items.map(i => i.product_id);
    const { rows: products } = await client.query('SELECT * FROM products WHERE id = ANY($1::uuid[])', [productIds]);
    const map = new Map(products.map(p => [p.id, p]));

    let subtotal = 0, vat = 0;
    const enriched = items.map(i => {
      const p = map.get(i.product_id);
      if (!p) throw new Error('Product not found');
      const qty = Number(i.qty);
      const line = qty * Number(p.selling_price);
      subtotal += line / 1.1;
      vat += line - (line / 1.1);
      return { product: p, qty, line };
    });
    const total = subtotal + vat;
    const orderNo = 'ORD-' + Date.now();

    const receipt = {
      type: 'SIMULATED_EBARIMT',
      lottery: Math.random().toString(36).slice(2,10).toUpperCase(),
      merchantTin: '0000000',
      orderNo,
      subtotal: Math.round(subtotal),
      vat: Math.round(vat),
      total: Math.round(total),
      note: 'Demo only. Real eBarimt integration required.'
    };

    const { rows: orderRows } = await client.query(`
      INSERT INTO orders(order_no,order_type,table_id,cashier_id,subtotal,vat_amount,total,receipt_json)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [orderNo, order_type, table_id, req.user.id, subtotal, vat, total, receipt]);
    const order = orderRows[0];

    for (const e of enriched) {
      await client.query(`
        INSERT INTO order_items(order_id,product_id,product_name,qty,unit_price,cost_price,line_total)
        VALUES($1,$2,$3,$4,$5,$6,$7)
      `, [order.id, e.product.id, e.product.name, e.qty, e.product.selling_price, e.product.cost_price, e.line]);
      if (e.product.track_inventory) {
        await client.query('UPDATE products SET stock_qty=stock_qty-$1 WHERE id=$2', [e.qty, e.product.id]);
        await client.query('INSERT INTO inventory_movements(product_id,movement_type,qty,note,created_by) VALUES($1,$2,$3,$4,$5)', [e.product.id,'sale',e.qty,orderNo,req.user.id]);
      }
    }

    await client.query('INSERT INTO payments(order_id,method,amount) VALUES($1,$2,$3)', [order.id, payment_method, total]);
    await client.query('INSERT INTO transactions(type,category,amount,description,tx_date,order_id,created_by) VALUES($1,$2,$3,$4,CURRENT_DATE,$5,$6)',
      ['income','Sales income',total,`Auto from ${orderNo}`,order.id,req.user.id]);

    const { rows: je } = await client.query('INSERT INTO journal_entries(description,source_type,source_id) VALUES($1,$2,$3) RETURNING *',
      [`Sales journal ${orderNo}`,'order',order.id]);
    await client.query(`
      INSERT INTO journal_lines(journal_entry_id,account_code,account_name,debit,credit) VALUES
      ($1,'1000','Cash/Bank',$2,0),
      ($1,'4000','Sales Revenue',0,$3),
      ($1,'2200','VAT Payable',0,$4)
    `, [je[0].id,total,subtotal,vat]);

    return { ...order, receipt_json: receipt };
  });

  res.status(201).json(result);
});

router.get('/daily-close', async (req, res) => {
  const day = req.query.date || new Date().toISOString().slice(0,10);
  const { rows } = await query(`
    SELECT COUNT(*) orders, COALESCE(SUM(total),0) total_sales, COALESCE(SUM(vat_amount),0) vat,
    COALESCE(SUM(subtotal),0) net_sales
    FROM orders WHERE created_at::date=$1
  `, [day]);
  const pay = await query(`
    SELECT method, COALESCE(SUM(amount),0) amount FROM payments
    WHERE created_at::date=$1 GROUP BY method
  `, [day]);
  res.json({ date: day, summary: rows[0], payments: pay.rows });
});

export default router;
