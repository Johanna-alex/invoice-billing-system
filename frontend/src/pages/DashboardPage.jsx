import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllPages } from "../api/api";
import { useAuth } from "../context/useAuth";
import StatusBadge from "../components/StatusBadge";
import { ErrorState, LoadingState } from "../components/PageState";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format";

function DashboardPage() {
  const { user, apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const isManager = ["Admin", "Accountant"].includes(user.role);

  const loadDashboard = useCallback(async () => {
    await Promise.resolve();
    setError("");
    setData(null);
    try {
      const [invoiceResult, customerResult] = await Promise.all([
        fetchAllPages(apiFetch, "/invoices", "invoices"),
        fetchAllPages(apiFetch, "/customers", "customers")
      ]);
      const invoices = invoiceResult.records;
      setData({
        invoices,
        totalInvoices: invoiceResult.total,
        totalCustomers: customerResult.total,
        revenue: invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0),
        outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balanceAmount || 0), 0)
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [apiFetch]);

  useEffect(() => {
    const timeout = setTimeout(loadDashboard, 0);
    return () => clearTimeout(timeout);
  }, [loadDashboard]);

  if (!data && !error) return <LoadingState label="Preparing your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  const recentInvoices = data.invoices.slice(0, 5);

  return (
    <>
      <div className="page-header dashboard-heading">
        <div><span className="eyebrow">Overview</span><h1>Good to see you, {user.name?.split(" ")[0]}</h1><p>Here is the latest picture of your billing activity.</p></div>
        {isManager && <Link className="button primary" to="/invoices/new">+ New invoice</Link>}
      </div>

      <section className="summary-grid">
        <article className="summary-card"><span className="summary-icon violet">IN</span><div><p>Total invoices</p><strong>{data.totalInvoices}</strong><small>All recorded invoices</small></div></article>
        <article className="summary-card"><span className="summary-icon blue">CU</span><div><p>{isManager ? "Total customers" : "Customer profiles"}</p><strong>{data.totalCustomers}</strong><small>Linked customer records</small></div></article>
        <article className="summary-card"><span className="summary-icon green">₹</span><div><p>Revenue collected</p><strong>{formatCurrency(data.revenue)}</strong><small>Paid across invoices</small></div></article>
        <article className="summary-card"><span className="summary-icon amber">BL</span><div><p>Outstanding balance</p><strong>{formatCurrency(data.outstanding)}</strong><small>Still awaiting payment</small></div></article>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Recent invoices</h2><p>Your newest billing records</p></div><Link to="/invoices" className="text-link">View all →</Link></div>
        {recentInvoices.length ? (
          <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Status</th><th className="align-right">Amount</th></tr></thead>
          <tbody>{recentInvoices.map((invoice) => <tr key={invoice._id}><td><Link className="table-link" to={`/invoices/${invoice._id}`}>{invoice.invoiceNumber}</Link></td><td>{invoice.customer?.name || "Customer unavailable"}</td><td>{formatDate(invoice.dueDate)}</td><td><StatusBadge status={invoice.status} /></td><td className="align-right strong">{formatCurrency(invoice.totalAmount)}</td></tr>)}</tbody></table></div>
        ) : <div className="empty-inline">No invoices yet. {isManager && "Create your first invoice to get started."}</div>}
      </section>
    </>
  );
}

export default DashboardPage;
