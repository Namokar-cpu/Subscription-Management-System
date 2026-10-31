import { useState } from 'react';
import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const navItems = [['Features', '#features'], ['How it works', '#how-it-works'], ['Integrations', '#integrations'], ['Pricing', '#pricing']];

export default function MarketingLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return <>
    <header className="site-header">
      <div className="nav-wrap page-container">
        <Brand />
        <button className="icon-button menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
        <nav className={`main-nav${open ? ' is-open' : ''}`} aria-label="Main navigation">
          {navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <div className="nav-actions"><ThemeToggle/><Link className="button button-quiet button-small" to={user ? '/app' : '/login'}>{user ? 'Workspace' : 'Log in'}</Link><Link className="button button-primary button-small" to={user ? '/app' : '/register'}>{user ? 'My account' : 'Get started'} <Icon name="arrow" size={15} /></Link></div>
        </nav>
      </div>
    </header>
    {children}
    <footer className="site-footer" id="legal">
      <div className="page-container footer-main">
        <div className="footer-brand"><Brand /><p>Subscription management made simpler, clearer, and more organized.</p></div>
        <div className="footer-column"><strong>Product</strong><a href="#features">Features</a><a href="#integrations">Integrations</a><a href="#pricing">Pricing</a></div>
        <div className="footer-column"><strong>Resources</strong><a href="#how-it-works">How it works</a><a href="#contact">Help &amp; support</a></div>
        <div className="footer-column"><strong>Legal</strong><a href="#legal-note">Privacy &amp; terms</a><span className="draft-note">Policies are being prepared.</span></div>
      </div>
      <div className="footer-bottom page-container"><span>© {new Date().getFullYear()} Brightloop. All rights reserved.</span><span id="legal-note">Privacy and terms pages are not published yet.</span></div>
    </footer>
  </>;
}
