import type { ServiceStatus } from '@/types';
import StatusIndicator from './StatusIndicator';
import { Server, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ServiceCardProps {
	service: ServiceStatus;
}

export default function ServiceCard({ service }: ServiceCardProps) {
	const { t } = useTranslation();
	const [isDesktop, setIsDesktop] = useState(
		typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
	);

	useEffect(() => {
		const mq = window.matchMedia('(min-width: 640px)');
		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);
	const statusBorderColors = {
		healthy:
			'border-success-soft hover:border-success-soft dark:border-success-soft dark:hover:border-success-soft',
		degraded:
			'border-warning-soft hover:border-warning dark:border-warning-soft dark:hover:border-warning',
		unhealthy:
			'border-danger-soft hover:border-danger-soft dark:border-danger-soft dark:hover:border-danger-soft',
	};

	return (
		<Link
			to={`/services/${service.id}`}
			className={`group flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm transition-all dark:bg-neutral-800 ${
				statusBorderColors[service.status]
			} hover:shadow-md`}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-[var(--color-text-muted)]">
					<Server size={18} />
				</div>
				<div className="min-w-0">
					<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
						{t('service.name.' + service.id)}
					</h3>
					<p className="text-xs text-neutral-500 dark:text-[var(--color-text-muted)] truncate">
						{t('service.desc.' + service.id)}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-4">
				{isDesktop && (
					<div className="w-20 h-8 shrink-0 flex items-center justify-center">
						{service.status === 'healthy' && (
							<div className="h-1 w-full rounded bg-success-soft">
								<div className="h-full w-full rounded bg-success" />
							</div>
						)}
						{service.status === 'degraded' && (
							<div className="h-1 w-full rounded bg-amber-200 dark:bg-amber-800">
								<div className="h-full w-3/4 rounded bg-amber-500" />
							</div>
						)}
						{service.status === 'unhealthy' && (
							<div className="h-1 w-full rounded bg-danger-soft">
								<div className="h-full w-1/4 rounded bg-danger" />
							</div>
						)}
					</div>
				)}
				<div className="flex flex-col items-end gap-1">
					<StatusIndicator status={service.status} showLabel />
					{service.latency && (
						<div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] dark:text-neutral-500">
							<Clock size={10} />
							{service.latency}
						</div>
					)}
				</div>
			</div>
		</Link>
	);
}
