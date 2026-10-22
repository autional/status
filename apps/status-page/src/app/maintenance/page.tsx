import { useState } from 'react';
import { Link } from 'react-router';
import { useMaintenances } from '@/hooks/use-system-status';
import {
	Calendar,
	Clock,
	ArrowLeft,
	Wrench,
	AlertCircle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import type { Maintenance } from '@/types';
import { useTranslation } from 'react-i18next';
import { formatDateOnly, formatTimeOnly } from '@/lib/format';
import { IncidentErrorCard } from '@/components/IncidentStateCard';
import { TONE_CLASS, dayDotTone, maintenanceTone } from '@/lib/maintenance-status';
import { usePageMeta } from '@/lib/page-meta';

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

export default function MaintenancePage() {
	const { t, i18n } = useTranslation();
	usePageMeta(t('maintenance.title'), t('maintenance.subtitle'), '/maintenance');
	const { data: maintenances, isLoading, isError } = useMaintenances();
	const [currentDate, setCurrentDate] = useState(new Date());

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);

	const monthNames: string[] = t('calendar.months', { returnObjects: true }) as unknown as string[];
	const weekDays: string[] = t('calendar.weekDays', { returnObjects: true }) as unknown as string[];

	// Build a map of day -> maintenances for the current month (using scheduledStartAt)
	const maintenanceMap = new Map<number, Maintenance[]>();
	(maintenances || []).forEach((m) => {
		const d = new Date(m.scheduledStartAt);
		if (d.getFullYear() === year && d.getMonth() === month) {
			const day = d.getDate();
			const list = maintenanceMap.get(day) || [];
			list.push(m);
			maintenanceMap.set(day, list);
		}
	});

	const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
	const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

	const today = new Date();
	const isToday = (day: number) =>
		today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

	// 完整日期 + 今天标记 + 维护数量：读屏用户听到的是「2026年10月21日，今天，无维护」，
	// 而不是孤零零一个「21」（ST2-16）。
	const dayLabel = (day: number): string => {
		const dateLabel = new Date(year, month, day).toLocaleDateString(i18n.language, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const parts = [dateLabel];
		if (isToday(day)) parts.push(t('calendar.todaySuffix'));
		const count = (maintenanceMap.get(day) ?? []).length;
		parts.push(count > 0 ? t('calendar.maintenanceCount', { n: count }) : t('calendar.noMaintenance'));
		return parts.join(t('calendar.labelSeparator'));
	};

	const calendarCells: (number | null)[] = [
		...Array.from({ length: firstDay }, () => null),
		...Array.from({ length: daysInMonth }, (_, i) => i + 1),
	];
	while (calendarCells.length % 7 !== 0) calendarCells.push(null);
	const calendarWeeks: (number | null)[][] = [];
	for (let i = 0; i < calendarCells.length; i += 7) {
		calendarWeeks.push(calendarCells.slice(i, i + 7));
	}

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			{/* Header */}
			<div className="mb-8">
				<Link
					to="/"
					className="inline-flex items-center gap-1 text-sm text-muted hover:text-neutral-800"
				>
					<ArrowLeft size={16} />
					{t('service.back')}
				</Link>
				<h1 className="mt-4 text-2xl font-bold text-neutral-900">
					{t('maintenance.title')}
				</h1>
				<p className="mt-1 text-sm text-muted">
					{t('maintenance.subtitle')}
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-3">
				{/* Calendar */}
				<div className="lg:col-span-2">
					<div className="rounded-xl border border-neutral-200 bg-neutral-0 shadow-card">
						{/* Calendar Header */}
						<div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
							<h2 id="calendar-month-label" className="text-lg font-semibold text-neutral-900">
								{t('maintenance.year', { year })} {monthNames[month]}
							</h2>
							<div className="flex items-center gap-1">
								<button
									onClick={prevMonth}
									aria-label={t('maintenance.prevMonth')}
									className="inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center rounded-md text-muted hover:bg-neutral-100"
								>
									<ChevronLeft size={18} />
								</button>
								<button
									onClick={() => setCurrentDate(new Date())}
									className="inline-flex min-h-[var(--a11y-touch-target)] items-center justify-center rounded-md px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
								>
									{t('maintenance.today')}
								</button>
								<button
									onClick={nextMonth}
									aria-label={t('maintenance.nextMonth')}
									className="inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center rounded-md text-muted hover:bg-neutral-100"
								>
									<ChevronRight size={18} />
								</button>
							</div>
						</div>

						{/* 日历用真实表格语义（ST2-16）：caption 报出月份，列头报出星期，
						    每个日期格用 aria-label 报出完整日期与维护情况。 */}
						<table className="w-full table-fixed border-collapse" aria-labelledby="calendar-month-label">
							<caption className="sr-only">
								{t('calendar.caption', { year, month: monthNames[month] })}
							</caption>
							<thead>
								<tr>
									{weekDays.map((day) => (
										<th
											key={day}
											scope="col"
											className="py-2 text-center text-xs font-medium text-muted"
										>
											{day}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{calendarWeeks.map((week, weekIndex) => (
									<tr key={weekIndex}>
										{week.map((day, dayIndex) => {
											if (day === null) {
												return (
													<td
														key={`empty-${dayIndex}`}
														aria-hidden="true"
														className="h-20 border-b border-r border-neutral-50"
													/>
												);
											}
											const dayMaintenances = maintenanceMap.get(day) || [];
											const hasMaintenance = dayMaintenances.length > 0;
											return (
												<td
													key={day}
													aria-label={dayLabel(day)}
													className={`h-20 border-b border-r border-neutral-50 p-1.5 align-top transition-colors ${
														isToday(day)
															? 'bg-primary-50/50 dark:bg-primary-900/10'
															: 'hover:bg-neutral-50'
													}`}
												>
													<div className="flex items-center justify-between">
														<span
															className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
																isToday(day)
																	? 'bg-primary-600 text-white'
																	: 'text-neutral-700'
															}`}
														>
															{day}
														</span>
														{hasMaintenance && (
															<div
																className={`h-1.5 w-1.5 rounded-full ${
																	TONE_CLASS[dayDotTone(dayMaintenances.map((x) => x.status))].dot
																}`}
															/>
														)}
													</div>
													{dayMaintenances.slice(0, 2).map((m) => (
														<Link
															key={m.id}
															to={`/maintenance/${m.id}`}
															className="mt-1 hidden truncate rounded-xs px-1 py-0.5 text-[10px] font-medium leading-tight bg-info-soft text-info-text transition-colors hover:bg-info-soft sm:block dark:bg-info-soft/30 dark:text-info-text"
															title={m.title}
														>
															{m.title}
														</Link>
													))}
													{dayMaintenances.length > 2 && (
														<div className="mt-0.5 text-[10px] text-muted">
															{t('maintenance.more', { n: dayMaintenances.length - 2 })}
														</div>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Upcoming Maintenances List */}
				<div>
					<div className="rounded-xl border border-neutral-200 bg-neutral-0 shadow-card">
						<div className="border-b border-neutral-100 px-5 py-4">
							<h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
								<Wrench size={16} className="text-info-text" />
								{t('maintenance.records')}
							</h2>
						</div>

						{isError ? (
							<IncidentErrorCard
								title={t('maintenance.loadError')}
								hint={t('maintenance.loadErrorHint')}
							/>
						) : isLoading ? (
							<div className="space-y-3 p-5">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="h-16 animate-pulse rounded-lg bg-neutral-100"
									/>
								))}
							</div>
						) : maintenances?.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-8 text-center">
								<CheckCircle2 size={32} className="text-success-text" />
								<p className="mt-3 text-sm font-medium text-neutral-700">
									{t('maintenance.noRecords')}
								</p>
								<p className="mt-1 text-xs text-muted">
									{t('maintenance.noRecordsHint')}
								</p>
							</div>
						) : (
							<div className="divide-y divide-neutral-100">
								{(maintenances || []).map((m) => (
									<Link
										key={m.id}
										to={`/maintenance/${m.id}`}
										className="block px-5 py-4 transition-colors hover:bg-neutral-50"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0 flex-1">
												<h3 className="text-sm font-medium text-neutral-900 truncate">
													{m.title}
												</h3>
												<p className="mt-0.5 text-xs text-muted line-clamp-2">
													{m.description}
												</p>
												<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
													<span className="flex items-center gap-1">
														<Calendar size={12} />
														{formatDateOnly(m.scheduledStartAt)}
													</span>
													<span className="flex items-center gap-1">
														<Clock size={12} />
														{formatTimeOnly(m.scheduledStartAt)} -{' '}
														{formatTimeOnly(m.scheduledEndAt)}
													</span>
												</div>
											</div>
											<div className="shrink-0">
												{m.status === 'completed' ? (
													<span
														className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE_CLASS.success.badge}`}
													>
														<CheckCircle2 size={10} />
														{t('maintenance.completed')}
													</span>
												) : m.status === 'cancelled' ? (
													<span
														className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE_CLASS.neutral.badge}`}
													>
														<AlertCircle size={10} />
														{t('maintenance.cancelled')}
													</span>
												) : (
													<span
														className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE_CLASS[maintenanceTone(m.status)].badge}`}
													>
														<AlertCircle size={10} />
														{m.status === 'in_progress'
															? t('maintenance.inProgress')
															: t('maintenance.scheduled')}
													</span>
												)}
											</div>
										</div>
										<div className="mt-2 flex flex-wrap gap-1">
											{(m.affectedServices || []).map((sid) => (
												<span
													key={sid}
													className="rounded-xs bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
												>
													{t('service.shortName.' + sid)}
												</span>
											))}
										</div>
									</Link>
								))}
							</div>
						)}
					</div>

					{/* Legend */}
					<div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
						<h3 className="mb-2 text-xs font-medium text-neutral-700">
							{t('maintenance.legend')}
						</h3>
						<div className="space-y-1.5 text-xs text-muted">
							<div className="flex items-center gap-2">
								<div className={`h-2 w-2 rounded-full ${TONE_CLASS.info.dot}`} />
								<span>{t('maintenance.scheduled')}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className={`h-2 w-2 rounded-full ${TONE_CLASS.warning.dot}`} />
								<span>{t('maintenance.inProgress')}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className={`h-2 w-2 rounded-full ${TONE_CLASS.success.dot}`} />
								<span>{t('maintenance.completed')}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className={`h-2 w-2 rounded-full ${TONE_CLASS.neutral.dot}`} />
								<span>{t('maintenance.cancelled')}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-primary-600" />
								<span>{t('maintenance.legend.today')}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
