import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchAllPages } from "../api/api";
import { useAuth } from "../context/useAuth";
import { LoadingState } from "../components/PageState";
import { formatCurrency, getErrorMessage, toDateInput } from "../utils/format";

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function InvoiceFormPage() {
  const { id } = useParams(); const isEditing = Boolean(id); const navigate = useNavigate(); const { apiFetch } = useAuth();
  const [customers, setCustomers] = useState([]); const [items, setItems] = useState([]);
  const [form, setForm] = useState({ invoiceNumber: "", customer: "", issueDate: "", dueDate: "", discountAmount: "0", lines: [{ item: "", quantity: 1 }] });
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadForm() {
      try {
        const [customerResult, itemResult, invoiceResult] = await Promise.all([
          fetchAllPages(apiFetch, "/customers", "customers"),
          fetchAllPages(apiFetch, "/items", "items"),
          isEditing ? apiFetch(`/invoices/${id}`) : Promise.resolve(null)
        ]);
        if (!active) return;
        setCustomers(customerResult.records); setItems(itemResult.records);
        if (invoiceResult) {
          const invoice = invoiceResult.invoice;
          setForm({ invoiceNumber: invoice.invoiceNumber, customer: invoice.customer?._id || "", issueDate: toDateInput(invoice.issueDate), dueDate: toDateInput(invoice.dueDate), discountAmount: String(invoice.discountAmount || 0), lines: invoiceResult.lines.map((line) => ({ item: line.item?._id || line.item, quantity: line.quantity })) });
        }
      } catch (requestError) { if (active) setError(getErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    }
    loadForm(); return () => { active = false; };
  }, [apiFetch, id, isEditing]);

  const totals = useMemo(() => {
    let subtotal = 0; let tax = 0;
    form.lines.forEach((line) => { const item = items.find((entry) => entry._id === line.item); if (!item) return; const base = roundMoney(Number(item.price) * Number(line.quantity || 0)); subtotal = roundMoney(subtotal + base); tax = roundMoney(tax + roundMoney(base * Number(item.taxRate) / 100)); });
    const discount = Number(form.discountAmount) || 0;
    return { subtotal, tax, total: Math.max(0, roundMoney(subtotal + tax - discount)) };
  }, [form.lines, form.discountAmount, items]);

  const updateLine = (index, field, value) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line) }));
  const removeLine = (index) => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));

  const handleSubmit = async (event) => {
    event.preventDefault(); setError("");
    if (form.lines.some((line) => !line.item)) { setError("Select an item for every invoice line"); return; }
    if (Number(form.discountAmount) > totals.subtotal + totals.tax) { setError("Discount cannot exceed the invoice amount"); return; }
    setSubmitting(true);
    try {
      const data = await apiFetch(isEditing ? `/invoices/${id}` : "/invoices", { method: isEditing ? "PUT" : "POST", body: JSON.stringify({ invoiceNumber: form.invoiceNumber, customer: form.customer, issueDate: form.issueDate, dueDate: form.dueDate, discountAmount: Number(form.discountAmount) || 0, items: form.lines.map((line) => ({ item: line.item, quantity: Number(line.quantity) })) }) });
      navigate(`/invoices/${data.invoice._id}`);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingState label="Preparing invoice form…" />;

  return <><div className="page-header"><div><span className="eyebrow">Billing</span><h1>{isEditing ? "Edit invoice" : "Create invoice"}</h1><p>Add customer details, line items and payment terms.</p></div></div>
    <form className="invoice-form" onSubmit={handleSubmit}>{error && <div className="alert error">{error}</div>}
      <section className="panel form-panel"><div className="section-heading"><div><h2>Invoice details</h2><p>Core reference and schedule information.</p></div></div><div className="form-grid four"><label>Invoice number<input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} required /></label><label>Customer<select value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required><option value="">Select customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}</select></label><label>Issue date<input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} required /></label><label>Due date<input type="date" min={form.issueDate} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></label></div></section>
      <section className="panel form-panel"><div className="section-heading"><div><h2>Line items</h2><p>Prices and tax rates come from your item catalog.</p></div><button type="button" className="button secondary small" onClick={() => setForm({ ...form, lines: [...form.lines, { item: "", quantity: 1 }] })}>+ Add line</button></div>
        <div className="invoice-lines"><div className="line-header"><span>Item</span><span>Quantity</span><span>Rate</span><span>Tax</span><span>Total</span><span /></div>{form.lines.map((line, index) => { const selected = items.find((item) => item._id === line.item); const base = selected ? Number(selected.price) * Number(line.quantity || 0) : 0; const lineTotal = selected ? base + base * Number(selected.taxRate) / 100 : 0; return <div className="invoice-line" key={`${index}-${line.item}`}><select value={line.item} onChange={(e) => updateLine(index, "item", e.target.value)} required><option value="">Choose item</option>{items.map((item) => <option key={item._id} value={item._id} disabled={!item.isActive && item._id !== line.item}>{item.name}{!item.isActive ? " (inactive)" : ""}</option>)}</select><input type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} required /><span>{selected ? formatCurrency(selected.price) : "—"}</span><span>{selected ? `${selected.taxRate}%` : "—"}</span><strong>{formatCurrency(lineTotal)}</strong><button type="button" className="remove-line" disabled={form.lines.length === 1} onClick={() => removeLine(index)} aria-label="Remove line">×</button></div>; })}</div>
        <div className="invoice-summary"><label>Discount (₹)<input type="number" min="0" step="0.01" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} /></label><div><span>Subtotal<strong>{formatCurrency(totals.subtotal)}</strong></span><span>Tax<strong>{formatCurrency(totals.tax)}</strong></span><span>Discount<strong>− {formatCurrency(form.discountAmount)}</strong></span><span className="grand-total">Invoice total<strong>{formatCurrency(totals.total)}</strong></span></div></div>
      </section>
      <div className="form-actions"><Link className="button secondary" to={isEditing ? `/invoices/${id}` : "/invoices"}>Cancel</Link><button className="button primary" disabled={submitting}>{submitting ? "Saving invoice…" : isEditing ? "Save invoice" : "Create invoice"}</button></div>
    </form></>;
}

export default InvoiceFormPage;
