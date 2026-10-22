import { useIncidentList } from '@/hooks/use-system-status';
import IncidentTimeline from '@/components/IncidentTimeline';
import { IncidentEmptyCard, IncidentErrorCard } from '@/components/IncidentStateCard';
import { Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import type { IncidentSeverity, IncidentStatus } from '@/types';
import type { IncidentListFilters } from '@/lib/api';

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
	const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');
	const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

	// 服务端筛选（docs/STATUS-UI-SEMANTICS-OPTIONS.md §4.2 C1 可选增强）：
	// severity/status 直接下传接口（Generated.statusIncidents 支持这些 query 参数），
	// 不再只对返回的首页 20 条做前端过滤 —— 后者在匹配项落在第 21 条之后时会错报
	// 「没有符合条件的事件」，而那句「尝试调整筛选条件」在这种情况下也是误导。
	const filters = useMemo<IncidentListFilters>(
		() => ({
			severity: severityFilter === 'all' ? undefined : severityFilter,
			status: statusFilter === 'all' ? undefined : statusFilter,
		}),
		[severityFilter, statusFilter],
	);

	const { data: list, isLoading, isError } = useIncidentList(filters);
	// 无筛选的同源查询：拿「数据集真实总数」。服务端返回的 total 是**当前筛选下**的条数，
	// 单看它无法判断数据集本身是否为空；两相对照才能把「筛掉了」与「真的没有事件」分开
	// （§4.1(a)/(b)）。无筛选时两条查询同 key ⇒ 仍只发一次请求。
	const { data: dataset, isError: datasetError } = useIncidentList();

	const incidents = list?.items ?? [];
	const datasetTotal = dataset?.total ?? 0;

	const clearFilters = () => {
		setSeverityFilter('all');
		setStatusFilter('all');
	};

	// 接口故障 ≠ 没有事件：取不到数据必须显式说「取不到」，绝不能渲染成绿色的
	// 「没有符合条件的事件」——那会把「数据源挂了」读成「一切正常」（假绿）。
	// 错误态/空态卡片已抽到 `components/IncidentStateCard.tsx`（与详情页「关联事件」共用同一份）。

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
									aria-pressed={severityFilter === f.value}
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
									aria-pressed={statusFilter === f.value}
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
				<IncidentErrorCard />
			) : incidents.length > 0 ? (
				<IncidentTimeline incidents={incidents} linkToDetail />
			) : datasetTotal > 0 ? (
				// 「筛掉了」：数据集里确实有 {datasetTotal} 条事件记录，只是当前筛选没有命中。
				// 旧实现只在前端过滤首页 20 条，匹配项落在第 21 条之后时会错报"没有符合条件的事件"。
				<IncidentEmptyCard
					title={t('incidents.empty')}
					hint={t('incidents.filteredEmptyHint', { total: datasetTotal })}
					action={
						<button
							onClick={clearFilters}
							className="mt-4 inline-flex min-h-[var(--a11y-touch-target)] items-center justify-center rounded-full border border-neutral-200 bg-neutral-0 px-4 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
						>
							{t('filter.clear')}
						</button>
					}
				/>
			) : datasetError ? (
				// 列表拿到了空数组，但"数据集总数"这条查询失败 ⇒ 无法确认是"真的没有"还是"被筛掉"。
				// 宁可说「取不到」，也不要说「尚无事件记录」（假绿教训，§4.1(c)）。
				<IncidentErrorCard />
			) : (
				// 「真的没有事件」：接口可用 + 无筛选 + total = 0。
				<IncidentEmptyCard title={t('incidents.noneYet')} hint={t('incidents.noneYetHint')} />
			)}
		</div>
	);
}
