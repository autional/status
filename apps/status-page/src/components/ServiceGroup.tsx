import type { ServiceStatus, HealthStatus } from '@/types';
import ServiceTile from './ServiceTile';
import StatusIndicator from './StatusIndicator';
import { groupIcon } from '@/lib/service-icon';
import { useTranslation } from 'react-i18next';

interface ServiceGroupProps {
	id: string;
	name?: string;
	description?: string;
	services: ServiceStatus[];
}

function aggregateStatus(services: ServiceStatus[]): HealthStatus {
	if (services.some((s) => s.status === 'unhealthy')) return 'unhealthy';
	if (services.some((s) => s.status === 'degraded')) return 'degraded';
	if (services.some((s) => s.status === 'unknown')) return 'unknown';
	return 'healthy';
}

export default function ServiceGroup({ id, name = '', description = '', services }: ServiceGroupProps) {
	const { t } = useTranslation();
	const status = aggregateStatus(services);
	const GroupIcon = groupIcon(id);
	const healthyCount = services.filter((s) => s.status === 'healthy').length;
	// 组内所有"未知"都源于「未接入监控」时，组头也用未接入标记（与磁贴口径一致）
	const allUnknownUnmonitored =
		status === 'unknown' && services.filter((s) => s.status === 'unknown').every((s) => s.noProbe);

	// 安静模式：健康 = 中性（不抢眼）；只有异常才给整条上色
	const statusBgColors = {
		healthy: 'bg-neutral-50/70 dark:bg-surface/10',
		degraded: 'bg-warning-soft/60 dark:bg-warning/10',
		unhealthy: 'bg-danger-soft/60 dark:bg-danger-soft/10',
		unknown: 'bg-neutral-50/70 dark:bg-surface/10',
	};

	const statusBorderColors = {
		healthy: 'border-neutral-200 dark:border-neutral-700/50',
		degraded: 'border-warning-soft/50',
		unhealthy: 'border-danger-soft/50',
		unknown: 'border-neutral-200 dark:border-neutral-700/50',
	};

	// 状态墙：不再折叠 —— 27 个服务全部同屏可见（折叠会把"一眼看全"让位给省空间）。
	return (
		<div className={`rounded-xl border ${statusBorderColors[status]} overflow-hidden`}>
			<div className={`flex items-center justify-between gap-3 px-4 py-3 ${statusBgColors[status]}`}>
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-0 shadow-card">
						<GroupIcon size={18} className="text-muted" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="truncate text-base font-semibold text-neutral-900">{name}</h3>
							{allUnknownUnmonitored ? (
								<span title={t('status.unmonitored')}>
									<span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-info bg-transparent" />
								</span>
							) : (
								<StatusIndicator status={status} size="sm" quietHealthy />
							)}
						</div>
						<p className="truncate text-xs text-muted">{description}</p>
					</div>
				</div>

				<span className="shrink-0 text-xs text-muted tabular-nums">
					{healthyCount}/{services.length} {t('status.operational')}
				</span>
			</div>

			<div className="bg-neutral-0 px-3 py-3">
				<div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
					{services.map((service) => (
						<ServiceTile key={service.id} service={service} />
					))}
				</div>
			</div>
		</div>
	);
}
