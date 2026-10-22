import { Routes, Route } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import StatusLayout from './components/StatusLayout';

// Pages
import DashboardPage from './app/page';
import IncidentsPage from './app/incidents/page';
import IncidentDetailPage from './app/incidents/detail/page';
import SubscribePage from './app/subscribe/page';
import VerifySubscriptionPage from './app/subscribe/verify/page';
import ServiceDetailPage from './app/services/page';
import MaintenancePage from './app/maintenance/page';
import MaintenanceDetailPage from './app/maintenance/detail/page';
import NotFoundPage from './app/not-found/page';
import { RssFeedPage } from './components/RssFeedPage';

export default function App() {
	return (
		<ErrorBoundary>
			<Routes>
				<Route element={<StatusLayout />}>
					<Route path="/" element={<DashboardPage />} />
					<Route path="/incidents" element={<IncidentsPage />} />
					<Route path="/incidents/:id" element={<IncidentDetailPage />} />
					<Route path="/subscribe" element={<SubscribePage />} />
					<Route path="/subscribe/manage" element={<SubscribePage />} />
					<Route path="/subscribe/verify" element={<VerifySubscriptionPage />} />
					<Route path="/services/:serviceId" element={<ServiceDetailPage />} />
					<Route path="/maintenance" element={<MaintenancePage />} />
					<Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
					{/* /feed.xml 已被 vercel.json rewrite 到真实 RSS 端点；站内展示页迁到 /rss */}
					<Route path="/rss" element={<RssFeedPage />} />
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</ErrorBoundary>
	);
}
