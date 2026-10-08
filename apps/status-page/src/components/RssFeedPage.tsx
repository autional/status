/*
 * RSS Feed 实现采用 dual-approach 架构:
 * 1. 服务端生成 (useRssXml): 从后端 API 获取预生成的 RSS XML（CDN 友好，SEO 最优）
 * 2. 客户端回退 (generateRSS): 当服务端不可达时，在浏览器中从 incidents + maintenances 数据生成 XML
 *    此回退保证即便后端 RSS 端点故障，用户仍能获得有效 feed
 */
import { useRssXml, useIncidents, useMaintenances } from '@/hooks/use-system-status';
import { Loader2, AlertTriangle, Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useMemo } from 'react';
import { generateRSS } from '@/lib/rss';

function RssFeedContent() {
	const { t } = useTranslation();
	const { data: rssXml, isLoading: rssLoading, isError: rssError } = useRssXml();
	const { data: incidents } = useIncidents();
	const { data: maintenances } = useMaintenances();

	const fallbackXml = useMemo(() => {
		if (rssXml) return null;
		if (!incidents || !maintenances) return null;
		try {
			return generateRSS(incidents, maintenances);
		} catch {
			return null;
		}
	}, [rssXml, incidents, maintenances]);

	const displayXml = rssXml || fallbackXml;

	const isLoading = rssLoading;

	if (isLoading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-muted" />
					<p className="mt-3 text-sm text-muted">{t('rss.generating')}</p>
				</div>
			</div>
		);
	}

	if (rssError || !displayXml) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<div className="text-center">
					<AlertTriangle className="mx-auto h-8 w-8 text-warning" />
					<p className="mt-3 text-sm text-muted">{t('rss.error')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-4xl">
				<div className="mb-6 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-soft text-warning-text dark:bg-warning-soft/20 dark:text-warning-text">
						<Rss className="h-5 w-5" />
					</div>
					<div>
						<h1 className="text-xl font-bold text-neutral-900">
							{t('rss.pageTitle')}
						</h1>
						<p className="text-sm text-muted">
							{t('rss.pageDesc', {
								incidents: incidents?.length ?? 0,
								maintenances: maintenances?.length ?? 0,
							})}
						</p>
					</div>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:bg-surface/50">
					<pre className="max-h-[80vh] overflow-auto text-xs font-mono leading-relaxed whitespace-pre-wrap text-neutral-700">
						{displayXml}
					</pre>
				</div>
			</div>
		</div>
	);
}

export function RssFeedPage() {
	return (
		<ErrorBoundary>
			<RssFeedContent />
		</ErrorBoundary>
	);
}
