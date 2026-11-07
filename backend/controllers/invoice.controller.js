const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const InvoiceLine = require("../models/InvoiceLine");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Item = require("../models/Item");
const { roundMoney, getInvoiceStatus } = require("../utils/invoice.utils");

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

const parseDate = (value, fieldName) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return { error: `${fieldName} must be a valid date` };
  }
  return { date };
};

const isDueDateBeforeIssueDate = (dueDate, issueDate) => {
  const dueDay = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate()
  );
  const issueDay = Date.UTC(
    issueDate.getUTCFullYear(),
    issueDate.getUTCMonth(),
    issueDate.getUTCDate()
  );
  return dueDay < issueDay;
};

const prepareLines = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "At least one invoice item is required" };
  }

  const preparedItems = [];

  for (const entry of items) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { error: "Each invoice item must be an object" };
    }
    if (!mongoose.isObjectIdOrHexString(entry.item)) {
      return { error: "Each item must have a valid item ID" };
    }
    if (
      typeof entry.quantity !== "number" ||
      !Number.isInteger(entry.quantity) ||
      entry.quantity < 1
    ) {
      return { error: "Each item quantity must be a positive integer" };
    }

    preparedItems.push({ item: entry.item, quantity: entry.quantity });
  }

  const uniqueIds = [...new Set(preparedItems.map((entry) => entry.item.toString()))];
  const itemDocuments = await Item.find({ _id: { $in: uniqueIds } });
  const itemMap = new Map(itemDocuments.map((item) => [item._id.toString(), item]));

  const lines = [];
  let subtotal = 0;
  let taxAmount = 0;

  for (const entry of preparedItems) {
    const item = itemMap.get(entry.item.toString());
    if (!item) {
      return { error: `Item ${entry.item} was not found`, statusCode: 404 };
    }
    if (!item.isActive) {
      return { error: `Item ${item.name} is inactive` };
    }

    const baseAmount = roundMoney(item.price * entry.quantity);
    const lineTax = roundMoney(baseAmount * item.taxRate / 100);

    subtotal = roundMoney(subtotal + baseAmount);
    taxAmount = roundMoney(taxAmount + lineTax);
    lines.push({
      item: item._id,
      quantity: entry.quantity,
      unitPrice: item.price,
      taxRate: item.taxRate,
      lineTotal: roundMoney(baseAmount + lineTax)
    });
  }

  return { lines, subtotal, taxAmount };
};

const calculateFromStoredLines = (lines) => {
  let subtotal = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const baseAmount = roundMoney(line.unitPrice * line.quantity);
    subtotal = roundMoney(subtotal + baseAmount);
    taxAmount = roundMoney(taxAmount + roundMoney(baseAmount * line.taxRate / 100));
  }

  return { subtotal, taxAmount };
};

const getInvoiceDetails = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId).populate(
    "customer",
    "name email phone address user"
  );
  if (!invoice) return null;

  const [lines, payments] = await Promise.all([
    InvoiceLine.find({ invoice: invoiceId }).populate("item", "name description"),
    Payment.find({ invoice: invoiceId }).sort({ paymentDate: -1 })
  ]);

  return { invoice, lines, payments };
};

