import { useIncidents } from '@/hooks/use-system-status';
import IncidentTimeline from '@/components/IncidentTimeline';
import { AlertTriangle, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import type { IncidentSeverity, IncidentStatus } from '@/types';

const severityFilters: { value: IncidentSeverity | 'all'; label: string }[] = [
	{ value: 'all', label: 'filter.all' },
	{ value: 'critical', label: 'severity.critical' },
	{ value: 'major', label: 'severity.major' },
	{ value: 'minor', label: 'severity.minor' },
	{ value: 'maintenance', label: 'severity.maintenance' },
];

const statusFilters: { value: IncidentStatus | 'all'; label: string }[] = [
	{ value: 'all', label: 'filter.allStatuses' },
	{ value: 'investigating', label: 'status.investigating' },
	{ value: 'identified', label: 'status.identified' },
	{ value: 'monitoring', label: 'status.monitoring' },
	{ value: 'resolved', label: 'status.resolved' },
];

function FilterSkeleton() {
	return <div className="h-7 w-16 animate-pulse rounded-full bg-neutral-100" />;
}

export default function IncidentsPage() {
	const { t } = useTranslation();
	const { data: incidents, isLoading } = useIncidents();
	const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');
	const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

	const filteredIncidents = useMemo(() => {
		if (!incidents) return [];
		return incidents.filter((incident) => {
			const matchSeverity = severityFilter === 'all' || incident.severity === severityFilter;
			const matchStatus = statusFilter === 'all' || incident.status === statusFilter;
			return matchSeverity && matchStatus;
		});
	}, [incidents, severityFilter, statusFilter]);

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-neutral-900">
					{t('incidents.title')}
				</h1>
				<p className="mt-1 text-sm text-muted">
					{t('incidents.subtitle')}
				</p>
			</div>

			{/* Filters */}
			<div className="mb-6 flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1.5 text-sm text-muted">
					<Filter size={14} />
					<span>{t('filter.severity')}</span>
				</div>
				{isLoading ? (
					<>
						<FilterSkeleton />
						<FilterSkeleton />
						<FilterSkeleton />
						<FilterSkeleton />
						<FilterSkeleton />
						<FilterSkeleton />
					</>
				) : (
					<>
						<div className="flex flex-wrap gap-2">
							{severityFilters.map((f) => (
								<button
									key={f.value}
									onClick={() => setSeverityFilter(f.value)}
									className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
										severityFilter === f.value
											? 'bg-primary-600 text-white'
											: 'bg-neutral-0 text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
									}`}
								>
									{t(f.label)}
								</button>
							))}
						</div>
						<div className="flex flex-wrap gap-2">
							{statusFilters.map((f) => (
								<button
									key={f.value}
									onClick={() => setStatusFilter(f.value)}
									className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
										statusFilter === f.value
											? 'bg-primary-600 text-white'
											: 'bg-neutral-0 text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
									}`}
								>
									{t(f.label)}
								</button>
							))}
						</div>
					</>
				)}
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="h-24 animate-pulse rounded-lg bg-neutral-100"
						/>
					))}
				</div>
			) : filteredIncidents.length === 0 ? (
				<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-12 text-center">
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft/30">
						<AlertTriangle size={20} className="text-success-text" />
					</div>
					<h3 className="text-sm font-medium text-neutral-900">
						{t('incidents.empty')}
					</h3>
					<p className="mt-1 text-xs text-muted">
						{t('incidents.emptyHint')}
					</p>
				</div>
			) : (
				<IncidentTimeline incidents={filteredIncidents} linkToDetail />
			)}
		</div>
	);
}
