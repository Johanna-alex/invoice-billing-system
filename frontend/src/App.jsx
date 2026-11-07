import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerFormPage from "./pages/CustomerFormPage";
import ItemsPage from "./pages/ItemsPage";
import ItemFormPage from "./pages/ItemFormPage";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceFormPage from "./pages/InvoiceFormPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import PaymentsPage from "./pages/PaymentsPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/payments" element={<PaymentsPage />} />

              <Route element={<ProtectedRoute allowedRoles={["Admin", "Accountant"]} />}>
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/new" element={<CustomerFormPage />} />
                <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/items/new" element={<ItemFormPage />} />
                <Route path="/items/:id/edit" element={<ItemFormPage />} />
                <Route path="/invoices/new" element={<InvoiceFormPage />} />
                <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
