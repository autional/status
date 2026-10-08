import { Link } from 'react-router';
import {
	useServiceStatuses,
	useIncidents,
	useOverview,
	useServiceCatalog,
	useMaintenances,
} from '@/hooks/use-system-status';
import ServiceGroup from '@/components/ServiceGroup';
import IncidentTimeline from '@/components/IncidentTimeline';
import StatusIndicator from '@/components/StatusIndicator';
import RefreshCountdown from '@/components/RefreshCountdown';
import { buildGroupStructure } from '@/lib/api';
import { formatTimeWithSeconds } from '@/lib/format';
import { RefreshCw, Shield, AlertTriangle, Clock, ArrowRight, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import type { ServiceGroup as ServiceGroupType, ServiceStatus } from '@/types';

function StatCardSkeleton() {
	return (
		<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
			<div className="h-3 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
			<div className="mt-2 h-8 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
			<div className="mt-2 h-3 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
		</div>
	);
}

export default function DashboardPage() {
	const { t } = useTranslation();
	const {
		data: services,
		isLoading: statusLoading,
		refetch: refetchStatus,
		isFetching,
	} = useServiceStatuses();
	const { data: incidents } = useIncidents();
	const { data: overview } = useOverview();
	const { data: maintenances } = useMaintenances();
	const { data: catalog, isLoading: catalogLoading } = useServiceCatalog();

	// 分组：catalog.groups（权威 6 组 25 服务）× 派生 services。
	// 历史上用 SERVICE_GROUPS 硬编码 5 组 15 服务做交集，导致 access-control 组永不渲染。
	const grouped = useMemo(() => {
		const map = new Map<string, ServiceStatus[]>();
		if (!catalog?.groups?.length || !services?.length) return map;
		for (const g of catalog.groups) {
			map.set(
				g.id,
				g.services
					.map((s) => services.find((sv) => sv.id === s.id))
					.filter(Boolean) as ServiceStatus[],
			);
		}
		return map;
	}, [catalog, services]);

	const displayGroups = useMemo<ServiceGroupType[]>(
		() => buildGroupStructure(catalog ?? null),
		[catalog],
	);

	// 统计：catalog 派生服务（25）优先；catalog 不可用时回退 overview 汇总（后端 registry 派生，同样 25）。
	// 历史上用 status.services.length（受 SERVICE_CONFIG 15 限制）导致 15/15 假象。
	const servicesTotal = services?.length ?? overview?.servicesTotal ?? 0;
	const servicesHealthy =
		services?.filter((s) => s.status === 'healthy').length ?? overview?.servicesHealthy ?? 0;
	const activeIncidents = useMemo(() => {
		if (overview?.activeIncidents != null) return overview.activeIncidents;
		return (
			incidents?.filter(
				(i) => i.status !== 'resolved' && i.status !== 'draft' && i.severity !== 'maintenance',
			).length ?? 0
		);
	}, [overview, incidents]);
	const lastUpdated = overview?.lastUpdated ?? services?.[0]?.lastChecked;

	// 维护走独立 API（status_maintenances），不能从 incidents 推导。
	// 计划维护 = scheduled + in_progress（排除 completed / cancelled）。
	const plannedMaintenances = useMemo(
		() => (maintenances || []).filter((m) => m.status !== 'completed' && m.status !== 'cancelled'),
		[maintenances],
	);

	const healthUnavailable = !services && !statusLoading;

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			{/* Summary Stats */}
			<div className="mb-8 grid gap-4 sm:grid-cols-4">
				{statusLoading ? (
					<>
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
						<StatCardSkeleton />
					</>
				) : (
					<>
						<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-neutral-500 uppercase tracking-wide dark:text-[var(--color-text-muted)]">
										{t('stat.services')}
									</p>
									<p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
										{servicesHealthy}/{servicesTotal}
									</p>
								</div>
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success-text dark:bg-success-soft/30 dark:text-success-text">
									<Shield size={20} />
								</div>
							</div>
							<p className="mt-2 text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">
								{servicesHealthy === servicesTotal
									? t('stat.services.allOk')
									: t('stat.services.degraded', { n: servicesTotal - servicesHealthy })}
							</p>
						</div>

						<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-neutral-500 uppercase tracking-wide dark:text-[var(--color-text-muted)]">
										{t('stat.incidents')}
									</p>
									<p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
										{activeIncidents}
									</p>
								</div>
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-danger-soft text-danger-text dark:bg-danger-soft/30 dark:text-danger-text">
									<AlertTriangle size={20} />
								</div>
							</div>
							<p className="mt-2 text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">
								{activeIncidents > 0 ? t('stat.incidents.active') : t('stat.incidents.none')}
							</p>
						</div>

						<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-neutral-500 uppercase tracking-wide dark:text-[var(--color-text-muted)]">
										{t('stat.maintenance')}
									</p>
									<p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
										{plannedMaintenances.length}
									</p>
								</div>
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-soft text-info-text dark:bg-info-soft/30 dark:text-info-text">
									<Wrench size={20} />
								</div>
							</div>
							<p className="mt-2 text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">
								{plannedMaintenances.length
									? t('stat.maintenance.upcoming')
									: t('stat.maintenance.none')}
							</p>
						</div>

						<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-neutral-500 uppercase tracking-wide dark:text-[var(--color-text-muted)]">
										{t('lastUpdated')}
									</p>
									<p className="mt-1 text-lg font-bold text-neutral-900 tabular-nums dark:text-neutral-100">
										{lastUpdated ? formatTimeWithSeconds(lastUpdated) : '--:--:--'}
									</p>
								</div>
								<button
									onClick={() => refetchStatus()}
									disabled={isFetching}
									className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-50 text-neutral-500 hover:bg-neutral-100 transition-colors dark:bg-neutral-700 dark:text-[var(--color-text-muted)] dark:hover:bg-neutral-600"
									title={t('refresh')}
								>
									<RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
								</button>
							</div>
							<div className="mt-2 flex items-center justify-between">
								<p className="text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">{t('autoRefresh')}</p>
								<RefreshCountdown intervalMs={30000} onRefresh={() => refetchStatus()} />
							</div>
						</div>
					</>
				)}
			</div>

			{/* Legend */}
			<div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">
				<span className="flex items-center gap-1.5">
					<StatusIndicator status="healthy" size="sm" /> {t('status.operational')}
				</span>
				<span className="flex items-center gap-1.5">
					<StatusIndicator status="degraded" size="sm" /> {t('status.degraded')}
				</span>
				<span className="flex items-center gap-1.5">
					<StatusIndicator status="unhealthy" size="sm" /> {t('status.down')}
				</span>
			</div>

			{/* Service Groups */}
			<div className="mb-8 space-y-4">
				{statusLoading || catalogLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-700"
							/>
						))}
					</div>
				) : healthUnavailable ? (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
						{t('dashboard.healthUnavailable')}
					</div>
				) : (
					displayGroups.map((group) => {
						const groupServices = grouped.get(group.id) || [];
						if (groupServices.length === 0) return null;
						// 组名/描述优先用 catalog（后端 registry 权威中文），缺失时回退 i18n key
						const groupName = group.name || t('service.group.' + group.id);
						const groupDesc = group.description || t('service.group.' + group.id + '.desc');
						return (
							<ServiceGroup
								key={group.id}
								id={group.id}
								name={groupName}
								description={groupDesc}
								services={groupServices}
								defaultExpanded={true}
							/>
						);
					})
				)}
			</div>

			{/* Recent Incidents */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
						{t('incidents.recent')}
					</h2>
					<Link
						to="/incidents"
						className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
					>
						{t('incidents.viewAll')}
						<ArrowRight size={14} />
					</Link>
				</div>
				<IncidentTimeline incidents={incidents || []} limit={3} showViewAll linkToDetail />
			</div>

			{/* Uptime Promise */}
			<div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-800">
				<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
					<Clock size={20} className="text-primary-600 dark:text-primary-400" />
				</div>
				<h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
					{t('uptime.title')}
				</h3>
				<p className="mx-auto mt-1 max-w-lg text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('uptime.desc')}
				</p>
			</div>
		</div>
	);
}
