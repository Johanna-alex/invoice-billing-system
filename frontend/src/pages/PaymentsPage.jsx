import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildQuery } from "../api/api";
import { useAuth } from "../context/useAuth";
import Pagination from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/PageState";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format";

function PaymentsPage() {
  const { apiFetch } = useAuth(); const [payments, setPayments] = useState([]); const [pagination, setPagination] = useState(null); const [page, setPage] = useState(1); const [method, setMethod] = useState(""); const [searchInput, setSearchInput] = useState(""); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const loadPayments = useCallback(async () => { await Promise.resolve(); setLoading(true); setError(""); try { const data = await apiFetch(`/payments${buildQuery({ page, limit: 10, paymentMethod: method, search })}`); setPayments(data.payments); setPagination(data.pagination); } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setLoading(false); } }, [apiFetch, page, method, search]);
  useEffect(() => {
    const timeout = setTimeout(loadPayments, 0);
    return () => clearTimeout(timeout);
  }, [loadPayments]);

  return <><div className="page-header"><div><span className="eyebrow">Collections</span><h1>Payments</h1><p>Review payment activity across your invoices.</p></div></div><section className="panel"><form className="toolbar invoice-toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}><div className="search-box"><span>⌕</span><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search reference or notes…" /></div><select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}><option value="">All methods</option><option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option></select><button className="button secondary">Search</button></form>{loading ? <LoadingState label="Loading payments…" /> : error ? <ErrorState message={error} onRetry={loadPayments} /> : payments.length ? <><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Method</th><th>Reference</th><th>Notes</th><th className="align-right">Amount</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment._id}><td>{payment.invoice ? <Link className="table-link" to={`/invoices/${payment.invoice._id}`}>{payment.invoice.invoiceNumber}</Link> : "Deleted invoice"}</td><td>{formatDate(payment.paymentDate)}</td><td><span className="tag">{payment.paymentMethod}</span></td><td>{payment.referenceNumber || "—"}</td><td>{payment.notes || "—"}</td><td className="align-right strong success-text">{formatCurrency(payment.amount)}</td></tr>)}</tbody></table></div><Pagination pagination={pagination} onPageChange={setPage} /></> : <EmptyState title="No payments found" message={search || method ? "Try changing the payment filters." : "Payments recorded against invoices will appear here."} />}</section></>;
}

export default PaymentsPage;
