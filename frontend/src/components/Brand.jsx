import { Link } from 'react-router-dom';

export default function Brand({ compact = false, light = false }) {
  return <Link className={`brand${light ? ' brand-light' : ''}`} to={compact ? '/app' : '/'} aria-label="Brightloop home">
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
    {!compact && <span>brightloop</span>}
  </Link>;
}
