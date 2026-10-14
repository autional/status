import { useEffect, useState, useRef, useCallback } from 'react';

interface RefreshCountdownProps {
	intervalMs?: number;
	onRefresh?: () => void;
}

const RING_SIZE = 44;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * 自动刷新倒计时 —— **圆环**，剩余秒数居中。
 *
 * 设计取舍（2026-10-14 用户要求）：
 *   · 去掉「立即刷新」与「暂停/恢复」两个按钮 —— 自动刷新本身就是承诺的行为，
 *     手动入口与暂停态都是多余的操作面；用户要刷新就刷新页面。
 *   · 环形进度替代线性条：线性条要占满整行宽度，圆环只占 44px，能把秒数放在圆心，
 *     视觉重量集中、不跟卡片里的其它文字抢横向空间。
 *   · 纯视觉（aria-hidden）：不注册 role="timer"/live region —— 每秒播报会把读屏
 *     用户烦死；"会自动刷新"这层语义由卡片里的「每 N 秒自动刷新」文案承担。
 */
export default function RefreshCountdown({ intervalMs = 30000, onRefresh }: RefreshCountdownProps) {
	const [remaining, setRemaining] = useState(intervalMs);
	const [isBackground, setIsBackground] = useState(false);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// 标签页不可见时降频（省电、省请求）；回到前台即恢复原间隔。
	const effectiveInterval = isBackground ? intervalMs * 2 : intervalMs;

	const startTimer = useCallback(() => {
		if (timerRef.current) clearInterval(timerRef.current);
		timerRef.current = setInterval(() => {
			setRemaining((prev) => {
				const next = prev - 1000;
				if (next <= 0) {
					onRefresh?.();
					return effectiveInterval;
				}
				return next;
			});
		}, 1000);
	}, [effectiveInterval, onRefresh]);

	useEffect(() => {
		setRemaining(effectiveInterval);
		startTimer();

		const handleVisibility = () => {
			const hidden = document.hidden;
			setIsBackground(hidden);
			if (hidden) {
				setRemaining((prev) => Math.min(prev, effectiveInterval));
			}
		};

		document.addEventListener('visibilitychange', handleVisibility);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [effectiveInterval, startTimer]);

	const seconds = Math.ceil(remaining / 1000);
	const fraction = Math.max(0, Math.min(1, remaining / effectiveInterval));
	// 圆环随剩余时间收缩：满圈 = 刚刷新过，走空 = 即将刷新。
	//
	// ⚠️ 符号为负是刻意的（2026-10-14 用户报"方向反了"）：
	//   strokeDashoffset 为正 ⇒ 可见弧 = 路径 [0, C·fraction] ⇒ 弧钉在 12 点、**远端逆时针回缩**
	//     ⇒ 缺口从 12 点往左扩，读起来像钟表倒着走；
	//   取负 ⇒ 可见弧 = 路径 [(1−fraction)·C, C] ⇒ 弧尾扫过、**起端顺时针推进**收向 12 点
	//     ⇒ 缺口从 12 点往右扩，与秒针同向。
	// 证据：用同一套 stroke 数学渲染的对照图（.temp/ring-big.png，红线标 12 点方向）。
	const dashOffset = -RING_CIRCUMFERENCE * (1 - fraction);

	return (
		<div
			className="relative inline-flex shrink-0 items-center justify-center"
			style={{ width: RING_SIZE, height: RING_SIZE }}
			aria-hidden="true"
		>
			<svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
				<circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={RING_RADIUS}
					fill="none"
					strokeWidth={RING_STROKE}
					className="stroke-neutral-200 dark:stroke-neutral-700"
				/>
				<circle
					cx={RING_SIZE / 2}
					cy={RING_SIZE / 2}
					r={RING_RADIUS}
					fill="none"
					strokeWidth={RING_STROKE}
					strokeLinecap="round"
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={dashOffset}
					className="stroke-primary-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
				/>
			</svg>
			<span className="absolute text-[11px] font-semibold tabular-nums text-neutral-600 dark:text-neutral-300">
				{seconds}s
			</span>
		</div>
	);
}
