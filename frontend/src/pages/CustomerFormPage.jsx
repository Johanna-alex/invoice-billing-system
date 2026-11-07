import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { LoadingState } from "../components/PageState";
import { getErrorMessage } from "../utils/format";

const emptyForm = { name: "", email: "", phone: "", address: "", user: "" };

function CustomerFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return;
    apiFetch(`/customers/${id}`).then(({ customer }) => {
      setForm({ name: customer.name, email: customer.email, phone: customer.phone || "", address: customer.address || "", user: customer.user || "" });
    }).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false));
  }, [apiFetch, id, isEditing]);

  const handleSubmit = async (event) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try {
      await apiFetch(isEditing ? `/customers/${id}` : "/customers", {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({ ...form, user: form.user.trim() || null })
      });
      navigate("/customers");
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingState label="Loading customer…" />;

  return (
    <><div className="page-header"><div><span className="eyebrow">Customers</span><h1>{isEditing ? "Edit customer" : "Add customer"}</h1><p>{isEditing ? "Update this customer’s contact and account details." : "Create a customer record for future invoices."}</p></div></div>
    <form className="panel form-panel" onSubmit={handleSubmit}>
      {error && <div className="alert error">{error}</div>}
      <div className="form-grid two"><label>Customer name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Linked User ID <span className="optional">Optional</span><input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="Customer-role MongoDB user ID" /><small className="field-help">Required only when this customer should sign in and see their invoices.</small></label></div>
      <label>Billing address<textarea rows="4" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
      <div className="form-actions"><Link className="button secondary" to="/customers">Cancel</Link><button className="button primary" disabled={submitting}>{submitting ? "Saving…" : isEditing ? "Save changes" : "Add customer"}</button></div>
    </form></>
  );
}

export default CustomerFormPage;
