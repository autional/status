import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { HealthStatus, ServiceStatus } from '@/types';
import { serviceIcon } from '@/lib/service-icon';
import { statusLabelKey } from '@/lib/status-label';
import { formatLatency } from '@/lib/format';
import StatusIndicator from './StatusIndicator';

interface ServiceTileProps {
	service: ServiceStatus;
}

/**
 * 磁贴配色（安静模式）：默认中性、没有颜色；只有异常才上色。
 * 满屏绿色会让"哪有问题"淹没在噪声里——中性为底、红为号，扫一眼就能找到需要看的东西。
 * unknown 用虚线边框（"没有数据"的形状语义），与中性实线的 healthy 区分开。
 */
const TILE_TONE: Record<HealthStatus, string> = {
	healthy:
		'border-neutral-200 bg-neutral-0 hover:border-neutral-300 dark:border-neutral-700 dark:bg-surface/40 dark:hover:border-neutral-600',
	degraded:
		'border-warning-soft bg-warning-soft/40 hover:border-warning dark:border-warning-soft/60 dark:bg-warning/10',
	unhealthy:
		'border-danger-soft bg-danger-soft/40 hover:border-danger dark:border-danger-soft/60 dark:bg-danger-soft/10',
	unknown:
		'border-dashed border-neutral-300 bg-neutral-0 hover:border-neutral-400 dark:border-neutral-600 dark:bg-surface/40 dark:hover:border-neutral-500',
};

/** 图标底盘：中性底 + 中性图标；异常态才用状态色，让图标本身也成为"出事了"的信号。 */
const ICON_TONE: Record<HealthStatus, string> = {
	healthy: 'bg-neutral-100 text-muted',
	degraded: 'bg-warning-soft text-warning-text',
	unhealthy: 'bg-danger-soft text-danger-text',
	unknown: 'bg-neutral-100 text-muted',
};


const POPOVER_WIDTH = 288;
const POPOVER_MARGIN = 12;
const POPOVER_MAX_HALF = POPOVER_WIDTH / 2;

interface PopoverPosition {
	left: number;
	top: number;
	placement: 'top' | 'bottom';
}

export default function ServiceTile({ service }: ServiceTileProps) {
	const { t } = useTranslation();
	const anchorRef = useRef<HTMLAnchorElement>(null);
	const [popover, setPopover] = useState<PopoverPosition | null>(null);

	const Icon = serviceIcon(service.id);
	const name = t('service.name.' + service.id);
	const description = t('service.desc.' + service.id);
	const latency = formatLatency(service.latency);
	// 无探针时：unknown 明确说"无监控探针"（不冒充健康）；其余状态（如 gateway 自报健康但无探针）用 "—"，
	// 免得把"健康"和"无监控"两句话叠在同一条上自相矛盾。
	const latencyText =
		latency ?? (service.status === 'unknown' ? t('service.noMonitor') : '—');
	const labelKey = statusLabelKey(service.status);
	const statusLabel = labelKey ? t(labelKey) : service.status;

	// 浮层用 fixed 定位并夹在视口内：磁贴格子窄、分组容器带 overflow-hidden，
	// 若用 absolute 会被裁切，故按锚点矩形自行算坐标。
	const openPopover = () => {
		const el = anchorRef.current;
		if (!el || typeof window === 'undefined') return;
		const rect = el.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const maxLeft = window.innerWidth - POPOVER_MARGIN - POPOVER_MAX_HALF;
		const minLeft = POPOVER_MARGIN + POPOVER_MAX_HALF;
		setPopover({
			left: Math.min(Math.max(centerX, minLeft), maxLeft),
			top: rect.top > 240 ? rect.top : rect.bottom,
			placement: rect.top > 240 ? 'top' : 'bottom',
		});
	};

	const closePopover = () => setPopover(null);

	return (
		<>
			<Link
				ref={anchorRef}
				to={`/services/${service.id}`}
				aria-label={`${name} — ${statusLabel}`}
				className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${TILE_TONE[service.status]}`}
				onMouseEnter={openPopover}
				onMouseLeave={closePopover}
				onFocus={openPopover}
				onBlur={closePopover}
			>
				<span
					className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[service.status]}`}
				>
					<Icon size={16} />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-[13px] font-semibold text-neutral-900">
						{name}
					</span>
					<span className="block truncate text-[11px] text-muted tabular-nums">
						{latencyText}
					</span>
				</span>
				<StatusIndicator status={service.status} size="sm" quietHealthy />
			</Link>

			{popover && (
				<div
					role="tooltip"
					style={{
						left: popover.left,
						top: popover.top,
						transform:
							popover.placement === 'top'
								? 'translate(-50%, -100%) translateY(-8px)'
								: 'translate(-50%, 0) translateY(8px)',
					}}
					className="pointer-events-none fixed z-50 w-72 rounded-lg border border-neutral-200 bg-neutral-0 p-3 shadow-card dark:border-neutral-700"
				>
					<p className="text-[13px] font-semibold text-neutral-900">{name}</p>
					<p className="mt-1 text-xs leading-snug text-muted">{description}</p>
					<div className="mt-2 flex items-center justify-between gap-3 border-t border-neutral-100 pt-2 dark:border-neutral-800">
						<StatusIndicator status={service.status} size="sm" showLabel quietHealthy />
						<span className="flex items-center gap-1 text-xs text-muted tabular-nums">
							<Clock size={11} />
							{latencyText}
						</span>
					</div>
				</div>
			)}
		</>
	);
}
