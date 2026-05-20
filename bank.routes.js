import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import { env } from '../../config/env.js';
import { auth, allow } from '../../middleware/auth.js';
import { query, tx } from '../../db/pool.js';
import { classifyBankRow, detectAnomaly } from '../ai/ai.service.js';

const router = Router();
router.use(auth());

fs.mkdirSync(env.uploadDir, { recursive: true });
const upload = multer({ dest: env.uploadDir });

function normalizeRow(row) {
  const obj = {};
  Object.keys(row).forEach(k => obj[k.trim().toLowerCase()] = row[k]);
  return {
    date: obj.date || obj.tx_date || obj['огноо'],
    description: obj.description || obj.desc || obj['гүйлгээний утга'] || '',
    debit: Number(obj.debit || obj['зарлага'] || 0),
    credit: Number(obj.credit || obj['орлого'] || 0),
    balance: Number(obj.balance || obj['үлдэгдэл'] || 0)
  };
}

async function parseFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.csv') {
    const raw = fs.readFileSync(file.path, 'utf-8');
    return parse(raw, { columns: true, skip_empty_lines: true }).map(normalizeRow);
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const wb = xlsx.readFile(file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet).map(normalizeRow);
  }
  throw new Error('Only CSV/Excel parser is enabled in this demo. PDF upload can be stored, OCR can be added later.');
}

router.post('/upload', allow('admin','accountant'), upload.single('statement'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File required' });

  const rows = await parseFile(req.file);
  const result = await tx(async client => {
    const fileResult = await client.query(`
      INSERT INTO bank_statement_files(original_name,stored_name,mime_type,size_bytes,uploaded_by,parsed_count)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *
    `, [req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.id, rows.length]);

    const file = fileResult.rows[0];
    const imported = [];

    for (const r of rows) {
      const ai = classifyBankRow(r);
      const dup = await client.query(`
        SELECT id FROM bank_transactions
        WHERE tx_date=$1 AND description=$2 AND amount=$3 AND soft_deleted_at IS NULL LIMIT 1
      `, [r.date, r.description, ai.amount]);

      const saved = await client.query(`
        INSERT INTO bank_transactions(statement_file_id,tx_date,description,debit,credit,balance,amount,ai_type,ai_category,ai_confidence,duplicate_of,import_status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'preview') RETURNING *
      `, [file.id, r.date, r.description, r.debit, r.credit, r.balance, ai.amount, ai.type, ai.category, ai.confidence, dup.rows[0]?.id || null]);

      const anomaly = detectAnomaly(saved.rows[0]);
      if (anomaly) {
        await client.query(`
          INSERT INTO ai_suggestions(suggestion_type,title,detail,confidence,source_id)
          VALUES('anomaly',$1,$2,$3,$4)
        `, [anomaly.title, anomaly.detail, anomaly.confidence, saved.rows[0].id]);
      }
      imported.push(saved.rows[0]);
    }
    return { file, preview: imported };
  });

  res.status(201).json(result);
});

router.get('/files', allow('admin','accountant'), async (_, res) => {
  const { rows } = await query('SELECT * FROM bank_statement_files ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/transactions', allow('admin','accountant'), async (_, res) => {
  const { rows } = await query('SELECT * FROM bank_transactions WHERE soft_deleted_at IS NULL ORDER BY tx_date DESC, created_at DESC LIMIT 300');
  res.json(rows);
});

router.post('/confirm-import/:fileId', allow('admin','accountant'), async (req, res) => {
  const { rows } = await query(`
    UPDATE bank_transactions SET import_status='confirmed'
    WHERE statement_file_id=$1 AND soft_deleted_at IS NULL RETURNING *
  `, [req.params.fileId]);
  res.json({ imported: rows.length, rows });
});

router.delete('/files/:id/soft', allow('admin','accountant'), async (req, res) => {
  await query('UPDATE bank_statement_files SET soft_deleted_at=now(), status=$2 WHERE id=$1', [req.params.id, 'deleted']);
  await query('UPDATE bank_transactions SET soft_deleted_at=now() WHERE statement_file_id=$1', [req.params.id]);
  res.json({ ok: true, mode: 'soft_delete' });
});

router.delete('/files/:id/permanent', allow('admin'), async (req, res) => {
  const file = await query('SELECT * FROM bank_statement_files WHERE id=$1', [req.params.id]);
  if (file.rows[0]) {
    const full = path.join(env.uploadDir, file.rows[0].stored_name);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  await query('DELETE FROM bank_transactions WHERE statement_file_id=$1', [req.params.id]);
  await query('DELETE FROM bank_statement_files WHERE id=$1', [req.params.id]);
  res.json({ ok: true, mode: 'permanent_delete' });
});

export default router;
