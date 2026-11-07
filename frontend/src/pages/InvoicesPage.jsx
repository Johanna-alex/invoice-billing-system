import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildQuery } from "../api/api";
import { useAuth } from "../context/useAuth";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/PageState";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format";

function InvoicesPage() {
  const { user, apiFetch } = useAuth();
  const isManager = ["Admin", "Accountant"].includes(user.role);
  const [invoices, setInvoices] = useState([]); const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1); const [searchInput, setSearchInput] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const loadInvoices = useCallback(async () => {
    await Promise.resolve();
    setLoading(true); setError("");
    try { const data = await apiFetch(`/invoices${buildQuery({ page, limit: 10, search, status })}`); setInvoices(data.invoices); setPagination(data.pagination); }
    catch (requestError) { setError(getErrorMessage(requestError)); } finally { setLoading(false); }
  }, [apiFetch, page, search, status]);
  useEffect(() => {
    const timeout = setTimeout(loadInvoices, 0);
    return () => clearTimeout(timeout);
  }, [loadInvoices]);

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber} and its payments?`)) return;
    try { await apiFetch(`/invoices/${invoice._id}`, { method: "DELETE" }); loadInvoices(); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  };

  return <><div className="page-header"><div><span className="eyebrow">Billing</span><h1>Invoices</h1><p>{isManager ? "Create, track and collect every invoice." : "Review your invoices, balances and payment status."}</p></div>{isManager && <Link className="button primary" to="/invoices/new">+ New invoice</Link>}</div>
    <section className="panel"><form className="toolbar invoice-toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}><div className="search-box"><span>⌕</span><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search invoice or customer…" /></div><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option>Unpaid</option><option>Partially Paid</option><option>Paid</option><option>Overdue</option><option>Draft</option></select><button className="button secondary">Search</button></form>
    {loading ? <LoadingState label="Loading invoices…" /> : error ? <ErrorState message={error} onRetry={loadInvoices} /> : invoices.length ? <><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th>Status</th><th className="align-right">Balance</th>{isManager && <th className="align-right">Actions</th>}</tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice._id}><td><Link className="table-link" to={`/invoices/${invoice._id}`}>{invoice.invoiceNumber}</Link><small className="block muted">{formatCurrency(invoice.totalAmount)} total</small></td><td>{invoice.customer?.name || "Customer unavailable"}</td><td>{formatDate(invoice.issueDate)}</td><td>{formatDate(invoice.dueDate)}</td><td><StatusBadge status={invoice.status} /></td><td className="align-right strong">{formatCurrency(invoice.balanceAmount)}</td>{isManager && <td className="align-right actions"><Link className="button ghost small" to={`/invoices/${invoice._id}/edit`}>Edit</Link><button className="button danger-text small" onClick={() => handleDelete(invoice)}>Delete</button></td>}</tr>)}</tbody></table></div><Pagination pagination={pagination} onPageChange={setPage} /></> : <EmptyState title="No invoices found" message={search || status ? "Clear or change the filters to see more results." : isManager ? "Create your first invoice to start tracking billing." : "No invoices are linked to your customer account."} />}</section></>;
}

export default InvoicesPage;
