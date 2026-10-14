import { describe, it, expect } from 'vitest';
import { Folder, Server } from 'lucide-react';
import { serviceIcon, groupIcon } from '../service-icon';
import { formatLatency } from '../format';

/** 线上 catalog（GET /status/services）的真实服务清单 —— 27 个。 */
const CATALOG_SERVICE_IDS = [
	'identity-service',
	'session-service',
	'mfa-service',
	'oauth-service',
	'profile-service',
	'tenant-service',
	'wallet-service',
	'point-service',
	'billing-service',
	'pay-service',
	'storage-service',
	'audit-service',
	'stream-service',
	'notification-service',
	'communication-service',
	'compliance-service',
	'config-service',
	'secret-service',
	'thirdparty-service',
	'verification-service',
	'captcha3d-service',
	'rbac-service',
	'saml-service',
	'hash-service-standard',
	'hash-service-sm',
	'gateway-service',
	'status-service',
];

const CATALOG_GROUP_IDS = [
	'authentication',
	'user-data',
	'business-platform',
	'operations',
	'access-control',
	'infrastructure',
];

describe('serviceIcon / groupIcon', () => {
	// 回归锁：此前所有服务共用同一个 <Server>、所有分组共用同一个 <Folder>，
	// 27 个条目长得一模一样。这里锁住"每个 catalog 服务都有专属图标"。
	it('catalog 中每个服务都有专属图标（不再全部回退 Server）', () => {
		const fallbacks = CATALOG_SERVICE_IDS.filter((id) => serviceIcon(id) === Server);
		expect(fallbacks).toEqual([]);
	});

	it('catalog 中每个分组都有专属图标（不再全部回退 Folder）', () => {
		const fallbacks = CATALOG_GROUP_IDS.filter((id) => groupIcon(id) === Folder);
		expect(fallbacks).toEqual([]);
	});

	it('图标互不相同（服务之间可区分）', () => {
		const icons = CATALOG_SERVICE_IDS.map((id) => serviceIcon(id));
		expect(new Set(icons).size).toBe(CATALOG_SERVICE_IDS.length);
	});

	it('未知 id 回退默认图标，不抛错', () => {
		expect(serviceIcon('brand-new-service')).toBe(Server);
		expect(groupIcon('brand-new-group')).toBe(Folder);
	});
});

describe('formatLatency', () => {
	it('压缩超精度小数（保留 1 位）', () => {
		expect(formatLatency('13.116463ms')).toBe('13.1ms');
		expect(formatLatency('2.901104ms')).toBe('2.9ms');
		expect(formatLatency('1.2345678s')).toBe('1.2s');
	});

	it('整数毫秒不留 .0', () => {
		expect(formatLatency('10ms')).toBe('10ms');
		expect(formatLatency('10.0ms')).toBe('10ms');
	});

	it('≥100ms 取整', () => {
		expect(formatLatency('123.456ms')).toBe('123ms');
		expect(formatLatency('999.9ms')).toBe('1000ms');
	});

	it('保留单位后缀（µs 等非 ms 单位不被吞）', () => {
		expect(formatLatency('500µs')).toBe('500µs');
	});

	it('空值返回 null（调用方回退文案）', () => {
		expect(formatLatency(undefined)).toBeNull();
		expect(formatLatency(null)).toBeNull();
		expect(formatLatency('')).toBeNull();
	});

	it('未知格式原样返回，不丢信息', () => {
		expect(formatLatency('N/A')).toBe('N/A');
		expect(formatLatency('~12')).toBe('~12');
	});
});
