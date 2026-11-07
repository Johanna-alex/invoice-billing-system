import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const managerLinks = [
  { to: "/customers", label: "Customers", icon: "CU" },
  { to: "/items", label: "Items", icon: "IT" }
];

const sharedLinks = [
  { to: "/dashboard", label: "Overview", icon: "OV" },
  { to: "/invoices", label: "Invoices", icon: "IN" },
  { to: "/payments", label: "Payments", icon: "PA" }
];

function DashboardLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isManager = ["Admin", "Accountant"].includes(user.role);
  const links = isManager
    ? [sharedLinks[0], ...managerLinks, ...sharedLinks.slice(1)]
    : sharedLinks;

  return (
    <div className="app-shell">
      {menuOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">B</span>
          <div><strong>Billora</strong><small>Invoice workspace</small></div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-heading">Workspace</span>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-icon">{link.icon}</span>{link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-profile">
          <span className="avatar">{user.name?.charAt(0).toUpperCase()}</span>
          <div className="profile-copy"><strong>{user.name}</strong><small>{user.role}</small></div>
          <button className="icon-button" onClick={logout} title="Log out" aria-label="Log out">↗</button>
        </div>
      </aside>

      <div className="main-column">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">☰</button>
          <div className="brand compact"><span className="brand-mark">B</span><strong>Billora</strong></div>
          <span className="avatar small">{user.name?.charAt(0).toUpperCase()}</span>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}

export default DashboardLayout;
