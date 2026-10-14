import type { HealthStatus, IncidentSeverity, IncidentStatus } from '@/types';

export type StatusLike = HealthStatus | IncidentSeverity | IncidentStatus;

/**
 * 状态 → i18n 键映射（单一真源）。
 *
 * 此前只有 StatusIndicator 内部持有该表；总览页的状态墙 / 舰队全景条也需要
 * 「状态文案」（title / aria-label），故抽到此处，避免三份表各自漂移。
 */
export const STATUS_I18N_KEYS: Record<string, string> = {
	healthy: 'status.operational',
	degraded: 'status.degraded',
	unhealthy: 'status.down',
	unknown: 'status.unknown',
	critical: 'severity.critical',
	major: 'severity.major',
	minor: 'severity.minor',
	maintenance: 'severity.maintenance',
	investigating: 'status.investigating',
	identified: 'status.identified',
	monitoring: 'status.monitoring',
	resolved: 'status.resolved',
	draft: 'status.draft',
};

/** 取状态的 i18n 键；表外取值返回 undefined（调用方回退原文）。 */
export function statusLabelKey(status: string): string | undefined {
	return STATUS_I18N_KEYS[status];
}
