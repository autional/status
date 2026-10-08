import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Pause, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RefreshCountdownProps {
	intervalMs?: number;
	onRefresh?: () => void;
}

export default function RefreshCountdown({ intervalMs = 30000, onRefresh }: RefreshCountdownProps) {
	const { t } = useTranslation();
	const [remaining, setRemaining] = useState(intervalMs);
	const [paused, setPaused] = useState(false);
	const [isBackground, setIsBackground] = useState(false);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const effectiveInterval = isBackground ? intervalMs * 2 : intervalMs;

	const startTimer = useCallback(() => {
		if (timerRef.current) clearInterval(timerRef.current);
		timerRef.current = setInterval(() => {
			setRemaining((prev) => {
				const next = prev - 1000;
				if (next <= 0) {
					if (!paused) {
						onRefresh?.();
					}
					return effectiveInterval;
				}
				return next;
			});
		}, 1000);
	}, [effectiveInterval, onRefresh, paused]);

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

	useEffect(() => {
		if (paused) {
			if (timerRef.current) clearInterval(timerRef.current);
		} else {
			startTimer();
		}
	}, [paused, startTimer]);

	const seconds = Math.ceil(remaining / 1000);
	const progress = (remaining / effectiveInterval) * 100;

	return (
		<div className="flex items-center gap-2">
			<div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
				<div
					className={`absolute left-0 top-0 h-full rounded-full bg-primary-500 transition-all duration-1000 ease-linear ${paused ? 'opacity-50' : ''}`}
					style={{ width: `${progress}%` }}
				/>
			</div>
			<span className="text-xs tabular-nums text-muted">
				{paused ? t('paused') : `${seconds}s`}
			</span>
			<button
				onClick={() => {
					onRefresh?.();
					setRemaining(effectiveInterval);
				}}
				className="rounded-xs p-1 text-muted hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
				title={t('refresh')}
			>
				<RefreshCw size={12} />
			</button>
			<button
				onClick={() => setPaused((p) => !p)}
				className="rounded-xs p-1 text-muted hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
				title={paused ? t('resume') : t('pause')}
			>
				{paused ? <Play size={12} /> : <Pause size={12} />}
			</button>
		</div>
	);
}
