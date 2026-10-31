import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role === 'ADMIN' || user?.role === 'STAFF') return children;
  return <div className="admin-notice"><div className="admin-notice-icon"><Icon name="lock"/></div><div><span className="section-kicker">ADMIN WORKSPACE</span><h2>This page is for your business team.</h2><p>Sign in with an administrator or staff account to manage business records.</p></div></div>;
}
