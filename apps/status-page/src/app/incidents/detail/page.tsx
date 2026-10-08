import { useParams, Link } from 'react-router';
import { useIncident } from '@/hooks/use-system-status';
import { StatusBadge } from '@/components/StatusIndicator';
import {
	ArrowLeft,
	AlertTriangle,
	Wrench,
	Clock,
	Server,
	MessageSquare,
	Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';

function buildSeverityConfig(
	t: (key: string) => string,
): Record<
	string,
	{ icon: React.ReactNode; label: string; color: string; border: string; bg: string }
> {
	return {
		critical: {
			icon: <AlertTriangle size={20} />,
			label: t('incidents.criticalEvent'),
			color: 'text-danger-text',
			border: 'border-danger-soft',
			bg: 'bg-danger-soft/20',
		},
		major: {
			icon: <AlertTriangle size={20} />,
			label: t('incidents.majorEvent'),
			color: 'text-warning-text',
			border: 'border-warning-soft',
			bg: 'bg-warning-soft/20',
		},
		minor: {
			icon: <AlertTriangle size={20} />,
			label: t('incidents.minorEvent'),
			color: 'text-warning-text',
			border: 'border-warning-soft',
			bg: 'bg-warning-soft dark:bg-warning/20',
		},
		maintenance: {
			icon: <Wrench size={20} />,
			label: t('severity.maintenance'),
			color: 'text-[var(--color-text-primary)] dark:text-[var(--color-text-muted)]',
			border: 'border-neutral-200 dark:border-neutral-700',
			bg: 'bg-neutral-50 dark:bg-surface/50',
		},
	};
}

export default function IncidentDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const { data: incident, isLoading } = useIncident(id || '');

	function formatRelativeTime(isoString: string): string {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		const diffHour = Math.floor(diffMin / 60);
		const diffDay = Math.floor(diffHour / 24);

		if (diffMin < 1) return t('time.justNow');
		if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
		if (diffHour < 24) return t('time.hoursAgo', { n: diffHour });
		if (diffDay < 7) return t('time.daysAgo', { n: diffDay });
		return formatDateTime(isoString);
	}

	const severityConfig = buildSeverityConfig(t);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-12 text-center">
				<Loader2 size={32} className="mx-auto animate-spin text-primary-600" />
				<p className="mt-4 text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('incidents.loading')}
				</p>
			</div>
		);
	}

	if (!incident) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-12 text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
					<AlertTriangle size={32} className="text-[var(--color-text-muted)]" />
				</div>
				<h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
					{t('incidents.notFound')}
				</h2>
				<p className="mt-2 text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('incidents.notFoundDesc')}
				</p>
				<Link
					to="/incidents"
					className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
				>
					<ArrowLeft size={14} />
					{t('incidents.backToList')}
				</Link>
			</div>
		);
	}

	const cfg = severityConfig[incident.severity] || severityConfig.minor;

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			{/* Back link */}
			<Link
				to="/incidents"
				className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-[var(--color-text-muted)] dark:hover:text-neutral-200"
			>
				<ArrowLeft size={16} />
				{t('incidents.backToList')}
			</Link>

			{/* Header */}
			<div className={`mt-6 rounded-xl border p-6 ${cfg.bg} ${cfg.border}`}>
				<div className="flex items-start gap-3">
					<div className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
								{cfg.label}
							</span>
							<StatusBadge status={incident.status} />
						</div>
						<h1 className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
							{incident.title}
						</h1>
						<p className="mt-1 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
							{incident.description}
						</p>
					</div>
				</div>

				{/* Meta */}
				<div className="mt-5 grid gap-3 sm:grid-cols-3">
					<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
						<Clock size={14} />
						<span>
							{t('incidents.createdAt')}
							{formatDateTime(incident.createdAt)}
						</span>
					</div>
					{incident.resolvedAt && (
						<div className="flex items-center gap-2 text-sm text-success-text">
							<Clock size={14} />
							<span>
								{t('incidents.resolvedLabel')}
								{formatDateTime(incident.resolvedAt)}
							</span>
						</div>
					)}
					<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
						<MessageSquare size={14} />
						<span>
							{(incident.updates || []).length}
							{t('incidents.updateCount')}
						</span>
					</div>
				</div>
			</div>

			{/* Affected Services */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
				<h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					<Server size={16} className="text-neutral-500" />
					{t('incidents.affectedServices')}
				</h2>
				<div className="mt-3 flex flex-wrap gap-2">
					{(incident.affectedServices || []).map((sid) => (
						<Link
							key={sid}
							to={`/services/${sid}`}
							className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
						>
							<Server size={12} />
							{t('service.shortName.' + sid)}
						</Link>
					))}
				</div>
			</div>

			{/* Timeline */}
			<div className="mt-6">
				<h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
					{t('incidents.timeline')}
				</h2>
				{(incident.updates || []).length === 0 ? (
					<div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
						<Clock size={24} className="mx-auto text-[var(--color-text-muted)]" />
						<p className="mt-2 text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
							{t('incidents.noUpdates')}
						</p>
					</div>
				) : (
					<div className="relative space-y-4 pl-6">
						<div className="absolute left-2 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-600" />
						{(incident.updates || []).map((update, index) => (
							<div key={update.id} className="relative">
								<div
									className={`absolute -left-4 top-1.5 h-3 w-3 rounded-full border-2 ${
										index === 0
											? 'border-primary-500 bg-primary-500'
											: 'border-neutral-300 bg-white dark:border-neutral-500 dark:bg-neutral-800'
									}`}
								/>
								<div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<StatusBadge status={update.status} />
											<span className="text-xs text-[var(--color-text-muted)] dark:text-neutral-500">
												{formatRelativeTime(update.createdAt)}
											</span>
										</div>
										<span className="text-xs text-[var(--color-text-muted)] dark:text-neutral-500">
											{formatDateTime(update.createdAt)}
										</span>
									</div>
									<p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
										{update.message}
									</p>
								</div>
							</div>
						))}

						{/* Resolved endpoint */}
						{incident.status === 'resolved' && (
							<div className="relative">
								<div className="absolute -left-4 top-1.5 h-3 w-3 rounded-full border-2 border-success-soft bg-success" />
								<div className="rounded-lg border border-success-soft bg-success-soft p-4 dark:border-success-soft dark:bg-success-soft/20">
									<div className="flex items-center gap-2">
										<StatusBadge status="resolved" />
										<span className="text-xs text-success-text">
											{incident.resolvedAt
												? formatDateTime(incident.resolvedAt)
												: t('incidents.resolvedStatus')}
										</span>
									</div>
									<p className="mt-1 text-sm text-success-text">
										{t('incidents.resolvedDesc')}
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
