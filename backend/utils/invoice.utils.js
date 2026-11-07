const Payment = require("../models/Payment");

const roundMoney = (amount) => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const getInvoiceStatus = (invoice) => {
  if (invoice.balanceAmount <= 0) return "Paid";
  if (new Date(invoice.dueDate) < new Date()) return "Overdue";
  if (invoice.paidAmount > 0) return "Partially Paid";
  return "Unpaid";
};

const refreshInvoicePaymentTotals = async (invoice) => {
  const result = await Payment.aggregate([
    { $match: { invoice: invoice._id } },
    { $group: { _id: null, paidAmount: { $sum: "$amount" } } }
  ]);

  invoice.paidAmount = roundMoney(result[0]?.paidAmount || 0);
  invoice.balanceAmount = roundMoney(invoice.totalAmount - invoice.paidAmount);
  invoice.status = getInvoiceStatus(invoice);
  await invoice.save();

  return invoice;
};

module.exports = {
  roundMoney,
  getInvoiceStatus,
  refreshInvoicePaymentTotals
};
