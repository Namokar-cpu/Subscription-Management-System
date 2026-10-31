import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const customerItems = [
  { to: '/app', label: 'Overview', icon: 'grid', end: true },
  { to: '/app/plans', label: 'Products & plans', icon: 'box' },
  { to: '/app/subscriptions', label: 'Subscriptions', icon: 'users' },
  { to: '/app/invoices', label: 'Invoices', icon: 'receipt' },
];
const adminItems = [
  { to: '/app', label: 'Overview', icon: 'grid', end: true },
  { to: '/app/customers', label: 'Customers', icon: 'users' },
  { to: '/app/products', label: 'Products', icon: 'box' },
  { to: '/app/plans', label: 'Products & plans', icon: 'spark' },
  { to: '/app/subscriptions', label: 'Subscriptions', icon: 'users' },
  { to: '/app/invoices', label: 'Invoices', icon: 'receipt' },
  { to: '/app/payments', label: 'Payments', icon: 'card' },
  { to: '/app/analytics', label: 'Analytics', icon: 'chart' },
  { to: '/app/integrations', label: 'Integrations', icon: 'spark' },
];

export default function WorkspaceLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const items = user?.role === 'ADMIN' || user?.role === 'STAFF' ? adminItems : customerItems;
  const logOut = () => { signOut(); navigate('/'); };
  return <div className="workspace-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand /></div>
      <span className="sidebar-label">WORKSPACE</span>
      <nav className="sidebar-nav" aria-label="Workspace">
        {items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}><Icon name={item.icon} size={18} /><span>{item.label}</span></NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="profile-chip"><span className="avatar">{(user?.email || 'B').slice(0, 1).toUpperCase()}</span><span className="profile-copy"><strong>{user?.email}</strong><small>{user?.role === 'ADMIN' ? 'Administrator' : 'Customer account'}</small></span></div>
        <button className="sidebar-link logout-link" onClick={logOut}><Icon name="logout" size={18} /><span>Sign out</span></button>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar"><div><span className="status-dot" /> Secure Brightloop workspace</div><span className="topbar-email">{user?.email}</span><ThemeToggle/></header>
      <main className="workspace-content"><Outlet /></main>
    </div>
  </div>;
}
