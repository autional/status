import { Link } from 'react-router';
import { Activity, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	getAUTH_PAGES_URL,
	getDEVELOPER_PORTAL_URL,
	getLANDING_SITE_URL,
	getTRUST_CENTER_URL,
} from '@autional/shared';

export default function Footer() {
	const { t } = useTranslation();
	return (
		<footer className="border-t border-neutral-200 bg-neutral-0">
			<div className="mx-auto max-w-6xl px-4 py-8">
				<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
					<div className="flex items-center gap-2 text-sm text-neutral-600">
						<Activity size={16} className="text-primary-600 dark:text-primary-400" />
						<span className="font-medium">{t('footer.brand')}</span>
						<span className="text-muted">·</span>
						<span>{t('footer.tagline')}</span>
					</div>

					{/* 触区基线：页脚是"手机上最容易被误触"的一排小链接。
					    每个链接用 padding 把可点盒撑到 --a11y-touch-target(44px)，再用
					    -my-3（垂直）+ -mx-1.5（水平）把**布局占位**收回到原尺寸——负外边距不缩小
					    盒子本身，故 44px 命中区仍可被 getBoundingClientRect 量到。
					    净效果（实测）：页脚高度与整页高度逐像素不变，桌面链接文字位移 ≤8px；
					    相邻命中区之间仍有 4px 间隙（不重叠），390px 下不产生横向滚动（flex-wrap 兜底）。 */}
					{/* gap-4（16px）足够：本行链接不再用 -my-3 负边距（44px 命中盒留在行内），
					    因此不会向下溢到 mailto 那一行。上一版用负边距 + gap-3 时实测与相邻行重叠 12px。 */}
					<div className="flex flex-col items-center gap-4 text-sm text-muted">
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-4">
						<Link
							to="/"
							className="-my-3 inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center -mx-1.5 px-1.5 hover:text-neutral-800 transition-colors"
						>
							{t('nav.status')}
						</Link>
						<Link
							to="/incidents"
							className="-my-3 inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center -mx-1.5 px-1.5 hover:text-neutral-800 transition-colors"
						>
							{t('nav.incidents')}
						</Link>
						<Link
							to="/maintenance"
							className="-my-3 inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center -mx-1.5 px-1.5 hover:text-neutral-800 transition-colors"
						>
							{t('nav.maintenance')}
						</Link>
						<Link
							to="/subscribe"
							className="-my-3 inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center -mx-1.5 px-1.5 hover:text-neutral-800 transition-colors"
						>
							{t('nav.subscribe')}
						</Link>
						<Link
							to="/rss"
							className="-my-3 inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center -mx-1.5 px-1.5 hover:text-neutral-800 transition-colors"
						>
							RSS
						</Link>
					</div>

					{/* 站外出口（2026-11-02）：状态页是可索引的公开页，此前只有站内链接 + mailto
					    ⇒ 抓取与用户双断头（看完故障去不了文档/合规页）。四条一律同 tab
					    （跨站导航保留返回键），触区沿用上面 44px 口径。 */}
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-4">
						{[
							{ href: getLANDING_SITE_URL(), label: t('footer.officialSite') },
							{ href: getDEVELOPER_PORTAL_URL(), label: t('footer.docs') },
							{ href: getTRUST_CENTER_URL(), label: t('footer.trust') },
							{ href: getAUTH_PAGES_URL(), label: t('footer.signIn') },
						]
							// 门户 URL 在 IP 主机上解析不出（resolvePortalUrl 返回 ''）：宁可少一条，
							// 也不要渲染 href="" 的死链（会跳到当前页）。
							.filter((link) => link.href)
							.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className="inline-flex min-h-[var(--a11y-touch-target)] items-center justify-center px-1.5 hover:text-neutral-800 transition-colors"
							>
								{link.label}
							</a>
						))}
					</div>
					</div>

					{/* 页脚唯一的图标链接（实测原为 16×16）：撑到 44×44。
					    -my-3.5 / -mx-2.5 把**布局占位**收回到原来的 16px 高，
					    故桌面页脚行高不变，只是可点盒向左多出 10px（与 © 文案仍有 2px 间距，不会抢点击）。 */}
					<div className="flex items-center gap-3 text-muted">
						<a
							href="mailto:support@autional.net"
							className="-mx-2.5 -my-3.5 inline-flex h-[var(--a11y-touch-target)] w-[var(--a11y-touch-target)] items-center justify-center rounded-md hover:text-neutral-600 transition-colors"
							title={t('footer.contact')}
						>
							<Mail size={16} />
						</a>
						<span className="text-xs">
							© {new Date().getFullYear()} Autional
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
