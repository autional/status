import type { HealthStatus, IncidentSeverity, IncidentStatus } from '@/types';
import { useTranslation } from 'react-i18next';
import { statusLabelKey } from '@/lib/status-label';

interface StatusIndicatorProps {
	status: HealthStatus | IncidentSeverity | IncidentStatus;
	size?: 'sm' | 'md' | 'lg';
	showLabel?: boolean;
	/**
	 * 「安静模式」：健康态不显示绿色，改为中性灰。
	 *
	 * 用途 = 总览页状态墙：默认满屏中性，只有异常才有颜色，找问题一眼可见。
	 * 默认 false —— 服务详情 / 事件线等其它页面维持原有语义色，不受影响。
	 */
	quietHealthy?: boolean;
}

const statusColor: Record<string, string> = {
	healthy: 'bg-success',
	degraded: 'bg-warning',
	unhealthy: 'bg-danger',
	unknown: 'bg-[var(--color-text-muted)]',
	critical: 'bg-danger',
	major: 'bg-warning',
	minor: 'bg-warning',
	maintenance: 'bg-[var(--color-text-muted)]',
	investigating: 'bg-danger',
	identified: 'bg-warning',
	monitoring: 'bg-info',
	resolved: 'bg-success',
	draft: 'bg-[var(--color-text-muted)]',
};

const statusAnimate: Record<string, boolean> = {
	healthy: true,
	degraded: true,
	unhealthy: true,
};

const badgeColors: Record<string, string> = {
	healthy:
		'bg-success-soft text-success-text border-success-soft dark:bg-success-soft/30 dark:text-success-text dark:border-success-soft',
	degraded:
		'bg-warning-soft text-warning-text border-warning-soft dark:bg-warning/30 dark:text-warning-text dark:border-warning-soft',
	unhealthy:
		'bg-danger-soft text-danger-text border-danger-soft dark:bg-danger-soft/30 dark:text-danger-text dark:border-danger-soft',
	unknown:
		'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
	critical:
		'bg-danger-soft text-danger-text border-danger-soft dark:bg-danger-soft/30 dark:text-danger-text dark:border-danger-soft',
	major:
		'bg-warning-soft text-warning-text border-warning-soft dark:bg-warning-soft/30 dark:text-warning-text dark:border-warning-soft',
	minor:
		'bg-warning-soft text-warning-text border-warning-soft dark:bg-warning/30 dark:text-warning-text dark:border-warning-soft',
	maintenance:
		'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
	investigating:
		'bg-danger-soft text-danger-text border-danger-soft dark:bg-danger-soft/30 dark:text-danger-text dark:border-danger-soft',
	identified:
		'bg-warning-soft text-warning-text border-warning-soft dark:bg-warning/30 dark:text-warning-text dark:border-warning-soft',
	monitoring:
		'bg-info-soft text-info-text border-info-soft dark:bg-info-soft/30 dark:text-info-text dark:border-info-soft',
	resolved:
		'bg-success-soft text-success-text border-success-soft dark:bg-success-soft/30 dark:text-success-text dark:border-success-soft',
	draft:
		'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
};

export default function StatusIndicator({
	status,
	size = 'md',
	showLabel = false,
	quietHealthy = false,
}: StatusIndicatorProps) {
	const { t } = useTranslation();
	const key = statusLabelKey(status);
	const label = key ? t(key) : status;
	const color =
		quietHealthy && status === 'healthy'
			? 'bg-neutral-300 dark:bg-neutral-600'
			: statusColor[status] || 'bg-[var(--color-text-muted)]';
	const animate = statusAnimate[status] || false;

	const sizeClasses = {
		sm: 'h-2 w-2',
		md: 'h-3 w-3',
		lg: 'h-4 w-4',
	};

	return (
		<div className="flex items-center gap-2">
			<span
				className={`inline-block rounded-full ${sizeClasses[size]} ${color} ${
					animate ? 'animate-pulse-soft' : ''
				}`}
			/>
			{showLabel && (
				<span className="text-sm font-medium text-neutral-700">{label}</span>
			)}
		</div>
	);
}

export function StatusBadge({
	status,
}: {
	status: HealthStatus | IncidentSeverity | IncidentStatus;
}) {
	const { t } = useTranslation();
	const key = statusLabelKey(status);
	const label = key ? t(key) : status;

	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
				badgeColors[status] ||
				'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
			}`}
		>
			{label}
		</span>
	);
}
