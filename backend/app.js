const errorHandler = require("./middleware/error.middleware");
const authRoutes = require("./routes/auth.routes");
const customerRoutes = require("./routes/customer.routes");
const itemRoutes = require("./routes/item.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const paymentRoutes = require("./routes/payment.routes");
const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Invoice Billing API is running"
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});
app.use(errorHandler);
module.exports = app;
