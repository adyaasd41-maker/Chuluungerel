export function classifyBankRow(row) {
  const text = String(row.description || '').toLowerCase();
  const debit = Number(row.debit || 0);
  const credit = Number(row.credit || 0);
  const amount = credit > 0 ? credit : -Math.abs(debit);

  let type = credit > 0 ? 'income' : 'expense';
  let category = 'Other expenses';
  let confidence = 0.72;

  if (text.includes('qpay') || text.includes('qr') || text.includes('pos') || text.includes('sales')) {
    type = 'income'; category = 'Sales income'; confidence = 0.94;
  } else if (text.includes('rent')) {
    type = 'expense'; category = 'Rent'; confidence = 0.93;
  } else if (text.includes('salary') || text.includes('payroll')) {
    type = 'expense'; category = 'Salary'; confidence = 0.91;
  } else if (text.includes('supplier') || text.includes('beans') || text.includes('inventory')) {
    type = 'expense'; category = 'Inventory purchase'; confidence = 0.90;
  } else if (text.includes('utility') || text.includes('electric') || text.includes('water')) {
    type = 'expense'; category = 'Utilities'; confidence = 0.89;
  } else if (text.includes('facebook') || text.includes('marketing') || text.includes('ads')) {
    type = 'expense'; category = 'Marketing'; confidence = 0.88;
  } else if (text.includes('fee') || text.includes('charge')) {
    type = 'expense'; category = 'Bank fees'; confidence = 0.87;
  } else if (text.includes('tax') || text.includes('vat') || text.includes('ноат')) {
    type = 'expense'; category = 'Tax / НӨАТ'; confidence = 0.86;
  }

  return { type, category, confidence, amount };
}

export function detectAnomaly(tx, monthlyAverageExpense = 300000) {
  const amount = Math.abs(Number(tx.amount || 0));
  if (tx.ai_type === 'expense' && amount > monthlyAverageExpense * 2.5) {
    return {
      title: 'Өндөр дүнтэй зардал илэрлээ',
      detail: `${tx.description} гүйлгээний дүн ${amount.toLocaleString()}₮ байна. Энэ нь дундаж зардлаас өндөр байж магадгүй.`,
      confidence: 0.82
    };
  }
  return null;
}

export function answerFinanceQuestion(question, metrics) {
  const q = question.toLowerCase();
  if (q.includes('ашиг')) {
    return `Өнөөдрийн ойролцоо ашиг: ${(metrics.todayProfit || 0).toLocaleString()}₮. Борлуулалтаас өртөг болон зардлыг хасаж тооцсон.`;
  }
  if (q.includes('зардал')) {
    return `Энэ сарын хамгийн их зардлын ангилал: ${metrics.topExpenseCategory || 'мэдээлэл алга'} (${(metrics.topExpenseAmount || 0).toLocaleString()}₮).`;
  }
  if (q.includes('нөат') || q.includes('vat')) {
    return `Энэ сарын НӨАТ-ын тооцоолол: ${(metrics.monthVat || 0).toLocaleString()}₮. Энэ нь demo simulation.`;
  }
  if (q.includes('ашигтай') || q.includes('бүтээгдэхүүн')) {
    return `Хамгийн ашигтай бүтээгдэхүүн: ${metrics.topProduct || 'мэдээлэл алга'}.`;
  }
  return `Санхүүгийн товч дүгнэлт: сарын орлого ${(metrics.monthRevenue || 0).toLocaleString()}₮, зардал ${(metrics.monthExpense || 0).toLocaleString()}₮, ашиг ${(metrics.monthProfit || 0).toLocaleString()}₮.`;
}