const validateInvoiceBasics = async (body, isUpdate = false) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const allowedFields = [
    "invoiceNumber",
    "customer",
    "issueDate",
    "dueDate",
    "discountAmount",
    "items"
  ];
  const suppliedFields = allowedFields.filter((field) => body[field] !== undefined);

  if (isUpdate && suppliedFields.length === 0) {
    return { error: "Provide at least one invoice field to update" };
  }
  if (
    !isUpdate &&
    (body.invoiceNumber === undefined ||
      body.customer === undefined ||
      body.dueDate === undefined ||
      body.items === undefined)
  ) {
    return { error: "Invoice number, customer, due date, and items are required" };
  }

  const data = {};

  if (body.invoiceNumber !== undefined) {
    if (typeof body.invoiceNumber !== "string" || !body.invoiceNumber.trim()) {
      return { error: "Invoice number must be a non-empty string" };
    }
    data.invoiceNumber = body.invoiceNumber.trim();
  }

  if (body.customer !== undefined) {
    if (!mongoose.isObjectIdOrHexString(body.customer)) {
      return { error: "Customer must be a valid MongoDB ObjectId" };
    }
    const customer = await Customer.findById(body.customer);
    if (!customer) {
      return { error: "Customer not found", statusCode: 404 };
    }
    data.customer = customer._id;
  }

  if (body.issueDate !== undefined) {
    const parsed = parseDate(body.issueDate, "Issue date");
    if (parsed.error) return parsed;
    data.issueDate = parsed.date;
  }

  if (body.dueDate !== undefined) {
    const parsed = parseDate(body.dueDate, "Due date");
    if (parsed.error) return parsed;
    data.dueDate = parsed.date;
  }

  if (body.discountAmount !== undefined) {
    if (
      typeof body.discountAmount !== "number" ||
      !Number.isFinite(body.discountAmount) ||
      body.discountAmount < 0
    ) {
      return { error: "Discount amount must be a number greater than or equal to 0" };
    }
    data.discountAmount = roundMoney(body.discountAmount);
  }

  return { data };
};

const createInvoice = async (req, res, next) => {
  let createdInvoice = null;

  try {
    const validation = await validateInvoiceBasics(req.body);
    if (validation.error) {
      return res.status(validation.statusCode || 400).json({ message: validation.error });
    }

    const prepared = await prepareLines(req.body.items);
    if (prepared.error) {
      return res.status(prepared.statusCode || 400).json({ message: prepared.error });
    }

    const issueDate = validation.data.issueDate || new Date();
    if (isDueDateBeforeIssueDate(validation.data.dueDate, issueDate)) {
      return res.status(400).json({ message: "Due date cannot be before issue date" });
    }

    const discountAmount = validation.data.discountAmount || 0;
    const grossAmount = roundMoney(prepared.subtotal + prepared.taxAmount);
    if (discountAmount > grossAmount) {
      return res.status(400).json({ message: "Discount cannot exceed the invoice amount" });
    }

    const totalAmount = roundMoney(grossAmount - discountAmount);
    const invoiceData = {
      ...validation.data,
      issueDate,
      subtotal: prepared.subtotal,
      taxAmount: prepared.taxAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount
    };
    invoiceData.status = getInvoiceStatus(invoiceData);

    createdInvoice = await Invoice.create(invoiceData);
    await InvoiceLine.insertMany(
      prepared.lines.map((line) => ({ ...line, invoice: createdInvoice._id }))
    );

    const details = await getInvoiceDetails(createdInvoice._id);
    res.status(201).json({ message: "Invoice created successfully", ...details });
  } catch (error) {
    if (createdInvoice) {
      await InvoiceLine.deleteMany({ invoice: createdInvoice._id }).catch(() => {});
      await Invoice.findByIdAndDelete(createdInvoice._id).catch(() => {});
    }
    next(error);
  }
};

