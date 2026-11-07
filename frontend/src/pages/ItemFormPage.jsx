import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { LoadingState } from "../components/PageState";
import { getErrorMessage } from "../utils/format";

function ItemFormPage() {
  const { id } = useParams(); const isEditing = Boolean(id); const { apiFetch } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", price: "", taxRate: "0", isActive: true });
  const [loading, setLoading] = useState(isEditing); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");

  useEffect(() => { if (!isEditing) return; apiFetch(`/items/${id}`).then(({ item }) => setForm({ name: item.name, description: item.description || "", price: String(item.price), taxRate: String(item.taxRate), isActive: item.isActive })).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoading(false)); }, [apiFetch, id, isEditing]);

  const handleSubmit = async (event) => { event.preventDefault(); setSubmitting(true); setError(""); try { await apiFetch(isEditing ? `/items/${id}` : "/items", { method: isEditing ? "PUT" : "POST", body: JSON.stringify({ ...form, price: Number(form.price), taxRate: Number(form.taxRate) }) }); navigate("/items"); } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setSubmitting(false); } };
  if (loading) return <LoadingState label="Loading item…" />;

  return <><div className="page-header"><div><span className="eyebrow">Catalog</span><h1>{isEditing ? "Edit item" : "Add item"}</h1><p>Set the price and tax used when this item is added to invoices.</p></div></div><form className="panel form-panel" onSubmit={handleSubmit}>{error && <div className="alert error">{error}</div>}<div className="form-grid two"><label>Item name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Price (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label><label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required /></label><label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span><strong>Active item</strong><small>Available when creating invoices</small></span></label></div><label>Description<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-actions"><Link className="button secondary" to="/items">Cancel</Link><button className="button primary" disabled={submitting}>{submitting ? "Saving…" : "Save item"}</button></div></form></>;
}

export default ItemFormPage;
