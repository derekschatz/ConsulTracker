// Format currency for display
function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Update the invoice total display
doc.text(formatCurrency(invoice.amount), pageWidth - 20, startY + 17, { align: 'right' });

// Update line item amount display
doc.text(formatCurrency(item.amount), pageWidth - 20, startY, { align: 'right' }); 