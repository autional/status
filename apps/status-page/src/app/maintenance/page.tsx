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

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

export default function MaintenancePage() {
	const { t } = useTranslation();
	const { data: maintenances, isLoading } = useMaintenances();
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
							<h2 className="text-lg font-semibold text-neutral-900">
								{t('maintenance.year', { year })} {monthNames[month]}
							</h2>
							<div className="flex items-center gap-1">
								<button
									onClick={prevMonth}
									aria-label={t('maintenance.prevMonth')}
									className="rounded-md p-1.5 text-muted hover:bg-neutral-100"
								>
									<ChevronLeft size={18} />
								</button>
								<button
									onClick={() => setCurrentDate(new Date())}
									className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
								>
									{t('maintenance.today')}
								</button>
								<button
									onClick={nextMonth}
									aria-label={t('maintenance.nextMonth')}
									className="rounded-md p-1.5 text-muted hover:bg-neutral-100"
								>
									<ChevronRight size={18} />
								</button>
							</div>
						</div>

						{/* Weekday Headers */}
						<div className="grid grid-cols-7 border-b border-neutral-100">
							{weekDays.map((day) => (
								<div
									key={day}
									className="py-2 text-center text-xs font-medium text-muted"
								>
									{day}
								</div>
							))}
						</div>

						{/* Days Grid */}
						<div className="grid grid-cols-7">
							{/* Empty cells before first day */}
							{Array.from({ length: firstDay }).map((_, i) => (
								<div
									key={`empty-${i}`}
									className="min-h-[80px] border-b border-r border-neutral-50"
								/>
							))}

							{/* Days */}
							{Array.from({ length: daysInMonth }).map((_, i) => {
								const day = i + 1;
								const dayMaintenances = maintenanceMap.get(day) || [];
								const hasMaintenance = dayMaintenances.length > 0;

								return (
									<div
										key={day}
										className={`min-h-[80px] border-b border-r border-neutral-50 p-1.5 transition-colors ${
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
											{hasMaintenance && <div className="h-1.5 w-1.5 rounded-full bg-info" />}
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
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Upcoming Maintenances List */}
				<div>
					<div className="rounded-xl border border-neutral-200 bg-neutral-0 shadow-card">
						<div className="border-b border-neutral-100 px-5 py-4">
							<h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
								<Wrench size={16} className="text-info-text" />
								{t('maintenance.records')}
							</h3>
						</div>

						{isLoading ? (
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
												<h4 className="text-sm font-medium text-neutral-900 truncate">
													{m.title}
												</h4>
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
													<span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success-text dark:bg-success-soft/30 dark:text-success-text">
														<CheckCircle2 size={10} />
														{t('maintenance.completed')}
													</span>
												) : m.status === 'cancelled' ? (
													<span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
														<AlertCircle size={10} />
														{t('maintenance.cancelled')}
													</span>
												) : (
													<span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-medium text-info-text dark:bg-info-soft/30 dark:text-info-text">
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
						<h4 className="mb-2 text-xs font-medium text-neutral-700">
							{t('maintenance.legend')}
						</h4>
						<div className="space-y-1.5 text-xs text-muted">
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-info" />
								<span>{t('maintenance.legend.planned')}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-success" />
								<span>{t('maintenance.legend.completed')}</span>
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
