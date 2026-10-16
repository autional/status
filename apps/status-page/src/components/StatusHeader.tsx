import { Link, NavLink } from 'react-router';
import { Activity, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { LanguageSwitcher, ThemeToggle } from '@autional/ui';
import { useTranslation } from 'react-i18next';

interface StatusHeaderProps {
	overallStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

export default function StatusHeader({ overallStatus = 'unknown' }: StatusHeaderProps) {
	const { t } = useTranslation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const bannerText = {
		healthy: t('banner.healthy'),
		degraded: t('banner.degraded'),
		unhealthy: t('banner.unhealthy'),
		unknown: t('banner.unknown'),
	};

	// T56：横幅配色改为**语义令牌成对色**（soft 底 + text 前景；浅深共用同一 class）——
	// 原来用 `bg-warning`/`bg-danger` 实色 + 硬编码 `text-white`：实测 degraded **1.90:1**、
	// unhealthy **3.27:1**，均低于 AA 4.5（18px/600 不达大字号豁免）。令牌组在浅色是淡底+深字、
	// 深色是深底+浅字 ⇒ 两主题都达标。加 border 保持"看得见的告警条"强度。
	const bannerConfig = {
		healthy: {
			bg: 'bg-success-soft text-success-text border border-success-soft dark:bg-success-soft/30 dark:text-success-text',
			icon: <Activity size={20} className="animate-pulse-soft" />,
		},
		degraded: {
			bg: 'bg-warning-soft text-warning-text border border-warning dark:bg-warning-soft/30 dark:text-warning-text',
			icon: <Activity size={20} className="animate-pulse-soft" />,
		},
		unhealthy: {
			bg: 'bg-danger-soft text-danger-text border border-danger dark:bg-danger-soft/30 dark:text-danger-text',
			icon: <Activity size={20} className="animate-pulse-soft" />,
		},
		unknown: {
			bg: 'bg-neutral-100 text-neutral-700 border border-neutral-300 dark:bg-neutral-100/60 dark:text-neutral-700',
			icon: <Activity size={20} />,
		},
	};

	// 词表漂移防线：props 类型拦不住运行时的网络数据，落表外的取值按 unknown 渲染而非崩溃
	const status: keyof typeof bannerConfig =
		overallStatus in bannerConfig ? overallStatus : 'unknown';

	const config = bannerConfig[status];

	// /subscribe 只保留顶部 CTA 一处入口（导航项与其重复，见内容审计 N-01）
	const navItems = [
		{ to: '/', key: 'nav.status' as const },
		{ to: '/incidents', key: 'nav.incidents' as const },
		{ to: '/maintenance', key: 'nav.maintenance' as const },
	];

	return (
		<header className="w-full">
			{/* Status Banner —— 安静模式：
			    "所有系统运行正常" 在一切正常时是一条不提供信息的大色带（统计卡已说明 23/27）。
			    因此健康态不再占据整条横幅，只保留对读屏软件可见的状态播报（role=status）；
			    只有异常（降级/故障/未知）才升起可见横幅 —— 那时它才真的有用。 */}
			{status === 'healthy' ? (
				<p className="sr-only" role="status">
					{bannerText.healthy}
				</p>
			) : (
				<div className={`${config.bg}`}>
					<div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-4">
						{config.icon}
						<span className="text-lg font-semibold">{bannerText[status]}</span>
					</div>
				</div>
			)}

			{/* Navigation */}
			<nav className="sticky top-0 z-10 h-[var(--layout-header-height)] border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
				<div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
					<Link
						to="/"
						className="flex items-center gap-2 text-lg font-bold text-neutral-900"
					>
						{/* 这里此前是 <Activity size={22} /> —— 那是 lucide 的**状态**图标，
						    被当成了**品牌标**用。状态图标表达「系统现在怎么样」，品牌标表达
						    「这是哪家的产品」，两者不能互换：换个状态语义这条链接就变了意思。
						    顶部横幅里的 Activity 是正确用法，保留。 */}
						<img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7" />
						Autional Status
					</Link>

					{/* Desktop Nav */}
					<div className="hidden items-center gap-6 md:flex">
						{navItems.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.to === '/'}
								className={({ isActive }) =>
									`text-sm font-medium transition-colors ${
										isActive
											? 'text-primary-700 dark:text-primary-300'
											: 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-700'
									}`
								}
							>
								{t(item.key)}
							</NavLink>
						))}
						<Link
							to="/subscribe"
							className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
						>
							<Bell size={14} />
							{t('subscribe')}
						</Link>
						<ThemeToggle
							className="text-muted hover:bg-neutral-100 hover:text-neutral-800"
							iconSize={16}
							labelLight={t('theme.switchToLight')}
							labelDark={t('theme.switchToDark')}
						/>
						<LanguageSwitcher labelEn={t('lang.en')} labelZh={t('lang.zh')} />
					</div>

					{/* Mobile menu button —— 移动端**唯一**导航入口，命中区必须够大。
					    图标视觉尺寸保持 22（不改设计），只把可点盒撑到设计系统的 a11y 触区令牌
					    （--a11y-touch-target: 44px，来自 tokens.css :root）。导航行高由
					    --layout-header-height(64px) 固定，故 44px 不会撑高 sticky 导航。 */}
					<button
						className="md:hidden inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center rounded-md text-neutral-600 hover:text-neutral-900"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
						aria-expanded={mobileMenuOpen}
					>
						{mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
					</button>
				</div>

				{/* Mobile Nav */}
				{mobileMenuOpen && (
					<div className="border-t border-neutral-100 bg-neutral-0 px-4 py-3 md:hidden">
						<div className="flex flex-col gap-3">
							{navItems.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									end={item.to === '/'}
									onClick={() => setMobileMenuOpen(false)}
									className={({ isActive }) =>
										`flex min-h-[var(--a11y-touch-target)] items-center text-sm font-medium ${
											isActive
												? 'text-primary-700 dark:text-primary-300'
												: 'text-neutral-600 hover:text-neutral-900'
										}`
									}
								>
									{t(item.key)}
								</NavLink>
							))}
							<Link
								to="/subscribe"
								onClick={() => setMobileMenuOpen(false)}
								className="flex min-h-[var(--a11y-touch-target)] w-fit items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
							>
								<Bell size={14} />
								{t('subscribe')}
							</Link>
							<div className="flex items-center justify-between pt-3 border-t border-neutral-100">
								<div className="flex items-center gap-3">
									<ThemeToggle
										iconSize={14}
										labelLight={t('theme.switchToLight')}
										labelDark={t('theme.switchToDark')}
									/>
									<LanguageSwitcher labelEn={t('lang.en')} labelZh={t('lang.zh')} />
								</div>
							</div>
						</div>
					</div>
				)}
			</nav>
		</header>
	);
}
