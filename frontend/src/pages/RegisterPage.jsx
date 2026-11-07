import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../utils/format";

function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/login", { state: { message: "Registration successful. Please sign in." } });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel registration">
        <Link to="/" className="brand auth-brand"><span className="brand-mark">B</span><strong>Billora</strong></Link>
        <div className="auth-copy"><span className="eyebrow light">Start with confidence</span><h1>A clearer way to manage the work behind every payment.</h1><p>Create your account, then keep invoices and collections moving from one tidy dashboard.</p></div>
      </section>
      <main className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div><span className="eyebrow">Create account</span><h2>Set up your workspace access</h2><p>New registrations receive the Customer role by default.</p></div>
          {error && <div className="alert error">{error}</div>}
          <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required /></label>
          <label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required /></label>
          <div className="form-grid two">
            <label>Password<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
            <label>Confirm password<input type="password" minLength="8" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required /></label>
          </div>
          <button className="button primary full" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}</button>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>
      </main>
    </div>
  );
}

export default RegisterPage;
