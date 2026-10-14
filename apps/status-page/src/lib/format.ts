import i18n from '@/i18n';

function getLocale(): string {
	const lang = i18n.language;
	if (lang === 'zh-CN') return 'zh-CN';
	return 'en-US';
}

export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString(getLocale(), {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatShortDateTime(iso: string): string {
	return new Date(iso).toLocaleString(getLocale(), {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatDateOnly(iso: string): string {
	return new Date(iso).toLocaleDateString(getLocale());
}

export function formatTimeOnly(iso: string): string {
	return new Date(iso).toLocaleTimeString(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatTimeWithSeconds(iso: string): string {
	return new Date(iso).toLocaleTimeString(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

/**
 * 延迟去噪：网关 /ready 的 checks_latency 是 Go time.Duration 直出，
 * 形如 "13.116463ms" / "1.2345678s" —— 6~7 位小数对用户是纯噪音。
 *
 * 契约：
 *   · 保留原始单位后缀，只压缩数字（≥100 取整，否则 1 位小数）；
 *   · 空值 → null（调用方决定回退文案）；
 *   · 非 "<数字><单位>" 形态（未知格式）→ 原样返回，绝不吞掉信息。
 */
export function formatLatency(raw?: string | null): string | null {
	if (!raw) return null;
	const match = /^\s*(\d+(?:\.\d+)?)\s*([a-zA-Zµ]*s)\s*$/.exec(raw);
	if (!match) return raw.trim() || null;
	const value = Number(match[1]);
	if (!Number.isFinite(value)) return raw.trim();
	const digits =
		value >= 100 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, '');
	return `${digits}${match[2]}`;
}

