import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ROUTER_BASENAME } from '@autional/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@autional/ui';
import App from './App';
import './non-tenant-segments';
import './index.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchInterval: 30000,
			refetchOnWindowFocus: true,
		},
	},
});

const root = document.getElementById('root');
if (root) {
	createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter basename={ROUTER_BASENAME}>
					<ThemeProvider storageKey="status-page-theme">
						<App />
					</ThemeProvider>
				</BrowserRouter>
			</QueryClientProvider>
		</StrictMode>,
	);
}
