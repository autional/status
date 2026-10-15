import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { HealthStatus, ServiceStatus } from '@/types';
import { serviceIcon } from '@/lib/service-icon';
import { statusLabelKey } from '@/lib/status-label';

interface FleetStripProps {
	services: ServiceStatus[];
}

/**
 * 舰队全景条：全部服务的图标一览，抬眼即知"有没有事、事在哪"。
 *
 * 安静模式（与状态墙一致）：健康 = 中性（白底 + 中性边框 + 中性图标），
 * 不上绿色 —— 满屏绿等于没有信号。只有异常才上色，且不只靠颜色（色盲可用）：
 *   · 边框色 + 图标色 + 底色 = 异常状态；
 *   · unknown 用虚线边框（"没有数据"的形状语义，区别于中性实线的 healthy）；
 *   · degraded / unhealthy 额外加 ring，在满屏中性里也能被一眼挑出。
 */
const STRIP_TONE: Record<HealthStatus, string> = {
	healthy:
		'border-neutral-200 bg-neutral-0 text-muted hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:bg-surface/40 dark:hover:border-neutral-500',
	degraded:
		'border-warning bg-warning-soft text-warning-text ring-1 ring-warning/40 hover:ring-warning',
	unhealthy:
		'border-danger bg-danger-soft text-danger-text ring-2 ring-danger/40 hover:ring-danger',
	unknown:
		'border-dashed border-neutral-300 bg-neutral-0 text-neutral-400 hover:border-neutral-400 dark:border-neutral-600 dark:bg-surface/40 dark:text-neutral-400',
};

/** 「未接入监控」：虚线 + 信息色（蓝）—— 独立于"未知"，且不冒充故障。 */
const UNMONITORED_STRIP_TONE =
	'border-dashed border-info-soft bg-neutral-0 text-info hover:border-info dark:border-info-soft/60 dark:bg-surface/40 dark:text-info';

export default function FleetStrip({ services }: FleetStripProps) {
	const { t } = useTranslation();

	if (!services.length) return null;

	return (
		<div className="flex flex-wrap items-center gap-1">
			{services.map((service) => {
				const Icon = serviceIcon(service.id);
				const name = t('service.name.' + service.id);
				const unmonitored = !!service.noProbe && service.status === 'unknown';
				const labelKey = statusLabelKey(service.status);
				const statusLabel = unmonitored
					? t('status.unmonitored')
					: labelKey
						? t(labelKey)
						: service.status;
				return (
					<Link
						key={service.id}
						to={`/services/${service.id}`}
						title={`${name} — ${statusLabel}`}
						aria-label={`${name} — ${statusLabel}`}
						className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
							unmonitored ? UNMONITORED_STRIP_TONE : STRIP_TONE[service.status]
						}`}
					>
						<Icon size={16} />
					</Link>
				);
			})}
		</div>
	);
}
