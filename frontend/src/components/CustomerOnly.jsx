import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';

export default function CustomerOnly({ children }) {
  const { user } = useAuth();
  if (user?.role === 'CUSTOMER') return children;
  return <div className="admin-notice"><div className="admin-notice-icon"><Icon name="lock"/></div><div><span className="section-kicker">CUSTOMER BILLING WORKSPACE</span><h2>This account is an administrator.</h2><p>The current backend supports customer self-service billing. Admin reporting and management screens need dedicated API endpoints before they can show live data here.</p><Link className="button button-outline" to="/">Return to Brightloop home</Link></div></div>;
}
