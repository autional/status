/**
 * 服务健康状态
 * unknown = 无法判定（无监控 check 或 /ready 不可达）——不得折叠为 healthy/degraded
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Gateway 聚合健康检查响应
 */
export interface GatewayHealthResponse {
	status: HealthStatus;
	service: string;
	checks?: Record<string, HealthStatus>;
	timestamp: string;
	uptime?: string;
	version?: string;
	checks_latency?: Record<string, string>;
}

/**
 * 单个服务状态（Status Page 内部使用）
 */
export interface ServiceStatus {
	id: string;
	name?: string;
	status: HealthStatus;
	latency?: string;
	lastChecked: string;
	description?: string;
}

/**
 * 事件/事故严重级别
 */
export type IncidentSeverity = 'critical' | 'major' | 'minor' | 'maintenance';

/**
 * 事件/事故状态
 */
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'draft';

/**
 * 系统事件/事故
 */
export interface Incident {
	id: string;
	title: string;
	description: string;
	severity: IncidentSeverity;
	status: IncidentStatus;
	affectedServices: string[];
	createdAt: string;
	updatedAt: string;
	resolvedAt?: string;
	updates: IncidentUpdate[];
}

/**
 * 事件更新记录
 */
export interface IncidentUpdate {
	id: string;
	message: string;
	status: IncidentStatus;
	createdAt: string;
}

/**
 * 指标数据点（来自 Prometheus）
 */
export interface MetricsDataPoint {
	timestamp: string;
	value: number;
}

/**
 * 服务分组
 */
export interface ServiceGroup {
	id: string;
	name?: string;
	description?: string;
	services: string[]; // service IDs
}

/**
 * 维护状态
 */
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * 计划维护
 */
export interface Maintenance {
	id: string;
	title: string;
	description: string;
	scheduledStartAt: string;
	scheduledEndAt: string;
	affectedServices: string[];
	status: MaintenanceStatus;
	createdAt: string;
	updatedAt: string;
}

/**
 * 服务目录项（来自 GET /status/services）
 */
export interface ServiceCatalogItem {
	id: string;
	name: string;
	description: string;
	port: number;
	category: string;
}

/**
 * 服务分组项（来自 GET /status/services）
 */
export interface ServiceGroupItem {
	id: string;
	name: string;
	description: string;
	services: ServiceCatalogItem[];
}

/**
 * 服务目录响应（来自 GET /status/services）
 */
export interface ServiceCatalogResponse {
	groups: ServiceGroupItem[];
	allServices: ServiceCatalogItem[];
	totalCount: number;
	lastUpdated: string;
}
