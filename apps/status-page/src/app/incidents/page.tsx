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
	const { data: incidents, isLoading, isError } = useIncidents();
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
								// 触区基线：筛选片原为 24–26px 高，手指（≈44px 触区）难以命中；
								// 用 min-h/min-w 引用设计系统 a11y 触区令牌，宽度不足 44 的短标签也补齐。
								<button
									key={f.value}
									onClick={() => setSeverityFilter(f.value)}
									className={`inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center rounded-full px-3 text-xs font-medium transition-colors ${
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
									className={`inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center rounded-full px-3 text-xs font-medium transition-colors ${
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
			) : isError ? (
				// 接口故障 ≠ 没有事件：取不到数据必须显式说"取不到"，绝不能渲染成绿色的
				// 「没有符合条件的事件」——那会把"数据源挂了"读成"一切正常"（假绿）。
				<div
					role="status"
					className="rounded-lg border border-warning-soft bg-neutral-0 p-12 text-center"
				>
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
						<AlertTriangle size={20} className="text-warning-text" />
					</div>
					<h3 className="text-sm font-medium text-neutral-900">
						{t('incidents.error')}
					</h3>
					<p className="mt-1 text-xs text-muted">
						{t('incidents.errorHint')}
					</p>
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
