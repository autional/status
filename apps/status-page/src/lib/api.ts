import type {
	GatewayHealthResponse,
	Incident,
	Maintenance,
	ServiceStatus,
	HealthStatus,
	ServiceGroup,
	MetricsDataPoint,
	ServiceCatalogResponse,
	ServiceCatalogItem,
} from '@/types';
import * as Generated from '@autional/shared/generated/api';

const isDev = import.meta.env.DEV;
const devWarn = (...args: unknown[]) => {
	if (isDev) console.warn(...args);
};

// ═══════════════════════════════════════════════════════════════
// Gateway Health API
// ═══════════════════════════════════════════════════════════════

export async function fetchGatewayHealth(): Promise<GatewayHealthResponse | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);

	let res: Response;
	try {
		res = await fetch('/ready', {
			headers: { Accept: 'application/json' },
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timer);
	}

	let data: unknown;
	try {
		data = await res.json();
	} catch {
		// /ready 被 nginx SPA fallback 吞掉或返回非 JSON（如 text/html）时不抛致命错误，
		// 返回 null 让调用方（StatusLayout/Dashboard）回退到 overview 数据。
		devWarn(
			`[StatusPage] /ready returned non-JSON response (HTTP ${res.status}, content-type: ${res.headers.get('content-type')}); falling back to overview`,
		);
		return null;
	}

	if (data && typeof data === 'object' && ('status' in data || 'checks' in data)) {
		return data as GatewayHealthResponse;
	}

	throw new Error(`Unexpected health response format (HTTP ${res.status})`);
}

// ═══════════════════════════════════════════════════════════════
// 服务清单与状态映射 — 单一事实来源：catalog API（cross/registry 派生）
// ═══════════════════════════════════════════════════════════════
//
// 历史上 SERVICE_CONFIG/SERVICE_GROUPS 在前端硬编码服务清单，曾导致
// 前端 15 / overview 22 / catalog 25 三源漂移。现全部从 catalog API
// （GET /status/services，由 cross/registry StatusServiceGroups 派生）
// 构建，前端不再维护任何服务清单。

/**
 * 由 catalog（权威服务清单）+ /ready（实时状态）派生 ServiceStatus[]。
 *
 * /ready check key 规律（micro-pkg/health + micro-middleware/gateway/health.go）：
 *   - HTTP upstream check: `{service}:{port}`（gateway 路由 upstream host:port）
 *   - gRPC check: `grpc:{service}`（hash-standard/hash-sm 等仅 gRPC 服务）
 *   - gateway-service 无 self-check（/ready 由它自身提供），health 可达时视为 healthy
 *   - grafana:3000 等非 catalog 检查被自然忽略
 *
 * 无 check 映射 / health 整体不可达 ⇒ 'unknown'（绝不默认 healthy——那会把"没监控"
 * 渲染成"全绿"，见 status 内容审计 V-01）。
 */
export function buildServiceStatuses(
	catalog: ServiceCatalogResponse | null,
	health: GatewayHealthResponse | null,
): ServiceStatus[] {
	if (!catalog) return [];
	const checks = health?.checks || {};
	const latencies = health?.checks_latency || {};
	const items: ServiceCatalogItem[] = catalog.allServices?.length
		? catalog.allServices
		: (catalog.groups || []).flatMap((g) => g.services);

	return items.map((item) => {
		const checkKey = findStatusCheckKey(checks, item);
		let status: HealthStatus = 'unknown';
		if (checkKey) {
			status = checks[checkKey];
		} else if (health && item.id === 'gateway-service') {
			status = 'healthy';
		}
		return {
			id: item.id,
			status,
			latency: checkKey ? latencies[checkKey] : undefined,
			lastChecked: health?.timestamp ?? new Date().toISOString(),
		};
	});
}

function findStatusCheckKey(
	checks: Record<string, HealthStatus>,
	item: ServiceCatalogItem,
): string | undefined {
	// 1) HTTP check: {id}:{port}
	if (item.port && checks[`${item.id}:${item.port}`]) return `${item.id}:${item.port}`;
	// 2) gRPC check: grpc:{id}
	if (checks[`grpc:${item.id}`]) return `grpc:${item.id}`;
	// 3) 兜底：key 包含服务 id（兼容历史 key 变体）
	return Object.keys(checks).find((k) => k.includes(item.id));
}

/**
 * 由 catalog.groups 派生前端分组结构（id/name/description/services ids）。
 * 分组语义（6 组 25 服务）由后端 cross/registry 定义，前端零硬编码。
 */
