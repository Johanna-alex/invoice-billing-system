
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe
} = require("../controllers/auth.controller");

const protect = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route - logged-in users only
router.get("/me", protect, getMe);

// Admin-only test route
router.get(
  "/admin-check",
  protect,
  authorizeRoles("Admin"),
  (req, res) => {
    res.status(200).json({
      message: "Admin access granted"
    });
  }
);

module.exports = router;
