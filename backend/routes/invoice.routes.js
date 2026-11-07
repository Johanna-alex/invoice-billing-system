const express = require("express");
const router = express.Router();

const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} = require("../controllers/invoice.controller");
const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

router.use(protect);

router.get("/", authorizeRoles("Admin", "Accountant", "Customer"), getInvoices);
router.get("/:id", authorizeRoles("Admin", "Accountant", "Customer"), getInvoiceById);
router.post("/", authorizeRoles("Admin", "Accountant"), createInvoice);
router.put("/:id", authorizeRoles("Admin", "Accountant"), updateInvoice);
router.delete("/:id", authorizeRoles("Admin", "Accountant"), deleteInvoice);

module.exports = router;
