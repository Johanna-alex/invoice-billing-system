import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import StatusBadge from "../components/StatusBadge";
import { ErrorState, LoadingState } from "../components/PageState";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format";

function InvoiceDetailPage() {
  const { id } = useParams(); const { user, apiFetch } = useAuth(); const isManager = ["Admin", "Accountant"].includes(user.role);
  const [details, setDetails] = useState(null); const [error, setError] = useState("");
  const [payment, setPayment] = useState({ amount: "", paymentMethod: "UPI", paymentDate: "", referenceNumber: "", notes: "" }); const [submitting, setSubmitting] = useState(false);

  const loadInvoice = useCallback(async () => { await Promise.resolve(); setError(""); try { setDetails(await apiFetch(`/invoices/${id}`)); } catch (requestError) { setError(getErrorMessage(requestError)); } }, [apiFetch, id]);
  useEffect(() => {
    const timeout = setTimeout(loadInvoice, 0);
    return () => clearTimeout(timeout);
  }, [loadInvoice]);

  const recordPayment = async (event) => { event.preventDefault(); const amount = Number(payment.amount); if (amount <= 0 || amount > details.invoice.balanceAmount) { setError("Payment must be greater than 0 and cannot exceed the remaining balance"); return; } setSubmitting(true); setError(""); try { await apiFetch("/payments", { method: "POST", body: JSON.stringify({ ...payment, invoice: id, amount }) }); setPayment({ ...payment, amount: "", referenceNumber: "", notes: "" }); await loadInvoice(); } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setSubmitting(false); } };
  const deletePayment = async (paymentId) => { if (!window.confirm("Delete this payment? The invoice balance will be recalculated.")) return; try { await apiFetch(`/payments/${paymentId}`, { method: "DELETE" }); loadInvoice(); } catch (requestError) { setError(getErrorMessage(requestError)); } };

  if (!details && !error) return <LoadingState label="Loading invoice…" />;
  if (!details) return <ErrorState message={error} onRetry={loadInvoice} />;
  const { invoice, lines, payments } = details;

  return <><div className="page-header"><div><span className="eyebrow">Invoice detail</span><div className="title-with-status"><h1>{invoice.invoiceNumber}</h1><StatusBadge status={invoice.status} /></div><p>Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}</p></div><div className="header-actions"><Link className="button secondary" to="/invoices">← Back</Link>{isManager && <Link className="button primary" to={`/invoices/${id}/edit`}>Edit invoice</Link>}</div></div>
    {error && <div className="alert error">{error}</div>}
    <section className="invoice-overview"><article className="panel customer-card"><span className="eyebrow">Bill to</span><h2>{invoice.customer?.name || "Customer unavailable"}</h2><p>{invoice.customer?.email}</p><p>{invoice.customer?.phone}</p><p>{invoice.customer?.address}</p></article><article className="panel balance-card"><div><span>Total amount</span><strong>{formatCurrency(invoice.totalAmount)}</strong></div><div><span>Amount paid</span><strong className="success-text">{formatCurrency(invoice.paidAmount)}</strong></div><div className="balance-due"><span>Balance due</span><strong>{formatCurrency(invoice.balanceAmount)}</strong></div></article></section>
    <section className="panel"><div className="panel-header"><div><h2>Invoice items</h2><p>{lines.length} line item{lines.length === 1 ? "" : "s"}</p></div></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Tax</th><th className="align-right">Line total</th></tr></thead><tbody>{lines.map((line) => <tr key={line._id}><td><strong>{line.item?.name || "Deleted item"}</strong><small className="block muted">{line.item?.description}</small></td><td>{line.quantity}</td><td>{formatCurrency(line.unitPrice)}</td><td>{line.taxRate}%</td><td className="align-right strong">{formatCurrency(line.lineTotal)}</td></tr>)}</tbody></table></div><div className="detail-totals"><span>Subtotal<strong>{formatCurrency(invoice.subtotal)}</strong></span><span>Tax<strong>{formatCurrency(invoice.taxAmount)}</strong></span><span>Discount<strong>− {formatCurrency(invoice.discountAmount)}</strong></span><span className="grand-total">Total<strong>{formatCurrency(invoice.totalAmount)}</strong></span></div></section>
    <section className={`detail-grid ${isManager && invoice.balanceAmount > 0 ? "with-form" : ""}`}><article className="panel"><div className="panel-header"><div><h2>Payment history</h2><p>Payments recorded against this invoice.</p></div></div>{payments.length ? <div className="payment-list">{payments.map((entry) => <div className="payment-row" key={entry._id}><span className="summary-icon green">₹</span><div><strong>{formatCurrency(entry.amount)}</strong><small>{entry.paymentMethod} · {formatDate(entry.paymentDate)}{entry.referenceNumber ? ` · ${entry.referenceNumber}` : ""}</small></div>{isManager && <button className="button danger-text small" onClick={() => deletePayment(entry._id)}>Delete</button>}</div>)}</div> : <div className="empty-inline">No payments recorded yet.</div>}</article>
      {isManager && invoice.balanceAmount > 0 && <form className="panel payment-form" onSubmit={recordPayment}><div><h2>Record payment</h2><p>Maximum available: {formatCurrency(invoice.balanceAmount)}</p></div><label>Amount (₹)<input type="number" min="0.01" max={invoice.balanceAmount} step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required /></label><div className="form-grid two"><label>Method<select value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}><option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option></select></label><label>Date<input type="date" value={payment.paymentDate} onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })} required /></label></div><label>Reference <span className="optional">Optional</span><input value={payment.referenceNumber} onChange={(e) => setPayment({ ...payment, referenceNumber: e.target.value })} /></label><label>Notes <span className="optional">Optional</span><textarea rows="2" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label><button className="button primary full" disabled={submitting}>{submitting ? "Recording…" : "Record payment"}</button></form>}
    </section></>;
}

export default InvoiceDetailPage;