export function buildGroupStructure(catalog: ServiceCatalogResponse | null): ServiceGroup[] {
	if (!catalog?.groups?.length) return [];
	return catalog.groups.map((g) => ({
		id: g.id,
		name: g.name,
		description: g.description,
		services: g.services.map((s) => s.id),
	}));
}

export interface OverviewData {
	/** 后端词表（operational/degraded/unavailable），非 HealthStatus —— 消费前必须过 normalizeOverallStatus */
	overallStatus: string;
	servicesTotal: number;
	servicesHealthy: number;
	activeIncidents: number;
	lastUpdated: string;
}

/**
 * overall status 归一化 —— 两个数据源词表不同：
 *   - gateway /ready:      healthy / degraded / unhealthy
 *   - status-service:      operational / degraded / unavailable（unavailable = 服务端无法聚合，
 *     不等于"挂着"，映射 unknown 灰显）
 * 未知取值按 unknown 处理（灰显，既不得误报全绿也不得把"未知"渲染成"故障"），
 * 且任何词表漂移都不得再让整站白屏。
 */
const OVERALL_STATUS_MAP: Record<string, HealthStatus> = {
	healthy: 'healthy',
	operational: 'healthy',
	degraded: 'degraded',
	unhealthy: 'unhealthy',
	unavailable: 'unknown',
};

