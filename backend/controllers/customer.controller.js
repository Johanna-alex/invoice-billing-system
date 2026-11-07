const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const User = require("../models/user");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const validateCustomerInput = async (body, isUpdate = false) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const allowedFields = ["user", "name", "email", "phone", "address"];
  const suppliedFields = allowedFields.filter((field) => body[field] !== undefined);

  if (isUpdate && suppliedFields.length === 0) {
    return { error: "Provide at least one customer field to update" };
  }

  if (!isUpdate && (body.name === undefined || body.email === undefined)) {
    return { error: "Name and email are required" };
  }

  const data = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { error: "Name must be a non-empty string" };
    }
    data.name = body.name.trim();
  }

  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !emailPattern.test(body.email.trim())) {
      return { error: "A valid email is required" };
    }
    data.email = body.email.trim().toLowerCase();
  }

  for (const field of ["phone", "address"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string") {
        return { error: `${field} must be a string` };
      }
      data[field] = body[field].trim();
    }
  }

  if (body.user !== undefined) {
    if (body.user === null || body.user === "") {
      data.user = null;
    } else {
      if (!mongoose.isObjectIdOrHexString(body.user)) {
        return { error: "User must be a valid MongoDB ObjectId" };
      }

      const user = await User.findById(body.user);
      if (!user) {
        return { error: "The selected user does not exist", statusCode: 404 };
      }
      if (user.role !== "Customer") {
        return { error: "Only a Customer-role user can be linked to a customer record" };
      }

      data.user = user._id;
    }
  }

  return { data };
};

const createCustomer = async (req, res, next) => {
  try {
    const validation = await validateCustomerInput(req.body);
    if (validation.error) {
      return res.status(validation.statusCode || 400).json({ message: validation.error });
    }

    const customer = await Customer.create(validation.data);

    res.status(201).json({
      message: "Customer created successfully",
      customer
    });
  } catch (error) {
    next(error);
  }
};

const getCustomers = async (req, res, next) => {
  try {
    const pagination = getPagination(req, res);
    if (!pagination) return;

    if (req.query.search !== undefined && typeof req.query.search !== "string") {
      return res.status(400).json({ message: "Search must be a string" });
    }

    const filter = {};

    if (req.user.role === "Customer") {
      filter.user = req.user.id;
    }

    const search = (req.query.search || "").trim();
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { address: searchRegex }
      ];
    }

    const { page, limit } = pagination;
    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Customer.countDocuments(filter)
    ]);

    res.status(200).json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const filter = { _id: req.params.id };
    if (req.user.role === "Customer") {
      filter.user = req.user.id;
    }

    const customer = await Customer.findOne(filter);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const validation = await validateCustomerInput(req.body, true);
    if (validation.error) {
      return res.status(validation.statusCode || 400).json({ message: validation.error });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      validation.data,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Customer updated successfully",
      customer
    });
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
