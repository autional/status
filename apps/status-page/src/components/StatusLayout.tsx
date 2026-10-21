import { Outlet } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusHeader from './StatusHeader';
import Footer from './Footer';
import { useSystemStatus, useOverview } from '@/hooks/use-system-status';
import { normalizeOverallStatus } from '@/lib/api';
import { formatTimeWithSeconds } from '@/lib/format';

export default function StatusLayout() {
	const { t } = useTranslation();
	const { data, isError } = useSystemStatus();
	const { data: overview } = useOverview();
	// /ready 不可用（SPA fallback / 代理异常）时回退 overview 的 overall_status，
	// 避免误报"所有系统运行正常"。useSystemStatus 返回 raw gateway health（data.status）。
	// 两个来源词表不同（见 normalizeOverallStatus），必须归一化后再进 StatusHeader 色板表。
	// 两来源皆不可得 ⇒ unknown（灰显），绝不默认 healthy（V-01 假绿教训）。
	const overallStatus = normalizeOverallStatus(data?.status ?? overview?.overallStatus) ?? 'unknown';
	// 最近一次刷新失败但手里仍有旧数据：必须显式标注"这不是实时状态"，
	// 否则页面会拿上一次的绿色继续冒充在线（SW 只缓存壳，数据从不缓存）。
	const staleAt = isError && data ? data.timestamp : null;

	return (
		<div className="flex min-h-screen flex-col">
			<StatusHeader overallStatus={overallStatus} />
			{staleAt && (
				<div
					role="status"
					className="border-b border-warning bg-warning-soft text-warning-text dark:bg-warning-soft/30 dark:text-warning-text"
				>
					<div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-xs">
						<AlertTriangle size={14} className="shrink-0" />
						<span className="font-semibold">{t('stale.title')}</span>
						<span>{t('stale.desc', { time: formatTimeWithSeconds(staleAt) })}</span>
					</div>
				</div>
			)}
			<main className="flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
