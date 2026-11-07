const mongoose = require("mongoose");
const Item = require("../models/Item");

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

const validateItemInput = (body, isUpdate = false) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const allowedFields = ["name", "description", "price", "taxRate", "isActive"];
  const suppliedFields = allowedFields.filter((field) => body[field] !== undefined);

  if (isUpdate && suppliedFields.length === 0) {
    return { error: "Provide at least one item field to update" };
  }

  if (!isUpdate && (body.name === undefined || body.price === undefined)) {
    return { error: "Name and price are required" };
  }

  const data = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { error: "Name must be a non-empty string" };
    }
    data.name = body.name.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      return { error: "Description must be a string" };
    }
    data.description = body.description.trim();
  }

  if (body.price !== undefined) {
    if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) {
      return { error: "Price must be a number greater than or equal to 0" };
    }
    data.price = body.price;
  }

  if (body.taxRate !== undefined) {
    if (
      typeof body.taxRate !== "number" ||
      !Number.isFinite(body.taxRate) ||
      body.taxRate < 0 ||
      body.taxRate > 100
    ) {
      return { error: "Tax rate must be a number between 0 and 100" };
    }
    data.taxRate = body.taxRate;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return { error: "isActive must be true or false" };
    }
    data.isActive = body.isActive;
  }

  return { data };
};

const createItem = async (req, res, next) => {
  try {
    const validation = validateItemInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const item = await Item.create(validation.data);

    res.status(201).json({
      message: "Item created successfully",
      item
    });
  } catch (error) {
    next(error);
  }
};

const getItems = async (req, res, next) => {
  try {
    const pagination = getPagination(req, res);
    if (!pagination) return;

    if (req.query.search !== undefined && typeof req.query.search !== "string") {
      return res.status(400).json({ message: "Search must be a string" });
    }

    const filter = {};
    const search = (req.query.search || "").trim();
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const { page, limit } = pagination;
    const [items, total] = await Promise.all([
      Item.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Item.countDocuments(filter)
    ]);

    res.status(200).json({
      items,
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

const getItemById = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const validation = validateItemInput(req.body, true);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const item = await Item.findByIdAndUpdate(req.params.id, validation.data, {
      new: true,
      runValidators: true
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({
      message: "Item updated successfully",
      item
    });
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem
};
