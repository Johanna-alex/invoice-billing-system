import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildQuery } from "../api/api";
import { useAuth } from "../context/useAuth";
import Pagination from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/PageState";
import { formatCurrency, getErrorMessage } from "../utils/format";

function ItemsPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState([]); const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1); const [searchInput, setSearchInput] = useState(""); const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    await Promise.resolve();
    setLoading(true); setError("");
    try { const data = await apiFetch(`/items${buildQuery({ page, limit: 10, search })}`); setItems(data.items); setPagination(data.pagination); }
    catch (requestError) { setError(getErrorMessage(requestError)); } finally { setLoading(false); }
  }, [apiFetch, page, search]);
  useEffect(() => {
    const timeout = setTimeout(loadItems, 0);
    return () => clearTimeout(timeout);
  }, [loadItems]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try { await apiFetch(`/items/${item._id}`, { method: "DELETE" }); loadItems(); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  };

  return <><div className="page-header"><div><span className="eyebrow">Catalog</span><h1>Items & services</h1><p>Maintain the products and rates used in invoices.</p></div><Link className="button primary" to="/items/new">+ Add item</Link></div>
    <section className="panel"><form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}><div className="search-box"><span>⌕</span><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search items and descriptions…" /></div><button className="button secondary">Search</button></form>
    {loading ? <LoadingState label="Loading items…" /> : error ? <ErrorState message={error} onRetry={loadItems} /> : items.length ? <><div className="table-wrap"><table><thead><tr><th>Item</th><th>Price</th><th>Tax rate</th><th>Status</th><th className="align-right">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><strong>{item.name}</strong><small className="block muted">{item.description || "No description"}</small></td><td className="strong">{formatCurrency(item.price)}</td><td>{item.taxRate}%</td><td><span className={`tag ${item.isActive ? "active" : "inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span></td><td className="align-right actions"><Link className="button ghost small" to={`/items/${item._id}/edit`}>Edit</Link><button className="button danger-text small" onClick={() => handleDelete(item)}>Delete</button></td></tr>)}</tbody></table></div><Pagination pagination={pagination} onPageChange={setPage} /></> : <EmptyState title="No items found" message={search ? "Try another search." : "Add your first billable item or service."} />}</section></>;
}

export default ItemsPage;
