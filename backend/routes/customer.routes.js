const express = require("express");
const router = express.Router();

const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} = require("../controllers/customer.controller");
const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

router.use(protect);

router.get("/", authorizeRoles("Admin", "Accountant", "Customer"), getCustomers);
router.get("/:id", authorizeRoles("Admin", "Accountant", "Customer"), getCustomerById);

router.post("/", authorizeRoles("Admin", "Accountant"), createCustomer);
router.put("/:id", authorizeRoles("Admin", "Accountant"), updateCustomer);
router.delete("/:id", authorizeRoles("Admin", "Accountant"), deleteCustomer);

module.exports = router;
