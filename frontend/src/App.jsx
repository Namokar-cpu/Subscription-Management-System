import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import WorkspaceLayout from './components/WorkspaceLayout.jsx';
import AdminResourcePage from './pages/AdminResourcePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import IntegrationsPage from './pages/IntegrationsPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import PlansPage from './pages/PlansPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';

export default function App() {
  return <Routes>
    <Route path="/" element={<LandingPage/>}/>
    <Route path="/login" element={<AuthPage/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route path="/app" element={<WorkspaceLayout/>}>
        <Route index element={<OverviewPage/>}/>
        <Route path="customers" element={<AdminResourcePage resource="customers"/>}/>
        <Route path="products" element={<AdminResourcePage resource="products"/>}/>
        <Route path="plans" element={<RolePage customer={<PlansPage/>} admin={<AdminResourcePage resource="plans"/>}/>}/>
        <Route path="subscriptions" element={<RolePage customer={<SubscriptionsPage/>} admin={<AdminResourcePage resource="subscriptions"/>}/>}/>
        <Route path="invoices" element={<RolePage customer={<InvoicesPage/>} admin={<AdminResourcePage resource="invoices"/>}/>}/>
        <Route path="payments" element={<AdminResourcePage resource="payments"/>}/>
        <Route path="analytics" element={<AnalyticsPage/>}/>
        <Route path="integrations" element={<IntegrationsPage/>}/>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}

function RolePage({ customer, admin }) {
  const { user } = useAuth();
  return user?.role === 'ADMIN' || user?.role === 'STAFF' ? admin : customer;
}
