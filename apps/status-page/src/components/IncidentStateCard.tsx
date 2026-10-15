import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * 事件「错误态 / 空态」共用卡片（单一真源）。
 *
 * 抽取动机：同一张「事件数据暂时不可用」卡此前在 `/incidents` 列表页与首页「最近事件」各写了一份，
 * 而服务详情页「关联事件」**没有**失败态 —— 接口挂掉时整块被静默隐藏，读者会把「取不到」
 * 读成「没事」（假绿；见 `docs/STATUS-UI-SEMANTICS-OPTIONS.md` §4.1(c)）。
 * 现三处共用一套 markup + 文案键，避免再出现"某个入口漏了失败态"的同型缺陷。
 *
 * 文案键（复用既有，不得新造）：`incidents.error` / `incidents.errorHint`（取数失败）、
 * `incidents.empty` / `incidents.filteredEmptyHint`（筛选后为空）、
 * `incidents.noneYet` / `incidents.noneYetHint`（数据集为空）、`filter.clear`（动作按钮，由调用方给）。
 */

/** 取数失败：琥珀警示卡 + role="status"。绝不渲染成绿色空态（假绿教训）。 */
export function IncidentErrorCard() {
	const { t } = useTranslation();
	return (
		<div
			role="status"
			className="rounded-lg border border-warning-soft bg-neutral-0 p-12 text-center"
		>
			<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
				<AlertTriangle size={20} className="text-warning-text" />
			</div>
			<h3 className="text-sm font-medium text-neutral-900">{t('incidents.error')}</h3>
			<p className="mt-1 text-xs text-muted">{t('incidents.errorHint')}</p>
		</div>
	);
}

/** 空态（"真的没事"）：标题 / 副文案 / 可选动作由调用方给，文案键一律复用既有 `incidents.*`。 */
export function IncidentEmptyCard({
	title,
	hint,
	action,
}: {
	title: ReactNode;
	hint: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-12 text-center">
			<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft/30">
				<AlertTriangle size={20} className="text-success-text" />
			</div>
			<h3 className="text-sm font-medium text-neutral-900">{title}</h3>
			<p className="mt-1 text-xs text-muted">{hint}</p>
			{action}
		</div>
	);
}
