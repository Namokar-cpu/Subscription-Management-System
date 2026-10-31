import { Link } from 'react-router-dom';
import MarketingLayout from '../components/MarketingLayout.jsx';
import Icon from '../components/Icon.jsx';

const platformNames = ['Netflix', 'Spotify', 'Adobe', 'Microsoft 365', 'Slack', 'Other platforms'];
const featureCards = [
  { icon: 'box', title: 'Subscription tracking', text: 'Keep every subscription organized and visible.' },
  { icon: 'card', title: 'Smart billing', text: 'Manage recurring billing details in one place.' },
  { icon: 'users', title: 'Renewal management', text: 'Stay ahead of upcoming renewals and changes.' },
  { icon: 'chart', title: 'Revenue analytics', text: 'Understand revenue trends with useful insights.' },
];
const integrations = ['Stripe', 'Chargebee', 'Salesforce', 'HubSpot', 'QuickBooks', 'Other tools'];

function ProductPreview() {
  return <div className="preview-window" aria-label="Illustrative Brightloop dashboard preview">
    <div className="preview-top"><div className="preview-brand"><span className="brand-mark"><i /><i /><i /><i /></span> brightloop</div><span className="preview-pill"><i /> Workspace preview</span><span className="preview-user">AM</span></div>
    <div className="preview-body"><div className="preview-side"><span className="preview-side-active" /><span /><span /><span /><span /></div>
      <div className="preview-content"><div className="preview-title"><div><small>MONDAY, 31 OCTOBER</small><strong>Good morning, Aarav</strong></div><span className="preview-filter">Last 30 days⌄</span></div>
        <div className="preview-metrics"><div><small>MONTHLY RECURRING REVENUE</small><strong>₹125,420</strong><span className="metric-up">↗ 8.2%</span></div><div><small>ACTIVE SUBSCRIPTIONS</small><strong>1,248</strong><span>Across all plans</span></div><div><small>ACTIVE CUSTOMERS</small><strong>642</strong><span>In your workspace</span></div></div>
        <div className="preview-panels"><div className="preview-chart"><div><strong>Revenue overview</strong><small>Illustrative preview data</small></div><svg viewBox="0 0 400 120" role="img" aria-label="Decorative illustrative revenue trend"><defs><linearGradient id="goldFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f5b942" stopOpacity=".22"/><stop offset="1" stopColor="#f5b942" stopOpacity="0"/></linearGradient></defs><path d="M0 95 C35 80 43 90 75 65 S123 75 150 52 S196 60 224 39 S268 55 292 31 S340 44 365 18 S390 30 400 12 V120 H0Z" fill="url(#goldFill)"/><path d="M0 95 C35 80 43 90 75 65 S123 75 150 52 S196 60 224 39 S268 55 292 31 S340 44 365 18 S390 30 400 12" fill="none" stroke="#f5b942" strokeWidth="3"/></svg></div>
          <div className="preview-activity"><strong>Recent activity</strong><small><span className="activity-dot green"/>Payment received <b>₹1,499</b></small><small><span className="activity-dot amber"/>Renewal upcoming <b>In 3 days</b></small><small><span className="activity-dot blue"/>New customer <b>Just now</b></small></div></div>
      </div>
    </div>
  </div>;
}