export function normalizeOverallStatus(raw?: string | null): HealthStatus | null {
	if (!raw) return null;
	const mapped = OVERALL_STATUS_MAP[raw];
	if (!mapped) {
		devWarn(`[StatusPage] unknown overall status "${raw}" — rendering as unknown`);
	}
	return mapped ?? 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// Status Service API — delegated to Generated.*
// ═══════════════════════════════════════════════════════════════

export async function fetchOverview(): Promise<OverviewData | null> {
	try {
		return (await Generated.statusOverview()) as OverviewData;
	} catch (err) {
		devWarn('[StatusPage] status-service overview fetch failed:', err);
		return null;
	}
}

export async function fetchIncidents(): Promise<Incident[]> {
	const res = await Generated.statusIncidents();
	return (res as any)?.items ?? [];
}

export async function fetchIncident(id: string): Promise<Incident | null> {
	try {
		return (await Generated.statusIncidentsByIncidents(id)) as Incident;
	} catch (err) {
		devWarn('[StatusPage] status-service incident fetch failed:', err);
		return null;
	}
}

export async function fetchMaintenances(): Promise<Maintenance[]> {
	const res = await Generated.statusMaintenances();
	return (res as any)?.items ?? [];
}

export async function fetchMaintenance(id: string): Promise<Maintenance | null> {
	try {
		return (await Generated.statusMaintenancesByMaintenances(id)) as Maintenance;
	} catch (err) {
		devWarn('[StatusPage] status-service maintenance fetch failed:', err);
		return null;
	}
}

export interface LatencyMetricsResult {
	service: string;
	range: string;
	points: MetricsDataPoint[];
	/** Prometheus 数据源是否可用（后端未部署监控栈时为 false） */
	available?: boolean;
}

export interface UptimeMetricsResult {
	service: string;
	range: string;
	points: MetricsDataPoint[];
	/** Prometheus 数据源是否可用（后端未部署监控栈时为 false） */
	available?: boolean;
}

export async function fetchLatencyMetrics(
	serviceId: string,
	rangeVal = '24h',
): Promise<LatencyMetricsResult | null> {
	try {
		return (await Generated.statusMetricsLatency({
			service: serviceId,
			range: rangeVal,
		})) as LatencyMetricsResult;
	} catch (err) {
		devWarn('[StatusPage] latency metrics fetch failed:', err);
		return null;
	}
}

export async function fetchUptimeMetrics(
	serviceId: string,
	rangeVal = '24h',
): Promise<UptimeMetricsResult | null> {
	try {
		return (await Generated.statusMetricsUptime({
			service: serviceId,
			range: rangeVal,
		})) as UptimeMetricsResult;
	} catch (err) {
		devWarn('[StatusPage] uptime metrics fetch failed:', err);
		return null;
	}
}

export async function fetchServiceCatalog(): Promise<ServiceCatalogResponse | null> {
	try {
		return (await Generated.statusServices()) as ServiceCatalogResponse;
	} catch (err) {
		devWarn('[StatusPage] service catalog fetch failed:', err);
		return null;
	}
}

export async function fetchRssXml(): Promise<string | null> {
	try {
		const { apiClient } = await import('@autional/shared');
		// @generated-api-exempt: RSS endpoint needs Accept: application/rss+xml header
		const res = await apiClient.get('/status/api/v1/status/rss', {
			headers: { Accept: 'application/rss+xml' },
		});
		return (res as any)?.data ?? null;
	} catch (err) {
		devWarn('[StatusPage] RSS feed fetch failed:', err);
		return null;
	}
}

export interface SubscribeResult {
	success: boolean;
	message?: string;
	code?: string;
}

export async function subscribeEmail(email: string): Promise<SubscribeResult> {
	try {
		await Generated.statusSubscriptionsPost({ email } as any);
		return { success: true, code: 'subscribe.successCreated' };
	} catch (err) {
		devWarn('[StatusPage] status-service subscription failed:', err);
		return { success: false, code: 'subscribe.subscribeError' };
	}
}

export async function verifySubscription(token: string): Promise<SubscribeResult> {
	try {
		await Generated.statusSubscriptionsVerifyPost({ token });
		return { success: true, code: 'verify.success' };
	} catch (err) {
		const isTimeout =
			err &&
			typeof err === 'object' &&
			'code' in err &&
			(err as Record<string, unknown>).code === 'ECONNABORTED';
		return { success: false, code: isTimeout ? 'verify.timeoutError' : 'verify.failError' };
	}
}

export async function unsubscribeEmail(token: string): Promise<SubscribeResult> {
	try {
		await Generated.statusSubscriptionsDelete({ token } as any);
		return { success: true, code: 'subscribe.unsubscribeSuccess' };
	} catch (err) {
		devWarn('[StatusPage] unsubscribe failed:', err);
		return { success: false, code: 'subscribe.unsubscribeError' };
	}
}

export interface SubscriptionPreferences {
	email: string;
	notifyIncidents: boolean;
	notifyMaintenance: boolean;
	notifyRecovery: boolean;
	digestFrequency: string;
	categories: string[];
	verified: boolean;
	createdAt: string;
	updatedAt: string;
}

/** 偏好读写结果——invalidToken 与一般错误分开，页面据此给不同文案（不是"保存失败"而是"链接失效"） */
export type SubscriptionPreferencesResult =
	| { kind: 'ok'; prefs: SubscriptionPreferences }
	| { kind: 'invalidToken' }
	| { kind: 'error' };

/** token 无效/缺失 → HTTP 400（error.status.invalid_token = 61190005 → 400） */
function isInvalidTokenError(err: unknown): boolean {
	return (err as { response?: { status?: number } })?.response?.status === 400;
}

// U349：偏好读写以订阅管理令牌为键（后端已由 email 改为 token，邮箱枚举面收口）。
// 生成的 SDK（shared rc.16）仍是 email 形状，按既有 @generated-api-exempt 惯例直连
// apiClient；待 shared 下次再生成后换回 Generated.*。
export async function fetchSubscriptionPreferences(
	token: string,
): Promise<SubscriptionPreferencesResult> {
	try {
		const { apiClient } = await import('@autional/shared');
		// @generated-api-exempt: token-keyed preferences (generated shape is email-based)
		const res = await apiClient.get('/status/api/v1/status/subscriptions/preferences', {
			params: { token },
		});
		return { kind: 'ok', prefs: res.data as SubscriptionPreferences };
	} catch (err) {
		devWarn('[StatusPage] subscription preferences fetch failed:', err);
		return { kind: isInvalidTokenError(err) ? 'invalidToken' : 'error' };
	}
}

export async function updateSubscriptionPreferences(
	token: string,
	prefs: Partial<
		Pick<
			SubscriptionPreferences,
			'notifyIncidents' | 'notifyMaintenance' | 'notifyRecovery' | 'digestFrequency' | 'categories'
		>
	>,
): Promise<SubscriptionPreferencesResult> {
	try {
		const { apiClient } = await import('@autional/shared');
		// @generated-api-exempt: token-keyed preferences (generated shape is email-based)
		const res = await apiClient.put('/status/api/v1/status/subscriptions/preferences', {
			token,
			...prefs,
		});
		return { kind: 'ok', prefs: res.data as SubscriptionPreferences };
	} catch (err) {
		devWarn('[StatusPage] subscription preferences update failed:', err);
		return { kind: isInvalidTokenError(err) ? 'invalidToken' : 'error' };
	}
}
