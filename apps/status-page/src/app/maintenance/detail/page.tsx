import { useParams, Link } from 'react-router';
import { useMaintenance } from '@/hooks/use-system-status';
import {
	ArrowLeft,
	Wrench,
	Clock,
	Calendar,
	Server,
	AlertCircle,
	CheckCircle2,
	Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';

const statusConfig: Record<
	string,
	{ label: string; icon: React.ReactNode; color: string; border: string; bg: string }
> = {
	scheduled: {
		label: 'maintenance.status.scheduled',
		icon: <Calendar size={16} />,
		color: 'text-info-text',
		border: 'border-info-soft',
		bg: 'bg-info-soft/20',
	},
	in_progress: {
		label: 'maintenance.status.inProgress',
		icon: <Wrench size={16} />,
		color: 'text-warning-text',
		border: 'border-warning-soft',
		bg: 'bg-warning-soft dark:bg-warning/20',
	},
	completed: {
		label: 'maintenance.status.completed',
		icon: <CheckCircle2 size={16} />,
		color: 'text-success-text',
		border: 'border-success-soft',
		bg: 'bg-success-soft/20',
	},
	cancelled: {
		label: 'maintenance.status.cancelled',
		icon: <AlertCircle size={16} />,
		color: 'text-neutral-700 dark:text-[var(--color-text-muted)]',
		border: 'border-neutral-200 dark:border-neutral-700',
		bg: 'bg-neutral-50 dark:bg-neutral-800/50',
	},
};

export default function MaintenanceDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const { data: maintenance, isLoading } = useMaintenance(id || '');

	if (isLoading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-12 text-center">
				<Loader2 size={32} className="mx-auto animate-spin text-primary-600" />
				<p className="mt-4 text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('maintenance.loading')}
				</p>
			</div>
		);
	}

	if (!maintenance) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-12 text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
					<Wrench size={32} className="text-[var(--color-text-muted)]" />
				</div>
				<h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
					{t('maintenance.notFound')}
				</h2>
				<p className="mt-2 text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('maintenance.notFoundDesc')}
				</p>
				<Link
					to="/maintenance"
					className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
				>
					<ArrowLeft size={14} />
					{t('maintenance.back')}
				</Link>
			</div>
		);
	}

	const cfg = statusConfig[maintenance.status] || statusConfig.scheduled;
	const now = new Date();
	const start = new Date(maintenance.scheduledStartAt);
	const end = new Date(maintenance.scheduledEndAt);
	const isUpcoming = start > now;
	const isOngoing = start <= now && end > now;
	const durationHours = Math.round((end.getTime() - start.getTime()) / 3600000);

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			{/* Back link */}
			<Link
				to="/maintenance"
				className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-[var(--color-text-muted)] dark:hover:text-neutral-200"
			>
				<ArrowLeft size={16} />
				{t('maintenance.back')}
			</Link>

			{/* Header */}
			<div className={`mt-6 rounded-xl border p-6 ${cfg.bg} ${cfg.border}`}>
				<div className="flex items-start gap-3">
					<div className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
								{t(cfg.label)}
							</span>
							{isUpcoming && (
								<span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-medium text-info-text dark:bg-info-soft/30 dark:text-info-text">
									{t('maintenance.upcoming')}
								</span>
							)}
							{isOngoing && (
								<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
									{t('maintenance.inProgress')}
								</span>
							)}
						</div>
						<h1 className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
							{maintenance.title}
						</h1>
						<p className="mt-1 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
							{maintenance.description}
						</p>
					</div>
				</div>

				{/* Meta */}
				<div className="mt-5 grid gap-3 sm:grid-cols-2">
					<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
						<Calendar size={14} />
						<span>
							{t('maintenance.startTime')}
							{formatDateTime(maintenance.scheduledStartAt)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
						<Clock size={14} />
						<span>
							{t('maintenance.endTime')}
							{formatDateTime(maintenance.scheduledEndAt)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
						<Clock size={14} />
						<span>{t('maintenance.duration', { hours: durationHours })}</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-[var(--color-text-muted)]">
						<Calendar size={14} />
						<span>
							{t('maintenance.createdAt')}
							{formatDateTime(maintenance.createdAt)}
						</span>
					</div>
				</div>
			</div>

			{/* Affected Services */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
				<h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					<Server size={16} className="text-neutral-500" />
					{t('maintenance.affectedServices')}
				</h2>
				<div className="mt-3 flex flex-wrap gap-2">
					{(maintenance.affectedServices || []).map((sid) => (
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

			{/* Status Timeline */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
				<h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					{t('maintenance.statusTitle')}
				</h2>
				<div className="relative flex items-center justify-between">
					{/* Line */}
					<div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-neutral-200 dark:bg-neutral-700" />

					{[
						{ key: 'scheduled', label: t('maintenance.status.scheduled'), active: true },
						{
							key: 'in_progress',
							label: t('maintenance.status.inProgress'),
							active: maintenance.status === 'in_progress' || maintenance.status === 'completed',
						},
						{
							key: 'completed',
							label: t('maintenance.status.completed'),
							active: maintenance.status === 'completed',
						},
					].map((step) => (
						<div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
									step.active
										? 'border-primary-500 bg-primary-500 text-white'
										: 'border-neutral-300 bg-white text-[var(--color-text-muted)] dark:border-neutral-600 dark:bg-neutral-800'
								}`}
							>
								{step.key === 'scheduled' && <Calendar size={14} />}
								{step.key === 'in_progress' && <Wrench size={14} />}
								{step.key === 'completed' && <CheckCircle2 size={14} />}
							</div>
							<span
								className={`text-xs font-medium ${step.active ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--color-text-muted)] dark:text-neutral-500'}`}
							>
								{step.label}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
