export const generateInvoiceHTML = (bill) => {
    const { billNo, partyName, date, items, grandTotal, totalCartonCount, logo } = bill;
    const logoImgHtml = logo ? `<img src="${logo}" style="height:70px; width:auto;"/>` : '';
    const accentColor = "#10b981"; // Emerald Green

    const rowsHtml = (items || []).map((r, i) => `
      <tr class="item-row">
        <td class="col-idx">${i + 1}</td>
        <td class="col-desc">
            <span class="desc-main">${r.brand} - ${r.colour}</span>
            <span class="desc-sub">${r.sizeLabel} • ${r.micron || ''}</span>
        </td>
        <td class="col-qty">${Number(r.totalCarton)} <small>CTN</small></td>
        <td class="col-qty">${Number(r.perCtnQty)} <small>Pcs</small></td>
        <td class="col-total-qty">${Number(r.totalQty)}</td>
        <td class="col-rate">${(r.rate || 0).toLocaleString()}</td>
        <td class="col-amount">${(r.total || 0).toLocaleString()}</td>
      </tr>`).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Invoice #${billNo}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { padding: 50px; background: #fff; color: #1a1a1a; -webkit-print-color-adjust: exact; }
        
        /* Corporate Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; }
        .brand-section { display: flex; align-items: center; gap: 20px; }
        .brand-details h1 { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #000; text-transform: uppercase; line-height: 1; }
        .brand-details p { font-size: 10px; color: #666; margin-top: 5px; font-weight: 500; line-height: 1.5; }
        
        .invoice-meta { text-align: right; }
        .invoice-meta h2 { font-size: 40px; font-weight: 800; color: #e5e7eb; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        .meta-box { background: #f9fafb; padding: 15px 25px; border-radius: 12px; border: 1px solid #f3f4f6; }
        .meta-item { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 5px; }
        .meta-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; }
        .meta-value { font-size: 12px; font-weight: 700; color: #111827; }

        /* Party Details */
        .billing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .bill-box { padding: 0 10px; }
        .label-tiny { font-size: 10px; font-weight: 800; color: ${accentColor}; text-transform: uppercase; margin-bottom: 10px; display: block; letter-spacing: 1px; }
        .party-name { font-size: 20px; font-weight: 800; color: #000; text-transform: uppercase; }
        
        /* Table Design */
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        thead th { background: #f9fafb; padding: 15px 10px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4b5563; border-bottom: 2px solid #111827; }
        
        .item-row td { padding: 18px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
        .col-idx { color: #9ca3af; font-weight: 600; width: 30px; }
        .col-desc { line-height: 1.4; }
        .desc-main { display: block; font-weight: 700; font-size: 13px; text-transform: uppercase; }
        .desc-sub { color: #6b7280; font-size: 10px; font-weight: 500; }
        .col-qty, .col-rate { font-weight: 600; color: #4b5563; }
        .col-total-qty { font-weight: 700; color: #111827; }
        .col-amount { font-weight: 800; text-align: right; color: #111827; font-size: 14px; }
        
        /* Totals Area */
        .summary-section { display: flex; justify-content: space-between; align-items: flex-start; gap: 50px; }
        .words-box { flex: 1; padding: 20px; background: #f9fafb; border-radius: 12px; }
        .words-label { font-size: 9px; font-weight: 800; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; display: block; }
        .words-value { font-size: 12px; font-weight: 600; color: #374151; font-style: italic; }

        .total-card { width: 300px; background: #111827; padding: 25px; border-radius: 15px; color: #fff; position: relative; overflow: hidden; }
        .total-card::after { content: ''; position: absolute; top: 0; right: 0; width: 5px; height: 100%; background: ${accentColor}; }
        .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .total-label { font-size: 11px; font-weight: 500; opacity: 0.7; }
        .total-val-sub { font-size: 14px; font-weight: 700; }
        .grand-total-label { font-size: 12px; font-weight: 800; text-transform: uppercase; margin-top: 10px; display: block; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }
        .grand-total-value { font-size: 32px; font-weight: 800; color: ${accentColor}; }

        /* Footer Signature */
        .footer-sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 80px; }
        .sig-box { border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; }
        .sig-box p { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }

        .thanks { text-align: center; margin-top: 50px; font-size: 10px; font-weight: 700; color: #d1d5db; text-transform: uppercase; letter-spacing: 2px; }
        
        @media print {
            body { padding: 20px; }
            .total-card { -webkit-print-color-adjust: exact; background-color: #111827 !important; color: #fff !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand-section">
            ${logoImgHtml ? `<div class="logo-wrap">${logoImgHtml}</div>` : ''}
            <div class="brand-details">
                <h1>HS PACKAGES</h1>
                <p>${ADDR}<br/>${PHONE}</p>
            </div>
        </div>
        <div class="invoice-meta">
            <h2>Invoice</h2>
            <div class="meta-box">
                <div class="meta-item"><span class="meta-label">Inv #</span><span class="meta-value">${billNo}</span></div>
                <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">${date}</span></div>
            </div>
        </div>
    </div>

    <div class="billing-grid">
        <div class="bill-box">
            <span class="label-tiny">Bill To</span>
            <div class="party-name">${partyName}</div>
        </div>
        <div class="bill-box" style="text-align: right;">
            <span class="label-tiny">Payment Status</span>
            <div class="party-name" style="font-size: 14px;">UNPAID / PENDING</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="col-idx">#</th>
                <th class="col-desc">Description</th>
                <th class="col-qty text-center">Cartons</th>
                <th class="col-qty text-center">P/Ctn</th>
                <th class="col-total-qty text-center">Total Qty</th>
                <th class="col-rate text-right">Rate</th>
                <th class="col-amount text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>

    <div class="summary-section">
        <div class="words-box">
            <span class="words-label">Amount in words</span>
            <p class="words-value">${toWords(grandTotal)}</p>
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
                <span class="words-label">Notes / Terms</span>
                <p style="font-size: 9px; color: #9ca3af; font-weight: 500;">
                    1. Goods once sold will not be taken back.<br/>
                    2. Warranty claims as per brand policy.
                </p>
            </div>
        </div>
        <div class="total-card">
            <div class="total-row">
                <span class="total-label">Total Cartons</span>
                <span class="total-val-sub">${totalCartonCount} Units</span>
            </div>
            <div class="total-row">
                <span class="total-label">Net Subtotal</span>
                <span class="total-val-sub">Rs. ${grandTotal.toLocaleString()}</span>
            </div>
            <span class="grand-total-label">Amount Due</span>
            <div class="grand-total-value">Rs. ${grandTotal.toLocaleString()}</div>
        </div>
    </div>

    <div class="footer-sigs">
        <div class="sig-box"><p>Prepared By</p></div>
        <div class="sig-box"><p>Checked By</p></div>
        <div class="sig-box"><p>Authorized Signatory</p></div>
    </div>

    <p class="thanks">Thank you for your business</p>

    <script>
        window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
        }
    </script>
</body>
</html>`;
};
