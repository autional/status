import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ROUTER_BASENAME, isRetryableError } from '@autional/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@autional/ui';
import App from './App';
import './non-tenant-segments';
import './index.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// 重试策略唯一实现：只重试「重试可能改变结果」的错误（@autional/shared/utils/query-state
			// 的 isRetryableError：无状态码 / 5xx / 408 / 429）；4xx（含 404）一律不重试。
			// 原 `retry: 1` 会把 404 也重试 → 重复失败请求 + console 噪声。
			// ⚠️ 页面/hook 不得再写 retry / retryDelay 覆盖本策略。
			retry: (failureCount, error) => isRetryableError(error) && failureCount < 1,
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
