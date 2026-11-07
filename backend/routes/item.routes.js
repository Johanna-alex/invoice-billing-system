const express = require("express");
const router = express.Router();

const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem
} = require("../controllers/item.controller");
const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

router.use(protect);

router.get("/", authorizeRoles("Admin", "Accountant", "Customer"), getItems);
router.get("/:id", authorizeRoles("Admin", "Accountant", "Customer"), getItemById);

router.post("/", authorizeRoles("Admin", "Accountant"), createItem);
router.put("/:id", authorizeRoles("Admin", "Accountant"), updateItem);
router.delete("/:id", authorizeRoles("Admin", "Accountant"), deleteItem);

module.exports = router;