const getInvoices = async (req, res, next) => {
  try {
    const pagination = getPagination(req, res);
    if (!pagination) return;

    const conditions = [];
    const { search, status, customer, startDate, endDate } = req.query;

    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({ message: "Search must be a string" });
    }
    if (status !== undefined) {
      const statuses = ["Draft", "Unpaid", "Partially Paid", "Paid", "Overdue"];
      if (typeof status !== "string" || !statuses.includes(status)) {
        return res.status(400).json({ message: "Invalid invoice status" });
      }
      conditions.push({ status });
    }
    if (customer !== undefined) {
      if (!mongoose.isObjectIdOrHexString(customer)) {
        return res.status(400).json({ message: "Invalid customer filter" });
      }
      conditions.push({ customer });
    }

    if (startDate !== undefined || endDate !== undefined) {
      const issueDate = {};
      if (startDate !== undefined) {
        const parsed = parseDate(startDate, "Start date");
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        issueDate.$gte = parsed.date;
      }
      if (endDate !== undefined) {
        const parsed = parseDate(endDate, "End date");
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        issueDate.$lte = parsed.date;
      }
      if (issueDate.$gte && issueDate.$lte && issueDate.$gte > issueDate.$lte) {
        return res.status(400).json({ message: "Start date cannot be after end date" });
      }
      conditions.push({ issueDate });
    }

    if (req.user.role === "Customer") {
      const ownCustomers = await Customer.find({ user: req.user.id }).select("_id");
      conditions.push({ customer: { $in: ownCustomers.map((record) => record._id) } });
    }

    const searchText = (search || "").trim();
    if (searchText) {
      const searchRegex = new RegExp(escapeRegex(searchText), "i");
      const matchingCustomers = await Customer.find({
        $or: [{ name: searchRegex }, { email: searchRegex }]
      }).select("_id");
      conditions.push({
        $or: [
          { invoiceNumber: searchRegex },
          { customer: { $in: matchingCustomers.map((record) => record._id) } }
        ]
      });
    }

    const filter = conditions.length ? { $and: conditions } : {};
    const { page, limit } = pagination;
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("customer", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Invoice.countDocuments(filter)
    ]);

    res.status(200).json({
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const details = await getInvoiceDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (
      req.user.role === "Customer" &&
      details.invoice.customer?.user?.toString() !== req.user.id
    ) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json(details);
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const validation = await validateInvoiceBasics(req.body, true);
    if (validation.error) {
      return res.status(validation.statusCode || 400).json({ message: validation.error });
    }

    let prepared;
    if (req.body.items !== undefined) {
      prepared = await prepareLines(req.body.items);
      if (prepared.error) {
        return res.status(prepared.statusCode || 400).json({ message: prepared.error });
      }
    } else {
      const storedLines = await InvoiceLine.find({ invoice: invoice._id });
      prepared = calculateFromStoredLines(storedLines);
    }

    const issueDate = validation.data.issueDate || invoice.issueDate;
    const dueDate = validation.data.dueDate || invoice.dueDate;
    if (isDueDateBeforeIssueDate(dueDate, issueDate)) {
      return res.status(400).json({ message: "Due date cannot be before issue date" });
    }

    const discountAmount =
      validation.data.discountAmount === undefined
        ? invoice.discountAmount
        : validation.data.discountAmount;
    const grossAmount = roundMoney(prepared.subtotal + prepared.taxAmount);
    if (discountAmount > grossAmount) {
      return res.status(400).json({ message: "Discount cannot exceed the invoice amount" });
    }

    const totalAmount = roundMoney(grossAmount - discountAmount);
    if (totalAmount < invoice.paidAmount) {
      return res.status(400).json({
        message: "Invoice total cannot be lower than the amount already paid"
      });
    }

    Object.assign(invoice, validation.data, {
      subtotal: prepared.subtotal,
      taxAmount: prepared.taxAmount,
      discountAmount,
      totalAmount,
      balanceAmount: roundMoney(totalAmount - invoice.paidAmount)
    });
    invoice.status = getInvoiceStatus(invoice);
    await invoice.save();

    if (req.body.items !== undefined) {
      await InvoiceLine.deleteMany({ invoice: invoice._id });
      await InvoiceLine.insertMany(
        prepared.lines.map((line) => ({ ...line, invoice: invoice._id }))
      );
    }

    const details = await getInvoiceDetails(invoice._id);
    res.status(200).json({ message: "Invoice updated successfully", ...details });
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    await Promise.all([
      InvoiceLine.deleteMany({ invoice: invoice._id }),
      Payment.deleteMany({ invoice: invoice._id })
    ]);
    await invoice.deleteOne();

    res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
};
