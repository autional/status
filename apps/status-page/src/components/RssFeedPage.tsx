/*
 * RSS Feed 实现采用 dual-approach 架构:
 * 1. 服务端生成 (useRssXml): 从后端 API 获取预生成的 RSS XML（CDN 友好，SEO 最优）
 * 2. 客户端回退 (generateRSS): 当服务端不可达时，在浏览器中从 incidents + maintenances 数据生成 XML
 *    此回退保证即便后端 RSS 端点故障，用户仍能获得有效 feed
 */
import { useRssXml, useIncidents, useMaintenances } from '@/hooks/use-system-status';
import { Loader2, AlertTriangle, Rss, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateRSS } from '@/lib/rss';
import { SITE_URL } from '@/lib/site-env';
import { usePageMeta } from '@/lib/page-meta';

function RssFeedContent() {
	const { t, i18n } = useTranslation();
	usePageMeta(t('rss.pageTitle'), t('rss.desc'), '/rss');

	// 区域决定频道语言（.cn 中文 / .com 英文）：对外只有一个 feed URL，不再拼 ?lang。
	const rssLang: 'zh' | 'en' = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'zh';
	const feedUrl = `${SITE_URL}/feed.xml`;

	const { data: rssXml, isLoading: rssLoading, isError: rssError } = useRssXml(rssLang);
	const { data: incidents } = useIncidents();
	const { data: maintenances } = useMaintenances();

	const [copied, setCopied] = useState(false);
	const [copyFailed, setCopyFailed] = useState(false);
	const copyTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		setCopied(false);
		setCopyFailed(false);
	}, [rssLang]);

	useEffect(() => () => window.clearTimeout(copyTimer.current), []);

	const copyFeedUrl = async () => {
		window.clearTimeout(copyTimer.current);
		try {
			await navigator.clipboard.writeText(feedUrl);
			setCopied(true);
			setCopyFailed(false);
		} catch {
			setCopied(false);
			setCopyFailed(true);
		}
		copyTimer.current = window.setTimeout(() => {
			setCopied(false);
			setCopyFailed(false);
		}, 3000);
	};

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

				{/* ST2-14：订阅地址原先是描述句里的纯文本，无法点击也无法复制。
				    改为可聚焦链接 + 一键复制，并给出可播报的复制结果。 */}
				<div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
					<p className="text-xs font-medium text-neutral-700">{t('rss.feedUrlLabel')}</p>
					<div className="mt-2 flex flex-wrap items-center gap-2">
						<a
							href={feedUrl}
							className="min-w-0 break-all font-mono text-xs text-primary-600 hover:underline dark:text-primary-400"
						>
							{feedUrl}
						</a>
						<button
							type="button"
							onClick={copyFeedUrl}
							className="inline-flex min-h-[var(--a11y-touch-target)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
						>
							{copied ? <Check size={14} /> : <Copy size={14} />}
							{copied ? t('rss.copied') : t('rss.copy')}
						</button>
					</div>
					<p aria-live="polite" className="mt-1 text-xs text-muted">
						{copyFailed ? t('rss.copyFailed') : copied ? t('rss.copied') : ''}
					</p>
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
