const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment
} = require("../controllers/payment.controller");
const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

router.use(protect);

router.get("/", authorizeRoles("Admin", "Accountant", "Customer"), getPayments);
router.get("/:id", authorizeRoles("Admin", "Accountant", "Customer"), getPaymentById);
router.post("/", authorizeRoles("Admin", "Accountant"), createPayment);
router.put("/:id", authorizeRoles("Admin", "Accountant"), updatePayment);
router.delete("/:id", authorizeRoles("Admin", "Accountant"), deletePayment);

module.exports = router;
