import { Link } from 'react-router';
import { Activity, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	getDEVELOPER_PORTAL_URL,
	getLANDING_SITE_URL,
	getTRUST_CENTER_URL,
} from '@autional/shared';

/**
 * 页脚（2026-11-02 精简）：
 *
 * 原来这里还有一行 5 条站内链接（状态总览/事件历史/维护日历/订阅通知/RSS），
 * 但同名的前三条在**吸顶头部导航**里一直在屏上，等于同一批入口渲染两遍；
 * 加上后加的 4 条站外出口，页脚在 390px 下变成三行链接的小尾巴 —— 视觉上就是一堆链接。
 *
 * 现在只留头部没有的东西：站外出口（官网/文档/信任/登录）+ RSS。
 *
 * 触区口径：每条 `min-h:44px` 且**不用负外边距**，行内撑开；
 * 行间距 gap-y-2(8px) 只影响布局，命中盒不会互相侵入（上一版用 -my-3 时实测与相邻行重叠 12px）。
 */
export default function Footer() {
	const { t } = useTranslation();

	const linkClass =
		'inline-flex min-h-[var(--a11y-touch-target)] items-center px-1 transition-colors hover:text-neutral-800';

	// 门户 URL 在 IP 主机上解析不出（resolvePortalUrl 返回 ''）：宁可少一条，
	// 也不要渲染 href="" 的死链（会跳到当前页）。
	// 窄屏（<640）先收起「开发者文档」：状态页手机端读者多是查故障的终端用户，
	// 开发者文档留给桌面档，避免 390 下 5 条链接换行后只剩一条孤零零占一行。
	const externalLinks = [
		{ href: getLANDING_SITE_URL(), label: t('footer.officialSite'), hideOnMobile: false },
		{ href: getDEVELOPER_PORTAL_URL(), label: t('footer.docs'), hideOnMobile: true },
		{ href: getTRUST_CENTER_URL(), label: t('footer.trust'), hideOnMobile: false },
	].filter((link) => link.href);

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

					<nav
						aria-label={t('footer.navAria')}
						className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted"
					>
						{externalLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className={`${link.hideOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'} ${linkClass}`}
							>
								{link.label}
							</a>
						))}
						{externalLinks.length > 0 && (
							<span aria-hidden="true" className="hidden text-neutral-300 sm:inline">
								|
							</span>
						)}
						<Link to="/rss" className={linkClass}>
							RSS
						</Link>
					</nav>

					{/* 页脚唯一的图标链接：撑到 44×44。
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
						<span className="text-xs">© {new Date().getFullYear()} Autional</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
