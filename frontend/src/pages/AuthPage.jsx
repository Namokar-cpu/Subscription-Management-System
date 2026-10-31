import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState } from '../components/States.jsx';
import { registerRequest, resendVerificationRequest } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', companyName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (user) return <Navigate to="/app" replace />;

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        const result = await registerRequest({
          name: form.name,
          ...(form.companyName.trim() ? { companyName: form.companyName.trim() } : {}),
          email: form.email.trim(),
          password: form.password,
        });
        setRegisteredEmail(form.email.trim());
        setSent(true);
        return result;
      }
      await signIn({ email: form.email.trim(), password: form.password });
      navigate(location.state?.from || '/app', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResendBusy(true);
    setError('');
    try { await resendVerificationRequest(registeredEmail); setError('A new verification link has been requested. Check your inbox.'); }
    catch (requestError) { setError(requestError.message); }
    finally { setResendBusy(false); }
  };

  if (sent) return <main className="auth-shell"><div className="auth-card success-card"><Brand /><div className="success-icon"><Icon name="check" size={28}/></div><span className="section-kicker">ONE LAST STEP</span><h1>Check your inbox.</h1><p>We sent a verification link to <strong>{registeredEmail}</strong>. Verify your address, then sign in to choose a plan.</p>{error && <ErrorState error={error}/>}<button className="button button-outline auth-submit" disabled={resendBusy} onClick={resend}>{resendBusy ? 'Sending…' : 'Send a new verification link'}</button><Link className="auth-back" to="/login">Back to sign in</Link></div></main>;

  const tokenFromLink = searchParams.get('token');
  return <main className="auth-shell"><div className="auth-card"><Brand /><Link className="auth-back top-back" to="/">← Back to home</Link><span className="section-kicker">{isRegister ? 'START YOUR BRIGHTLOOP ACCOUNT' : 'WELCOME BACK'}</span><h1>{isRegister ? 'A clearer way to manage.' : 'Good to see you again.'}</h1><p className="auth-subtitle">{isRegister ? 'Create your account and bring billing into focus.' : 'Sign in to view your plans and billing.'}</p>{tokenFromLink && <div className="notice notice-info">Open the verification link from the email to activate your account, then sign in here.</div>}{error && <ErrorState error={error}/>}<form className="auth-form" onSubmit={submit}>
    {isRegister && <><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" value={form.name} onChange={change} required maxLength={160} placeholder="Your name"/><label htmlFor="companyName">Company <span>(optional)</span></label><input id="companyName" name="companyName" autoComplete="organization" value={form.companyName} onChange={change} maxLength={160} placeholder="Your company"/></>}
    <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required maxLength={254} placeholder="you@company.com"/>
    <label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={change} required minLength={isRegister ? 9 : 1} maxLength={128} placeholder={isRegister ? 'At least 9 characters' : 'Enter your password'}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
    {isRegister && <small className="field-hint">Use 9+ characters with uppercase, lowercase, and a special character.</small>}
    <button className="button button-primary button-large auth-submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <Icon name="arrow" size={17}/></button>
  </form><p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Brightloop?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p><p className="auth-privacy"><Icon name="lock" size={14}/> Your account is protected by Brightloop authentication.</p></div><div className="auth-aside"><div className="auth-aside-inner"><div className="auth-orbit"/><span className="section-kicker">LESS SCATTERED. MORE IN SYNC.</span><h2>Everything billing,<br/>in one clear view.</h2><p>Subscriptions, invoices, and payments connected to the account you control.</p><div className="auth-aside-tags"><span>Subscriptions</span><span>Invoices</span><span>Payments</span></div></div></div></main>;
}