export default function LandingPage() {
  return <MarketingLayout>
    <main>
      <section className="hero-section"><div className="page-container hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> SUBSCRIPTION MANAGEMENT, SIMPLIFIED</div><h1>Too many subscriptions.<br /><span>One brilliant solution.</span></h1><p>Manage subscriptions, recurring payments, invoices, and renewals in one clear workspace.</p><div className="hero-actions"><Link className="button button-primary button-large" to="/register">Get started <Icon name="arrow" size={17} /></Link><a className="button button-outline button-large" href="#features">Explore features</a></div><div className="trust-line"><span><Icon name="check" size={14} /></span>Clear billing. Confident decisions.</div></div>
        <div className="ecosystem" aria-label="Illustration of services in one workspace"><div className="ecosystem-glow"/><div className="ecosystem-ring ring-one"/><div className="ecosystem-ring ring-two"/><div className="ecosystem-center"><span className="brand-mark"><i /><i /><i /><i /></span><strong>One clear<br />workspace</strong></div><div className="ecosystem-tile tile-netflix"><i className="tile-dot red"/>Netflix</div><div className="ecosystem-tile tile-spotify"><i className="tile-dot green"/>Spotify</div><div className="ecosystem-tile tile-youtube"><i className="tile-dot red"/>YouTube Premium</div><div className="ecosystem-tile tile-adobe"><i className="tile-dot red"/>Adobe</div><div className="ecosystem-tile tile-microsoft"><i className="tile-dot blue"/>Microsoft 365</div><span className="tile-caption">Illustrative examples only · not live integrations</span></div>
      </div></section>
      <section className="platform-strip"><div className="page-container"><p>Bring your subscription ecosystem together.</p><div className="platform-list">{platformNames.map((name, i) => <div className="platform-name" key={name}><span className={`platform-symbol symbol-${i}`} />{name}</div>)}</div></div></section>
      <section className="preview-section section-space"><div className="page-container"><div className="section-heading"><span className="section-kicker">ONE CLEAR WORKSPACE</span><h2>Everything you need, in one dashboard.</h2><p>A considered view of subscriptions, billing, and the details that keep your business moving.</p></div><ProductPreview /></div></section>
      <section className="features-section section-space" id="features"><div className="page-container"><div className="section-heading"><span className="section-kicker">BUILT FOR CLARITY AND CONTROL</span><h2>Less scattered. More in sync.</h2></div><div className="feature-grid">{featureCards.map((item, i) => <article className="feature-card" key={item.title}><div className="feature-icon"><Icon name={item.icon}/></div><span className="feature-number">0{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>
      <section className="steps-section section-space" id="how-it-works"><div className="page-container"><div className="section-heading"><span className="section-kicker">A SIMPLER WAY TO MANAGE SUBSCRIPTIONS</span><h2>Start clear. Stay in control.</h2></div><div className="steps-grid">{[['01','Choose your plan','Explore the plans available to your account.'],['02','Manage in one place','Keep your subscription and invoices together.'],['03','Make informed decisions','Use a clearer view to decide what comes next.']].map(([n,title,text],i) => <article className="step-card" key={n}><div className="step-num">{n}<span>{i < 2 && <Icon name="arrow" size={16}/>}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="integrations-section section-space" id="integrations"><div className="page-container integrations-grid"><div><span className="section-kicker">INTEGRATIONS</span><h2>Everything connected.<br />Nothing scattered.</h2><p>Explore the tools teams often bring into their subscription workflow. These are examples, not active connections in this project.</p><a className="button button-outline" href="#pricing">Explore Brightloop <Icon name="arrow" size={16}/></a></div><div className="integration-grid">{integrations.map((name, i) => <div className="integration-card" key={name}><span className={`integration-mark mark-${i}`}>{name.slice(0,1)}</span><strong>{name}</strong><small>Example · not connected</small></div>)}</div></div></section>
      <section className="final-cta section-space" id="pricing"><div className="page-container cta-panel"><span className="cta-orbit orbit-a"/><span className="cta-orbit orbit-b"/><div className="cta-content"><span className="section-kicker">BRING IT TOGETHER</span><h2>Ready to bring everything together?</h2><p>Make subscription management simpler, clearer, and more organized.</p><Link className="button button-primary button-large" to="/register">Get started <Icon name="arrow" size={17}/></Link><small>View live plans after creating your account.</small></div></div></section>
      <section className="contact-anchor" id="contact"><div className="page-container"><span>Need help getting started?</span><Link to="/login">Sign in to your Brightloop account <Icon name="arrow" size={15}/></Link></div></section>
    </main>
  </MarketingLayout>;
}
