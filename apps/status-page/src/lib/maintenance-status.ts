/**
 * 维护状态 → 语义色调（**单一真源**）。
 *
 * 背景（T47 修复）：列表页的分支把 `in_progress` 并进 `scheduled` 的蓝色 ⇒ 4 种状态只有 3 种配色；
 * 而日历圆点此前**恒为 `bg-info` 蓝**，与图例「已完成 = 绿」的承诺不符。两处同因：颜色写死在渲染
 * 分支里、没有单一真源 ⇒ 本模块把「状态 → 色调 → class」收敛为三级映射，列表徽章 / 日历圆点 / 图例
 * 共用（详情页沿用其卡片形态，色相与本表一致：scheduled=蓝、in_progress=琥珀、completed=绿、
 * cancelled=中性）。
 */
export type MaintenanceTone = 'info' | 'warning' | 'success' | 'neutral';

export const MAINTENANCE_TONE: Record<string, MaintenanceTone> = {
	scheduled: 'info',
	in_progress: 'warning',
	completed: 'success',
	cancelled: 'neutral',
};

export const TONE_CLASS: Record<MaintenanceTone, { badge: string; dot: string }> = {
	info: {
		badge: 'bg-info-soft text-info-text dark:bg-info-soft/30 dark:text-info-text',
		dot: 'bg-info',
	},
	warning: {
		badge: 'bg-warning-soft text-warning-text dark:bg-warning-soft/30 dark:text-warning-text',
		dot: 'bg-warning',
	},
	success: {
		badge: 'bg-success-soft text-success-text dark:bg-success-soft/30 dark:text-success-text',
		dot: 'bg-success',
	},
	neutral: { badge: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
};

export function maintenanceTone(status?: string): MaintenanceTone {
	return MAINTENANCE_TONE[status ?? ''] ?? 'neutral';
}

/** 一天内多条维护时圆点取色优先级：进行中 > 计划中 > 已完成 > 已取消（把"当前有事"顶到最前）。 */
const DAY_PRIORITY: MaintenanceTone[] = ['warning', 'info', 'success', 'neutral'];

export function dayDotTone(statuses: string[]): MaintenanceTone {
	const tones = new Set(statuses.map(maintenanceTone));
	return DAY_PRIORITY.find((t) => tones.has(t)) ?? 'neutral';
}
