const brandMarks = {
  Netflix: ['netflix', 'E50914'],
  Spotify: ['spotify', '1DB954'],
  'YouTube Premium': ['youtube', 'FF0000'],
  Adobe: ['adobe', 'FF0000'],
  'Microsoft 365': ['microsoft', '5E5E5E'],
  Slack: ['slack', 'E01E5A'],
  Stripe: ['stripe', '635BFF'],
  Chargebee: ['chargebee', 'FF7846'],
  Salesforce: ['salesforce', '00A1E0'],
  HubSpot: ['hubspot', 'FF7A59'],
  QuickBooks: ['quickbooks', '2CA01C'],
};

export default function BrandLogo({ name, className = '' }) {
  const mark = brandMarks[name];
  if (!mark) return null;
  const [slug, color] = mark;
  const classes = `brand-logo ${className}`.trim();
  if (name === 'Microsoft 365') return <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>;
  if (name === 'Adobe') return <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#E2231A" d="M0 0h24L16.8 24 12 10.6 7.2 24 0 0Z"/><path fill="#fff" d="M12 15.1 9.7 21h4.6L12 15.1Z"/></svg>;
  if (name === 'Slack') return <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="rotate(-18 12 12)" strokeWidth="3.2" strokeLinecap="round"><path stroke="#36C5F0" d="M6 3v7M6 14v7M3 6h7M14 6h7"/><path stroke="#2EB67D" d="M18 3v7M18 14v7M3 18h7M14 18h7"/><path stroke="#ECB22E" d="M10 3v7M10 14v7M3 10h7M14 10h7"/><path stroke="#E01E5A" d="M14 3v7M14 14v7M3 14h7M14 14h7"/></g></svg>;
  return <img
    className={classes}
    src={`https://cdn.simpleicons.org/${slug}/${color}`}
    alt=""
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    onError={(event) => { event.currentTarget.hidden = true; }}
  />;
}
