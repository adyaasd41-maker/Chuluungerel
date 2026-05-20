import { Router } from 'express';
import { auth, allow } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';
import { answerFinanceQuestion } from './ai.service.js';

const router = Router();
router.use(auth());

async function metrics() {
  const today = await query(`
    SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) profit
    FROM transactions WHERE tx_date=CURRENT_DATE
  `);
  const month = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) revenue,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) expense
    FROM transactions
    WHERE date_trunc('month',tx_date)=date_trunc('month',CURRENT_DATE)
  `);
  const topExpense = await query(`
    SELECT category, SUM(amount) amount FROM transactions
    WHERE type='expense' AND date_trunc('month',tx_date)=date_trunc('month',CURRENT_DATE)
    GROUP BY category ORDER BY amount DESC LIMIT 1
  `);
  const topProduct = await query(`
    SELECT product_name, SUM((unit_price-cost_price)*qty) profit FROM order_items
    GROUP BY product_name ORDER BY profit DESC LIMIT 1
  `);
  const vat = await query(`
    SELECT COALESCE(SUM(vat_amount),0) vat FROM orders
    WHERE date_trunc('month',created_at)=date_trunc('month',CURRENT_DATE)
  `);
  return {
    todayProfit: Number(today.rows[0].profit || 0),
    monthRevenue: Number(month.rows[0].revenue || 0),
    monthExpense: Number(month.rows[0].expense || 0),
    monthProfit: Number(month.rows[0].revenue || 0) - Number(month.rows[0].expense || 0),
    topExpenseCategory: topExpense.rows[0]?.category,
    topExpenseAmount: Number(topExpense.rows[0]?.amount || 0),
    topProduct: topProduct.rows[0]?.product_name,
    monthVat: Number(vat.rows[0].vat || 0)
  };
}

router.post('/chat', async (req, res) => {
  const m = await metrics();
  res.json({ answer: answerFinanceQuestion(req.body.question || '', m), metrics: m });
});

router.get('/suggestions', allow('admin','accountant'), async (_, res) => {
  const { rows } = await query('SELECT * FROM ai_suggestions ORDER BY created_at DESC LIMIT 100');
  res.json(rows);
});

router.post('/suggestions/:id/approve', allow('admin','accountant'), async (req, res) => {
  const { rows } = await query('UPDATE ai_suggestions SET status=$2 WHERE id=$1 RETURNING *', [req.params.id, 'approved']);
  res.json(rows[0]);
});

export default router;
