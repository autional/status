import { useState } from 'react';
import type { ServiceStatus, HealthStatus } from '@/types';
import ServiceCard from './ServiceCard';
import StatusIndicator from './StatusIndicator';
import { ChevronDown, ChevronUp, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ServiceGroupProps {
	id: string;
	name?: string;
	description?: string;
	services: ServiceStatus[];
	defaultExpanded?: boolean;
}

function aggregateStatus(services: ServiceStatus[]): HealthStatus {
	if (services.some((s) => s.status === 'unhealthy')) return 'unhealthy';
	if (services.some((s) => s.status === 'degraded')) return 'degraded';
	if (services.some((s) => s.status === 'unknown')) return 'unknown';
	return 'healthy';
}

export default function ServiceGroup({
	name = '',
	description = '',
	services,
	defaultExpanded = true,
}: ServiceGroupProps) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(defaultExpanded);
	const status = aggregateStatus(services);
	const healthyCount = services.filter((s) => s.status === 'healthy').length;

	const statusBgColors = {
		healthy: 'bg-success-soft/60 dark:bg-success-soft/10',
		degraded: 'bg-warning-soft/60 dark:bg-warning/10',
		unhealthy: 'bg-danger-soft/60 dark:bg-danger-soft/10',
		unknown: 'bg-neutral-50/60 dark:bg-surface/10',
	};

	const statusBorderColors = {
		healthy: 'border-success-soft/50',
		degraded: 'border-warning-soft/50',
		unhealthy: 'border-danger-soft/50',
		unknown: 'border-neutral-200 dark:border-neutral-700/50',
	};

	return (
		<div className={`rounded-xl border ${statusBorderColors[status]} overflow-hidden`}>
			{/* Group Header */}
			<button
				onClick={() => setExpanded(!expanded)}
				className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors ${statusBgColors[status]} hover:opacity-90`}
			>
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-0 shadow-card">
						<Folder size={18} className="text-muted" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-semibold text-neutral-900">
								{name}
							</h3>
							<StatusIndicator status={status} size="sm" />
						</div>
						<p className="text-xs text-muted">{description}</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<span className="hidden text-xs text-muted sm:inline">
						{healthyCount}/{services.length} {t('status.operational')}
					</span>
					{expanded ? (
						<ChevronUp size={18} className="text-muted" />
					) : (
						<ChevronDown size={18} className="text-muted" />
					)}
				</div>
			</button>

			{/* Group Content */}
			{expanded && (
				<div className="border-t border-neutral-100 bg-neutral-0 px-4 py-4">
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{services.map((service) => (
							<ServiceCard key={service.id} service={service} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}
