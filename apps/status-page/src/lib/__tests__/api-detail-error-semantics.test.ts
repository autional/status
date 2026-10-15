import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@autional/shared/generated/api', () => ({
	statusIncidentsByIncidents: vi.fn(),
	statusMaintenancesByMaintenances: vi.fn(),
}));

import * as Generated from '@autional/shared/generated/api';
import { fetchIncident, fetchMaintenance } from '@/lib/api';

// T43 回归锁：详情 fetcher 的错误语义 ——
// 只有真 404 映射为 null（"不存在"），其余错误必须**抛出**，否则 react-query 的 isError 恒为
// false、页面的失败态成死代码（2026-10-16 线上复测实证：注入 500 时详情页显示"未找到"）。
describe('detail fetch error semantics (T43)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('maps a real 404 to null (means "not found") — incident', async () => {
		vi.mocked(Generated.statusIncidentsByIncidents).mockRejectedValue({
			response: { status: 404 },
		} as never);
		await expect(fetchIncident('x')).resolves.toBeNull();
	});

	it('rethrows a 500 (means "unavailable") so isError can fire — incident', async () => {
		vi.mocked(Generated.statusIncidentsByIncidents).mockRejectedValue({
			response: { status: 500 },
		} as never);
		await expect(fetchIncident('x')).rejects.toBeTruthy();
	});

	it('maps a real 404 to null (means "not found") — maintenance', async () => {
		vi.mocked(Generated.statusMaintenancesByMaintenances).mockRejectedValue({
			response: { status: 404 },
		} as never);
		await expect(fetchMaintenance('x')).resolves.toBeNull();
	});

	it('rethrows a network error without a response status — maintenance', async () => {
		vi.mocked(Generated.statusMaintenancesByMaintenances).mockRejectedValue(
			new Error('network down') as never,
		);
		await expect(fetchMaintenance('x')).rejects.toBeTruthy();
	});
});
