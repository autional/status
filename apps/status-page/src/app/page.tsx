import { Link } from 'react-router';
import {
	useServiceStatuses,
	useIncidents,
	useOverview,
	useServiceCatalog,
	useMaintenances,
} from '@/hooks/use-system-status';
import ServiceGroup from '@/components/ServiceGroup';
import FleetStrip from '@/components/FleetStrip';
import IncidentTimeline from '@/components/IncidentTimeline';
import StatusIndicator from '@/components/StatusIndicator';
import RefreshCountdown from '@/components/RefreshCountdown';
import { buildGroupStructure } from '@/lib/api';
import { formatTimeWithSeconds } from '@/lib/format';
import { Shield, AlertTriangle, Clock, ArrowRight, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import type { ServiceGroup as ServiceGroupType, ServiceStatus } from '@/types';

function StatCardSkeleton() {
	return (
		<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-card">
			<div className="h-3 w-20 animate-pulse rounded-xs bg-neutral-200" />
			<div className="mt-2 h-8 w-16 animate-pulse rounded-xs bg-neutral-200" />
			<div className="mt-2 h-3 w-32 animate-pulse rounded-xs bg-neutral-200" />
		</div>
	);
}

export default function DashboardPage() {
	const { t } = useTranslation();
	const {
		data: services,
		isLoading: statusLoading,
		refetch: refetchStatus,
	} = useServiceStatuses();
	const { data: incidents, isError: incidentsError } = useIncidents();
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

	// 统计口径（V-01 假绿教训的第二形态）：
	// 服务清单由 catalog × /ready 派生，**空数组 = 拿不到实时数据，不等于"0 个服务"**。
	// 历史实现用 `services?.length ?? overview?.servicesTotal ?? 0`：空数组的 length 是 0
	// （非 nullish）⇒ `??` 兜底永不触发 ⇒ 接口全挂时页面显示「0/0 · 所有服务运行正常」，
	// 一个假绿。故这里显式以「是否真的有逐服务数据」为界。
	const hasLiveServices = (services?.length ?? 0) > 0;
	const servicesTotal = hasLiveServices ? services.length : (overview?.servicesTotal ?? 0);
	const servicesHealthy = hasLiveServices
		? services.filter((s) => s.status === 'healthy').length
		: (overview?.servicesHealthy ?? 0);
	// degraded/unhealthy 合称"异常"；unknown（无监控数据）单独报——绝不并入 healthy 凑数（V-01）。
	// 回退到 overview 时无法区分 unknown，故一律记 0：宁可说"暂无数据"，也不报一个假"异常"。
	const servicesDegraded = hasLiveServices
		? services.filter((s) => s.status === 'degraded' || s.status === 'unhealthy').length
		: 0;
	// unknown 再拆两类（口径不同，必须分开说）：
	//   未接入监控 = 健康源可达、但这个服务没有探针条目（长期态，属"监控覆盖缺口"）
	//   状态未知   = 有探针/或健康源整体不可达，无法判定（瞬时态，属"数据源问题"）
	const servicesUnmonitored = hasLiveServices
		? services.filter((s) => s.status === 'unknown' && s.noProbe).length
		: 0;
	const servicesUnknown = hasLiveServices
		? services.filter((s) => s.status === 'unknown' && !s.noProbe).length
		: 0;
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

	// 拿不到逐服务数据（catalog 挂了）才算"不可用"：空数组是真值，`!services` 永远为 false
	// ⇒ 原来的写法让下方的"无法获取实时服务状态"警示成了死代码。
	const healthUnavailable = !hasLiveServices && !statusLoading;

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
						<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-card">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-muted uppercase tracking-wide">
										{t('stat.services')}
									</p>
									<p className="mt-1 text-2xl font-bold text-neutral-900">
										{servicesTotal > 0 ? `${servicesHealthy}/${servicesTotal}` : '—'}
									</p>
								</div>
								{/* 颜色=问题：服务全好时中性，真出现降级/故障才变红（统计卡也不再常亮绿色） */}
								<div
									className={`flex h-10 w-10 items-center justify-center rounded-md ${
										servicesDegraded > 0
											? 'bg-danger-soft text-danger-text dark:bg-danger-soft/30 dark:text-danger-text'
											: 'bg-neutral-100 text-muted dark:bg-surface/40'
									}`}
								>
									<Shield size={20} />
								</div>
							</div>
							<p className="mt-2 text-xs text-muted">
								{!hasLiveServices
									? t('stat.services.unavailable')
									: servicesDegraded > 0
										? t('stat.services.degraded', { n: servicesDegraded })
										: servicesUnknown > 0
											? t('stat.services.unknown', { n: servicesUnknown })
											: servicesUnmonitored > 0
												? t('stat.services.unmonitored', { n: servicesUnmonitored })
												: null /* 口径（用户 2026-10-16 裁决）：全健康时**不**显示任何宣告——
												     只要真实展示 status。旧实现此处显示「所有服务运行正常」，
												     与顶部横幅的安静模式口径不一致，且接口全挂时也会命中（历史 0/0 假绿）。
												     异常/未知/未接入仍如实说明（上面的分支）。 */}
							</p>
						</div>

						<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-card">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-muted uppercase tracking-wide">
										{t('stat.incidents')}
									</p>
									<p className="mt-1 text-2xl font-bold text-neutral-900">
										{activeIncidents}
									</p>
								</div>
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-danger-soft text-danger-text dark:bg-danger-soft/30 dark:text-danger-text">
									<AlertTriangle size={20} />
								</div>
							</div>
							<p className="mt-2 text-xs text-muted">
								{activeIncidents > 0 ? t('stat.incidents.active') : t('stat.incidents.none')}
							</p>
						</div>

						<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-card">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-muted uppercase tracking-wide">
										{t('stat.maintenance')}
									</p>
									<p className="mt-1 text-2xl font-bold text-neutral-900">
										{plannedMaintenances.length}
									</p>
								</div>
								<div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-soft text-info-text dark:bg-info-soft/30 dark:text-info-text">
									<Wrench size={20} />
								</div>
							</div>
							<p className="mt-2 text-xs text-muted">
								{plannedMaintenances.length
									? t('stat.maintenance.upcoming')
									: t('stat.maintenance.none')}
							</p>
						</div>

						<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-card">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-xs font-medium text-muted uppercase tracking-wide">
										{t('lastUpdated')}
									</p>
									<p className="mt-1 text-lg font-bold text-neutral-900 tabular-nums">
										{lastUpdated ? formatTimeWithSeconds(lastUpdated) : '--:--:--'}
									</p>
								</div>
								{/* 倒计时圆环（剩余秒数居中）；手动刷新与暂停入口已去掉 */}
								<RefreshCountdown intervalMs={30000} onRefresh={() => refetchStatus()} />
							</div>
							<p className="mt-3 text-xs text-muted">{t('autoRefresh')}</p>
						</div>
					</>
				)}
			</div>

			{/* Legend */}
			<div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-muted">
				<span className="flex items-center gap-1.5">
					<StatusIndicator status="healthy" size="sm" quietHealthy /> {t('status.operational')}
				</span>
				<span className="flex items-center gap-1.5">
					<StatusIndicator status="degraded" size="sm" /> {t('status.degraded')}
				</span>
				<span className="flex items-center gap-1.5">
					<StatusIndicator status="unhealthy" size="sm" /> {t('status.down')}
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-xs border border-dashed border-neutral-400" /> {t('status.unknown')}
				</span>
				{/* 「未接入监控」是独立状态：既不是正常也不是故障，只是没有探针证据 */}
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-info" /> {t('status.unmonitored')}
				</span>
			</div>

			{/* Fleet Overview Strip —— 27 个服务图标一览，一眼看全 */}
			{services && services.length > 0 && (
				<div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-0 p-4 shadow-card">
					<div className="mb-3 flex items-center justify-between gap-3">
						<p className="text-xs font-medium text-muted uppercase tracking-wide">
							{t('fleet.title', { n: services.length })}
						</p>
						<span className="text-xs text-muted">
							{t('fleet.hint')}
						</span>
					</div>
					<FleetStrip services={services} />
				</div>
			)}

			{/* Service Groups */}
			<div className="mb-8 space-y-4">
				{statusLoading || catalogLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="h-16 animate-pulse rounded-xl bg-neutral-100"
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
						// 组名/描述以本地 i18n 为尊（随语言切换），键缺失时回退 catalog 字面量（后端 registry 中文）
						const groupName = t('service.group.' + group.id, { defaultValue: group.name });
						const groupDesc = t('service.group.' + group.id + '.desc', {
							defaultValue: group.description,
						});
						return (
							<ServiceGroup
								key={group.id}
								id={group.id}
								name={groupName}
								description={groupDesc}
								services={groupServices}
							/>
						);
					})
				)}
			</div>

			{/* Recent Incidents */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-bold text-neutral-900">
						{t('incidents.recent')}
					</h2>
					<Link
						to="/incidents"
						className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
					>
						{t('incidents.viewAll')}
						<ArrowRight size={14} />
					</Link>
				</div>
				{incidentsError ? (
					// 事件接口挂了 ≠ 没有事件：不能把"最近事件"空列表渲染成绿色好消息（假绿）。
					<div
						role="status"
						className="rounded-lg border border-warning-soft bg-neutral-0 p-8 text-center"
					>
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
							<AlertTriangle size={20} className="text-warning-text" />
						</div>
						<h3 className="text-sm font-medium text-neutral-900">
							{t('incidents.error')}
						</h3>
						<p className="mt-1 text-xs text-muted">{t('incidents.errorHint')}</p>
					</div>
				) : (
					<IncidentTimeline incidents={incidents || []} limit={3} showViewAll linkToDetail />
				)}
			</div>

			{/* Uptime Promise */}
			<div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-0 p-6 text-center">
				<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
					<Clock size={20} className="text-primary-600 dark:text-primary-400" />
				</div>
				<h3 className="text-base font-semibold text-neutral-900">
					{t('uptime.title')}
				</h3>
				<p className="mx-auto mt-1 max-w-lg text-sm text-muted">
					{t('uptime.desc')}
				</p>
			</div>
		</div>
	);
}
