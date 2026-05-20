import { Router } from 'express';
import ExcelJS from 'exceljs';
import { auth } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';

const router = Router();
router.use(auth());

router.get('/dashboard', async (_, res) => {
  const daily = await query("SELECT COALESCE(SUM(total),0) sales FROM orders WHERE created_at::date=CURRENT_DATE");
  const monthly = await query("SELECT COALESCE(SUM(total),0) revenue FROM orders WHERE date_trunc('month',created_at)=date_trunc('month',CURRENT_DATE)");
  const expenses = await query("SELECT category, SUM(amount) amount FROM transactions WHERE type='expense' GROUP BY category ORDER BY amount DESC LIMIT 8");
  const top = await query("SELECT product_name name, SUM(qty) qty, SUM(line_total) revenue FROM order_items GROUP BY product_name ORDER BY qty DESC LIMIT 8");
  const cashflow = await query(`
    SELECT tx_date date, SUM(CASE WHEN type='income' THEN amount ELSE -amount END) net
    FROM transactions GROUP BY tx_date ORDER BY tx_date DESC LIMIT 30
  `);
  res.json({ dailySales: daily.rows[0].sales, monthlyRevenue: monthly.rows[0].revenue, expenses: expenses.rows, topProducts: top.rows, cashflow: cashflow.rows.reverse() });
});

router.get('/profit-loss', async (req, res) => {
  const from = req.query.from || new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10);
  const to = req.query.to || new Date().toISOString().slice(0,10);
  const { rows } = await query(`
    SELECT type, category, SUM(amount) amount FROM transactions
    WHERE tx_date BETWEEN $1 AND $2 GROUP BY type, category ORDER BY type, category
  `, [from, to]);
  const income = rows.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount),0);
  const expense = rows.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount),0);
  res.json({ from, to, income, expense, profit: income-expense, rows });
});

router.get('/vat', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const { rows } = await query(`
    SELECT COALESCE(SUM(subtotal),0) taxable_sales, COALESCE(SUM(vat_amount),0) output_vat, COALESCE(SUM(total),0) gross_sales
    FROM orders WHERE to_char(created_at,'YYYY-MM')=$1
  `, [month]);
  res.json({ month, ...rows[0], note: 'НӨАТ 10% simulation only.' });
});

router.get('/export/:type', async (req, res) => {
  const type = req.params.type;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(type);
  ws.columns = [
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Category', key: 'category', width: 24 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Amount', key: 'amount', width: 16 }
  ];
  const { rows } = await query('SELECT tx_date date,type,category,description,amount FROM transactions ORDER BY tx_date DESC LIMIT 1000');
  rows.forEach(r => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename="${type}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

export default router;
