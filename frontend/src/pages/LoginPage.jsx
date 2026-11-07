import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../utils/format";

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <Link to="/" className="brand auth-brand"><span className="brand-mark">B</span><strong>Billora</strong></Link>
        <div className="auth-copy"><span className="eyebrow light">Invoice management, simplified</span><h1>Keep every invoice, payment and customer in clear view.</h1><p>A focused workspace for teams that want billing to feel calm and organized.</p></div>
        <div className="auth-quote"><span>“</span><p>One place for the numbers that keep your business moving.</p></div>
      </section>
      <main className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div><span className="eyebrow">Welcome back</span><h2>Sign in to your account</h2><p>Enter your details to continue to your workspace.</p></div>
          {error && <div className="alert error">{error}</div>}
          <label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" required /></label>
          <button className="button primary full" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
          <p className="auth-switch">New to Billora? <Link to="/register">Create an account</Link></p>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;
