import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
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

/** 「未接入监控」用信息色（蓝）：它既不是正常也不是故障，只是"没有证据"。 */
const UNMONITORED_ICON_TONE = 'bg-info-soft text-info-text';

/** 「未接入监控」的状态点：空心环（形状本身表示"没有数据"），信息色描边。 */
function UnmonitoredDot() {
	return (
		<span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-info bg-transparent" />
	);
}

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
	// 触屏（无 hover）拿不到 hover/focus 才出现的描述浮层 —— 移动端用户永远读不到
	// "这个服务是干嘛的"。修法不新增按钮（<a> 内不允许嵌 <button>）、不改文案：
	// 记录最近一次指针类型，触屏上**首次点按展开描述、再次点按才进详情**（评审建议的「点按展开」）。
	// 鼠标/键盘行为逐字不变（mouse 指针 + focus 仍与原来一致）。
	const pointerKind = useRef<'mouse' | 'touch'>('mouse');
	const pinned = useRef(false);

	const Icon = serviceIcon(service.id);
	const name = t('service.name.' + service.id);
	const description = t('service.desc.' + service.id);
	// 「未接入监控」：健康源可达但该服务没有探针条目 —— 独立状态，不并入"未知"也不并入"正常"
	const unmonitored = !!service.noProbe && service.status === 'unknown';
	const latency = formatLatency(service.latency);
	// 三种"没有延迟数字"的情况要分开说：
	//   未接入监控 → "无监控探针"
	//   健康源不可达 → "状态未知"
	//   其余（如 gateway 无探针但已判健康）→ "—"（免得"健康"和"无监控"叠在一行自相矛盾）
	const latencyText = latency
		? latency
		: unmonitored
			? t('service.noMonitor')
			: service.status === 'unknown'
				? t('service.statusUnknown')
				: '—';
	const labelKey = statusLabelKey(service.status);
	const statusLabel = unmonitored
		? t('status.unmonitored')
		: labelKey
			? t(labelKey)
			: service.status;

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

	const closePopover = () => {
		// 触屏钉住的浮层不因 mouseleave/blur 关闭：触屏点按后会补发一套兼容鼠标事件
		// （mouseenter→mouseleave），否则刚展开就被抢关。由「再次点按本磁贴」或
		// 「点按页面其它位置」（下方 document 捕获监听）关闭。
		if (pinned.current) return;
		setPopover(null);
	};

	const handlePointerDown = (e: ReactPointerEvent<HTMLAnchorElement>) => {
		pointerKind.current = e.pointerType === 'mouse' ? 'mouse' : 'touch';
	};

	const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
		if (pointerKind.current === 'touch' && !pinned.current) {
			e.preventDefault();
			openPopover();
			pinned.current = true;
		}
	};

	// 触屏浮层的解除：点按磁贴以外的任何位置即收起（捕获阶段，先于目标自身处理）
	useEffect(() => {
		const onDocPointerDown = (e: PointerEvent) => {
			if (!pinned.current) return;
			if (anchorRef.current?.contains(e.target as Node)) return;
			pinned.current = false;
			setPopover(null);
		};
		document.addEventListener('pointerdown', onDocPointerDown, true);
		return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
	}, []);

	return (
		<>
			<Link
				ref={anchorRef}
				to={`/services/${service.id}`}
				aria-label={`${name} — ${statusLabel}`}
				// 描述也进无障碍树：读屏（含移动端读屏）不必先跳转就能听到"这个服务是干嘛的"
				aria-description={description}
				className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${TILE_TONE[service.status]}`}
				onMouseEnter={openPopover}
				onMouseLeave={closePopover}
				onFocus={openPopover}
				onBlur={closePopover}
				onPointerDown={handlePointerDown}
				onClick={handleClick}
			>
				<span
					className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
						unmonitored ? UNMONITORED_ICON_TONE : ICON_TONE[service.status]
					}`}
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
				{unmonitored ? (
					<span title={t('status.unmonitored')}>
						<UnmonitoredDot />
					</span>
				) : (
					<StatusIndicator status={service.status} size="sm" quietHealthy />
				)}
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
						{unmonitored ? (
							<span className="flex items-center gap-2">
								<UnmonitoredDot />
								<span className="text-sm font-medium text-neutral-700">
									{t('status.unmonitored')}
								</span>
							</span>
						) : (
							<StatusIndicator status={service.status} size="sm" showLabel quietHealthy />
						)}
						{/* 磁贴正面只有数字、没有标签；在其浮层给同一条目冠名，使"这个数是什么"不再靠猜 ——
						    与详情页头部同一口径（网关探针往返）。
						    标签与数值必须同处一行：JSX 会折叠跨行空白，分行会粘成"网关探测延迟13.1ms"。 */}
						<span className="flex items-center gap-1 text-xs text-muted tabular-nums">
							<Clock size={11} />
							{t('service.latency')} {latencyText}
						</span>
					</div>
				</div>
			)}
		</>
	);
}
