const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const { roundMoney, refreshInvoicePaymentTotals } = require("../utils/invoice.utils");

const paymentMethods = ["Cash", "Card", "UPI", "Bank Transfer"];

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getPagination = (req, res) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    res.status(400).json({
      message: "Page must be a positive integer and limit must be between 1 and 100"
    });
    return null;
  }

  return { page, limit };
};

const validatePaymentInput = (body, isUpdate = false) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const allowedFields = [
    "invoice",
    "amount",
    "paymentDate",
    "paymentMethod",
    "referenceNumber",
    "notes"
  ];
  const suppliedFields = allowedFields.filter((field) => body[field] !== undefined);

  if (isUpdate && suppliedFields.length === 0) {
    return { error: "Provide at least one payment field to update" };
  }
  if (
    !isUpdate &&
    (body.invoice === undefined ||
      body.amount === undefined ||
      body.paymentMethod === undefined)
  ) {
    return { error: "Invoice, amount, and payment method are required" };
  }
  if (isUpdate && body.invoice !== undefined) {
    return { error: "A payment cannot be moved to another invoice" };
  }

  const data = {};

  if (body.invoice !== undefined) {
    if (!mongoose.isObjectIdOrHexString(body.invoice)) {
      return { error: "Invoice must be a valid MongoDB ObjectId" };
    }
    data.invoice = body.invoice;
  }

  if (body.amount !== undefined) {
    if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
      return { error: "Payment amount must be a number greater than 0" };
    }
    data.amount = roundMoney(body.amount);
    if (data.amount <= 0) {
      return { error: "Payment amount must be at least 0.01" };
    }
  }

  if (body.paymentDate !== undefined) {
    const paymentDate = new Date(body.paymentDate);
    if (!body.paymentDate || Number.isNaN(paymentDate.getTime())) {
      return { error: "Payment date must be a valid date" };
    }
    data.paymentDate = paymentDate;
  }

  if (body.paymentMethod !== undefined) {
    if (typeof body.paymentMethod !== "string" || !paymentMethods.includes(body.paymentMethod)) {
      return { error: `Payment method must be one of: ${paymentMethods.join(", ")}` };
    }
    data.paymentMethod = body.paymentMethod;
  }

  for (const field of ["referenceNumber", "notes"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string") {
        return { error: `${field} must be a string` };
      }
      data[field] = body[field].trim();
    }
  }

  return { data };
};

const getPaymentsTotal = async (invoiceId, excludedPaymentId = null) => {
  const match = { invoice: new mongoose.Types.ObjectId(invoiceId) };
  if (excludedPaymentId) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludedPaymentId) };
  }

  const result = await Payment.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  return roundMoney(result[0]?.total || 0);
};

const createPayment = async (req, res, next) => {
  let createdPayment = null;

  try {
    const validation = validatePaymentInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const invoice = await Invoice.findById(validation.data.invoice);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const existingPaidAmount = await getPaymentsTotal(invoice._id);
    if (roundMoney(existingPaidAmount + validation.data.amount) > invoice.totalAmount) {
      return res.status(400).json({ message: "Payment amount exceeds the invoice balance" });
    }

    createdPayment = await Payment.create(validation.data);
    await refreshInvoicePaymentTotals(invoice);

    await createdPayment.populate("invoice", "invoiceNumber totalAmount paidAmount balanceAmount status");
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: createdPayment,
      invoice
    });
  } catch (error) {
    if (createdPayment) {
      await Payment.findByIdAndDelete(createdPayment._id).catch(() => {});
      const invoice = await Invoice.findById(createdPayment.invoice).catch(() => null);
      if (invoice) await refreshInvoicePaymentTotals(invoice).catch(() => {});
    }
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const pagination = getPagination(req, res);
    if (!pagination) return;

    const conditions = [];
    const { invoice, paymentMethod, search } = req.query;

    if (invoice !== undefined) {
      if (!mongoose.isObjectIdOrHexString(invoice)) {
        return res.status(400).json({ message: "Invalid invoice filter" });
      }
      conditions.push({ invoice });
    }
    if (paymentMethod !== undefined) {
      if (typeof paymentMethod !== "string" || !paymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method filter" });
      }
      conditions.push({ paymentMethod });
    }
    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({ message: "Search must be a string" });
    }

    const searchText = (search || "").trim();
    if (searchText) {
      const searchRegex = new RegExp(escapeRegex(searchText), "i");
      conditions.push({
        $or: [{ referenceNumber: searchRegex }, { notes: searchRegex }]
      });
    }

    if (req.user.role === "Customer") {
      const ownCustomers = await Customer.find({ user: req.user.id }).select("_id");
      const ownInvoices = await Invoice.find({
        customer: { $in: ownCustomers.map((record) => record._id) }
      }).select("_id");
      conditions.push({ invoice: { $in: ownInvoices.map((record) => record._id) } });
    }

    const filter = conditions.length ? { $and: conditions } : {};
    const { page, limit } = pagination;
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("invoice", "invoiceNumber customer totalAmount paidAmount balanceAmount status")
        .sort({ paymentDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter)
    ]);

    res.status(200).json({
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(req.params.id).populate({
      path: "invoice",
      select: "invoiceNumber customer totalAmount paidAmount balanceAmount status",
      populate: { path: "customer", select: "name email user" }
    });
    if (!payment || !payment.invoice) {
      return res.status(404).json({ message: "Payment not found" });
    }
    if (
      req.user.role === "Customer" &&
      payment.invoice.customer?.user?.toString() !== req.user.id
    ) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ payment });
  } catch (error) {
    next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const validation = validatePaymentInput(req.body, true);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const invoice = await Invoice.findById(payment.invoice);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (validation.data.amount !== undefined) {
      const otherPayments = await getPaymentsTotal(invoice._id, payment._id);
      if (roundMoney(otherPayments + validation.data.amount) > invoice.totalAmount) {
        return res.status(400).json({ message: "Payment amount exceeds the invoice balance" });
      }
    }

    Object.assign(payment, validation.data);
    await payment.save();
    await refreshInvoicePaymentTotals(invoice);

    await payment.populate("invoice", "invoiceNumber totalAmount paidAmount balanceAmount status");
    res.status(200).json({ message: "Payment updated successfully", payment, invoice });
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const invoice = await Invoice.findById(payment.invoice);
    await payment.deleteOne();
    if (invoice) await refreshInvoicePaymentTotals(invoice);

    res.status(200).json({ message: "Payment deleted successfully", invoice });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment
};
