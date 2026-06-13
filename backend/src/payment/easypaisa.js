function parseEasyPaisa(text = '') {
  const body = String(text || '');
  if (!/easypaisa|easy paisa|telenor/i.test(body)) return null;
  const txn = body.match(/(?:transaction(?:\s*id)?|txn|trx|reference(?:\s*no)?|ref|tid)[\s#:.-]*([A-Z0-9-]{5,})/i)?.[1];
  const amount = (
    body.match(/(?:amount|paid|received)[\s:.-]*(?:rs\.?|pkr)?[\s:.-]*([0-9,]+(?:\.\d{1,2})?)/i) ||
    body.match(/(?:rs\.?|pkr)[\s:.-]*([0-9,]+(?:\.\d{1,2})?)/i)
  )?.[1];
  const sender = body.match(/(?:from|sender|mobile|account)[\s:.-]*(\+?92\d{10}|0\d{10})/i)?.[1];
  return txn && amount ? { transactionId: txn, amount: Number(amount.replace(/,/g, '')), senderMobile: sender || '', paymentMethod: 'EasyPaisa' } : null;
}

module.exports = { parseEasyPaisa };
