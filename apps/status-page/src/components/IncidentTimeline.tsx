import type { Incident } from '@/types';
import { StatusBadge } from './StatusIndicator';
import { AlertTriangle, Wrench, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatShortDateTime } from '@/lib/format';

interface IncidentTimelineProps {
	incidents: Incident[];
	limit?: number;
	showViewAll?: boolean;
	linkToDetail?: boolean;
}

const severityIcons: Record<string, React.ReactNode> = {
	critical: <AlertTriangle size={16} className="text-danger-text" />,
	major: <AlertTriangle size={16} className="text-warning-text" />,
	minor: <AlertTriangle size={16} className="text-warning-text" />,
	maintenance: <Wrench size={16} className="text-[var(--color-text-muted)]" />,
};

export default function IncidentTimeline({
	incidents,
	limit,
	showViewAll = false,
	linkToDetail = false,
}: IncidentTimelineProps) {
	const { t } = useTranslation();
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const displayIncidents = limit ? incidents.slice(0, limit) : incidents;

	if (incidents.length === 0) {
		return (
			<div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
				<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft/30">
					<Clock size={20} className="text-success-text" />
				</div>
				<h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
					{t('incidents.recentNone')}
				</h3>
				<p className="mt-1 text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('incidents.recentNoneHint')}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{displayIncidents.map((incident) => {
				const isExpanded = expandedId === incident.id;
				return (
					<div
						key={incident.id}
						className="rounded-lg border border-neutral-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
					>
						<button
							onClick={() => setExpandedId(isExpanded ? null : incident.id)}
							className="flex w-full items-start justify-between p-4 text-left"
						>
							<div className="flex items-start gap-3 min-w-0 flex-1">
								<div className="mt-0.5 shrink-0">
									{severityIcons[incident.severity] || <AlertTriangle size={16} />}
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										{linkToDetail ? (
											<Link
												to={`/incidents/${incident.id}`}
												onClick={(e) => e.stopPropagation()}
												className="text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
											>
												{incident.title}
											</Link>
										) : (
											<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
												{incident.title}
											</h3>
										)}
										<StatusBadge status={incident.status} />
										<StatusBadge status={incident.severity} />
									</div>
									<p className="mt-1 text-xs text-neutral-500 dark:text-[var(--color-text-muted)]">
										{(incident.affectedServices || [])
											.map((s) => t('service.shortName.' + s))
											.join(t('common.listSeparator'))}{' '}
										· {formatShortDateTime(incident.createdAt)}
									</p>
								</div>
							</div>
							<ChevronRight
								size={16}
								className={`mt-1 shrink-0 text-[var(--color-text-muted)] transition-transform dark:text-neutral-500 ${isExpanded ? 'rotate-90' : ''}`}
							/>
						</button>

						{isExpanded && (
							<div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-700">
								<p className="text-sm text-neutral-700 dark:text-neutral-300">
									{incident.description}
								</p>

								{linkToDetail && (
									<div className="mt-2">
										<Link
											to={`/incidents/${incident.id}`}
											className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
										>
											{t('incidents.viewDetail')}
										</Link>
									</div>
								)}

								{incident.updates.length > 0 && (
									<div className="mt-4 space-y-3">
										<h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-[var(--color-text-muted)]">
											{t('incidents.progress')}
										</h4>
										<div className="relative space-y-3 pl-4">
											<div className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-neutral-200 dark:bg-neutral-600" />
											{incident.updates.map((update) => (
												<div key={update.id} className="relative">
													<div className="absolute -left-2.5 top-1.5 h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
													<div className="rounded-md bg-neutral-50 p-3 dark:bg-neutral-700/50">
														<div className="flex items-center gap-2">
															<StatusBadge status={update.status} />
															<span className="text-xs text-[var(--color-text-muted)] dark:text-neutral-500">
																{formatShortDateTime(update.createdAt)}
															</span>
														</div>
														<p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300">
															{update.message}
														</p>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{incident.resolvedAt && (
									<div className="mt-3 flex items-center gap-2 text-xs text-success-text">
										<Clock size={12} />
										{t('incidents.resolvedAt', { time: formatShortDateTime(incident.resolvedAt) })}
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}

			{showViewAll && incidents.length > (limit || 0) && (
				<div className="text-center">
					<Link
						to="/incidents"
						className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
					>
						{t('incidents.viewAllEvents')}
						<ChevronRight size={14} />
					</Link>
				</div>
			)}
		</div>
	);
}
