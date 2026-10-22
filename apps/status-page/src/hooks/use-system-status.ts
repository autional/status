import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
	fetchGatewayHealth,
	fetchIncidents,
	fetchIncidentList,
	fetchIncident,
	fetchMaintenances,
	fetchMaintenance,
	fetchLatencyMetrics,
	fetchUptimeMetrics,
	fetchOverview,
	fetchServiceCatalog,
	fetchRssXml,
	buildServiceStatuses,
} from '@/lib/api';
import type { IncidentListFilters } from '@/lib/api';

/**
 * 原始 gateway /ready 健康检查（checks: {svc}:{port} / grpc:{svc}）。
 * 服务清单派生见 useServiceStatuses（catalog × health）。
 */
export function useSystemStatus() {
	return useQuery({
		queryKey: ['system-status'],
		queryFn: fetchGatewayHealth,
		staleTime: 15000,
	});
}

/**
 * 服务状态列表 — 由 catalog（权威服务清单 25）+ /ready（实时状态）派生。
 * 单一事实来源，前端不再维护硬编码服务清单。
 */
export function useServiceStatuses() {
	const catalog = useServiceCatalog();
	const health = useSystemStatus();
	const data = useMemo(
		() => buildServiceStatuses(catalog.data ?? null, health.data ?? null),
		[catalog.data, health.data],
	);
	return {
		data,
		isLoading: catalog.isLoading || health.isLoading,
		isFetching: health.isFetching,
		refetch: health.refetch,
		// 失败态重试必须连 catalog 一起重取：catalog 才是服务清单来源，
		// 只重取 health 会在「清单请求失败」时永远重试不出来（ST2-01）。
		refetchAll: async () => {
			await Promise.all([catalog.refetch(), health.refetch()]);
		},
		isError: catalog.isError || health.isError,
	};
}

export function useOverview() {
	return useQuery({
		queryKey: ['overview'],
		queryFn: fetchOverview,
		staleTime: 15000,
	});
}

export function useIncidents() {
	return useQuery({
		queryKey: ['incidents'],
		queryFn: fetchIncidents,
		staleTime: 60000,
	});
}

/**
 * 事件列表（服务端筛选 + 信封 total）。
 *
 * 与 `useIncidents` 的差别（两条都为本单需要）：
 *   1. 透出响应里的 `total`（`useIncidents` 只给 items 数组，丢了 total ⇒ 空态无法三分诊）；
 *   2. 支持把 severity/status/service 下传服务端（此前只在首页 20 条内前端过滤）。
 *
 * 不传 filters 时与 `useIncidents` 打的是同一个 url，queryKey 归一后（null 占位）二者并行挂载
 * 也只发一次请求 —— `/incidents` 页正是靠"无筛选的同源查询"拿到数据集真实总数。
 */
export function useIncidentList(filters?: IncidentListFilters) {
	const severity = filters?.severity ?? null;
	const status = filters?.status ?? null;
	const service = filters?.service ?? null;
	return useQuery({
		queryKey: ['incident-list', severity, status, service],
		queryFn: () =>
			fetchIncidentList({
				severity: severity ?? undefined,
				status: status ?? undefined,
				service: service ?? undefined,
			}),
		staleTime: 60000,
	});
}

export function useIncident(id: string) {
	return useQuery({
		queryKey: ['incident', id],
		queryFn: () => fetchIncident(id),
		staleTime: 60000,
		enabled: !!id,
	});
}

export function useMaintenances() {
	return useQuery({
		queryKey: ['maintenances'],
		queryFn: fetchMaintenances,
		staleTime: 60000,
	});
}

export function useMaintenance(id: string) {
	return useQuery({
		queryKey: ['maintenance', id],
		queryFn: () => fetchMaintenance(id),
		staleTime: 60000,
		enabled: !!id,
	});
}

export function useLatencyMetrics(serviceId: string, rangeVal = '24h') {
	return useQuery({
		queryKey: ['latency-metrics', serviceId, rangeVal],
		queryFn: () => fetchLatencyMetrics(serviceId, rangeVal),
		staleTime: 60000,
		enabled: !!serviceId,
	});
}

export function useUptimeMetrics(serviceId: string, rangeVal = '24h') {
	return useQuery({
		queryKey: ['uptime-metrics', serviceId, rangeVal],
		queryFn: () => fetchUptimeMetrics(serviceId, rangeVal),
		staleTime: 60000,
		enabled: !!serviceId,
	});
}

export function useServiceCatalog() {
	return useQuery({
		queryKey: ['service-catalog'],
		queryFn: fetchServiceCatalog,
		staleTime: 5 * 60 * 1000,
	});
}

export function useRssXml() {
	return useQuery({
		queryKey: ['rss-feed'],
		queryFn: fetchRssXml,
		staleTime: 5 * 60 * 1000,
	});
}
