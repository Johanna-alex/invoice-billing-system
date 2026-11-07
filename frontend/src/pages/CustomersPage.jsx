import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildQuery } from "../api/api";
import { useAuth } from "../context/useAuth";
import Pagination from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/PageState";
import { getErrorMessage } from "../utils/format";

function CustomersPage() {
  const { apiFetch } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    await Promise.resolve();
    setLoading(true); setError("");
    try {
      const data = await apiFetch(`/customers${buildQuery({ page, limit: 10, search })}`);
      setCustomers(data.customers); setPagination(data.pagination);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  }, [apiFetch, page, search]);

  useEffect(() => {
    const timeout = setTimeout(loadCustomers, 0);
    return () => clearTimeout(timeout);
  }, [loadCustomers]);

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    try { await apiFetch(`/customers/${customer._id}`, { method: "DELETE" }); loadCustomers(); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  };

  return (
    <>
      <div className="page-header"><div><span className="eyebrow">Directory</span><h1>Customers</h1><p>Manage customer details and account links.</p></div><Link className="button primary" to="/customers/new">+ Add customer</Link></div>
      <section className="panel">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
          <div className="search-box"><span>⌕</span><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name, email, phone…" /></div>
          <button className="button secondary" type="submit">Search</button>
        </form>
        {loading ? <LoadingState label="Loading customers…" /> : error ? <ErrorState message={error} onRetry={loadCustomers} /> : customers.length ? (
          <><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Account link</th><th className="align-right">Actions</th></tr></thead><tbody>
            {customers.map((customer) => <tr key={customer._id}><td><div className="person-cell"><span className="avatar small">{customer.name.charAt(0).toUpperCase()}</span><div><strong>{customer.name}</strong><small>{customer.email}</small></div></div></td><td>{customer.phone || "—"}</td><td>{customer.address || "—"}</td><td>{customer.user ? <span className="tag">Linked</span> : <span className="muted">Not linked</span>}</td><td className="align-right actions"><Link className="button ghost small" to={`/customers/${customer._id}/edit`}>Edit</Link><button className="button danger-text small" onClick={() => handleDelete(customer)}>Delete</button></td></tr>)}
          </tbody></table></div><Pagination pagination={pagination} onPageChange={setPage} /></>
        ) : <EmptyState title="No customers found" message={search ? "Try a different search term." : "Add your first customer to begin invoicing."} />}
      </section>
    </>
  );
}

export default CustomersPage;
