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
			// 「未接入监控」：健康源可达、但这个服务没有探针条目 —— 与"健康源整体不可达"
			// （health 为 null，全部 unknown）必须分开表达，否则会把"探针清单缺项"说成
			// "状态未知"，也会把"网关抓不到"说成"这服务没监控"。
			noProbe: !!health && !checkKey && item.id !== 'gateway-service',
			latency: checkKey ? latencies[checkKey] : undefined,
			// 不伪造时间戳：/ready 不可达时没有可信的"最后检测时间"，
			// 此前用 `new Date()` 兜底 ⇒ 状态是 unknown 却显示"刚刚更新"（假新鲜度）。
			lastChecked: health?.timestamp,
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

/** 事件列表查询参数 —— 后端 ListIncidentsRequest 已支持（severity/status/service/page/page_size）。 */
export interface IncidentListFilters {
	/** 严重级别：critical / major / minor / maintenance */
	severity?: string;
	/** 事件状态：investigating / identified / monitoring / resolved */
	status?: string;
	/** 影响的服务 ID */
	service?: string;
	page?: number;
	page_size?: number;
}

export interface IncidentListResult {
	items: Incident[];
	/**
	 * 响应信封里的 total —— **当前筛选下**匹配的总条数（不是当前页条数，也不是数据集条数）。
	 *
	 * 后端列表接口本来就返回它（`dto_base.ListResponse.total`，与 `pagination.total` 同源），
	 * 此前前端 `return res.items ?? []` 把它丢了 ⇒「筛掉的全空」与「压根没有事件」在页面上
	 * 长得一模一样（`docs/STATUS-UI-SEMANTICS-OPTIONS.md` §4.1）。
	 */
	total: number;
}

/**
 * 事件列表（带分页/筛选信封）。
 *
 * severity/status/service 直接**下传服务端**（`Generated.statusIncidents` 已支持这些 query 参数），
 * 不再只对首页 20 条做前端过滤 —— 否则匹配项落在第 21 条之后时，页面会错报
 * 「没有符合条件的事件」（同上 §4.1(b)）。
 *
 * 注意：**不加 try/catch**（与 `fetchIncidents` 一致）—— 抛给 react-query 才能让 `isError` 生效，
 * 页面据此渲染"取不到"而非假绿空态（§4.1(c)）。
 */
export async function fetchIncidentList(
	filters?: IncidentListFilters,
): Promise<IncidentListResult> {
	const res = await Generated.statusIncidents(filters);
	const payload = res as
		| { items?: Incident[]; total?: number; pagination?: { total?: number } }
		| null
		| undefined;
	const items: Incident[] = payload?.items ?? [];
	const total = Number(payload?.total ?? payload?.pagination?.total ?? items.length);
	return { items, total };
}

export async function fetchIncidents(): Promise<Incident[]> {
	return (await fetchIncidentList()).items;
}

/**
 * 详情类 fetch 的错误语义（T43）：**只有真 404** 映射为 null（="不存在"），其余错误一律**抛出**
 * ⇒ 交给 react-query 的 `isError`（="取不到"）。
 *
 * 反面教材（本文件历史）：try/catch 吞错 + `return null` ⇒ react-query 视为成功 ⇒ `isError`
 * 恒为 false ⇒ 页面的失败态成**死代码**（2026-10-16 线上复测实证：注入 500 时详情页仍显示
 * "未找到"，与新加的警示卡分支不符）。
 */
function isNotFound(err: unknown): boolean {
	return (err as { response?: { status?: number } })?.response?.status === 404;
}

export async function fetchIncident(id: string): Promise<Incident | null> {
	try {
		return (await Generated.statusIncidentsByIncidents(id)) as Incident;
	} catch (err) {
		if (isNotFound(err)) return null;
		// 非 404 ⇒ 抛出（让 react-query 的 isError 生效："取不到 ≠ 不存在"）
		devWarn('[StatusPage] status-service incident fetch failed (non-404; rethrow to set isError):', err);
		throw err;
	}
}

export async function fetchMaintenances(): Promise<Maintenance[]> {
	const res = (await Generated.statusMaintenances()) as { items?: Maintenance[] } | null;
	return res?.items ?? [];
}

export async function fetchMaintenance(id: string): Promise<Maintenance | null> {
	try {
		return (await Generated.statusMaintenancesByMaintenances(id)) as Maintenance;
	} catch (err) {
		if (isNotFound(err)) return null;
		// 非 404 ⇒ 抛出（让 react-query 的 isError 生效："取不到 ≠ 不存在"）
		devWarn('[StatusPage] status-service maintenance fetch failed (non-404; rethrow to set isError):', err);
		throw err;
	}
}

// 说明（T43）：本文件另有若干 fetch（overview / metrics / rss / 订阅偏好）仍保留
// "catch ⇒ return null" 的吞错写法 —— 其调用方（页面）目前都以 null 为正常缺省、**不**依赖
// `isError`，故本次不动（改动它们会影响各页的 null 分支）。若将来要给这些入口加失败态，
// **必须**先让错误抛出，否则同样会得到死代码。
// 例外：fetchServiceCatalog 已改为抛出（ST2-01），因为服务详情必须区分「取不到」与「不存在」。

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

/**
 * 服务目录：**不吞错**。catalog 是服务详情的唯一清单来源，
 * 吞错返回 null 会让 react-query 的 isError 恒为 false ⇒ 页面无法区分
 * 「清单取不到」与「服务不存在」（ST2-01）。
 */
export async function fetchServiceCatalog(): Promise<ServiceCatalogResponse> {
	return (await Generated.statusServices()) as ServiceCatalogResponse;
}

export async function fetchRssXml(lang: 'zh' | 'en' = 'zh'): Promise<string | null> {
	try {
		const { apiClient } = await import('@autional/shared');
		// @generated-api-exempt: RSS endpoint needs Accept: application/rss+xml header
		const res = await apiClient.get('/status/api/v1/status/rss', {
			headers: { Accept: 'application/rss+xml' },
			params: { lang },
		});
		return (res as { data?: string | null } | null)?.data ?? null;
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
		await Generated.statusSubscriptionsPost({ email });
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
		await Generated.statusSubscriptionsDelete({ token });
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
