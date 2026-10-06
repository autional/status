import { Link } from 'react-router';
import { Activity, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import RefreshCountdown from './RefreshCountdown';
import { useSystemStatus } from '@/hooks/use-system-status';
import { LanguageSwitcher, ThemeToggle } from '@autional/ui';
import { useTranslation } from 'react-i18next';

interface StatusHeaderProps {
	overallStatus?: 'healthy' | 'degraded' | 'unhealthy';
}

export default function StatusHeader({ overallStatus = 'healthy' }: StatusHeaderProps) {
	const { t } = useTranslation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const { refetch } = useSystemStatus();

	const bannerText = {
		healthy: t('banner.healthy'),
		degraded: t('banner.degraded'),
		unhealthy: t('banner.unhealthy'),
	};

	const bannerConfig = {
		healthy: {
			bg: 'bg-emerald-600',
			icon: <Activity size={20} className="animate-pulse-soft" />,
		},
		degraded: {
			bg: 'bg-amber-500',
			icon: <Activity size={20} className="animate-pulse-soft" />,
		},
		unhealthy: {
			bg: 'bg-rose-600',
			icon: <Activity size={20} className="animate-pulse-soft" />,
		},
	};

	// 词表漂移防线：props 类型拦不住运行时的网络数据，落表外的取值按 unhealthy 渲染而非崩溃
	const status: keyof typeof bannerConfig =
		overallStatus in bannerConfig ? overallStatus : 'unhealthy';

	const config = bannerConfig[status];

	const navItems = [
		{ to: '/', key: 'nav.status' as const },
		{ to: '/incidents', key: 'nav.incidents' as const },
		{ to: '/maintenance', key: 'nav.maintenance' as const },
		{ to: '/subscribe', key: 'nav.subscribe' as const },
	];

	return (
		<header className="w-full">
			{/* Status Banner */}
			<div className={`${config.bg} text-white`}>
				<div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-4">
					{config.icon}
					<span className="text-lg font-semibold">{bannerText[status]}</span>
				</div>
			</div>

			{/* Navigation */}
			<nav className="sticky top-0 z-10 h-[var(--layout-header-height)] border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
				<div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
					<Link
						to="/"
						className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-neutral-100"
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
							<Link
								key={item.to}
								to={item.to}
								className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
							>
								{t(item.key)}
							</Link>
						))}
						<Link
							to="/subscribe"
							className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
						>
							<Bell size={14} />
							{t('subscribe')}
						</Link>
						<ThemeToggle
							className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
							iconSize={16}
							labelLight={t('theme.switchToLight')}
							labelDark={t('theme.switchToDark')}
						/>
						<LanguageSwitcher labelEn={t('lang.en')} labelZh={t('lang.zh')} />
					</div>

					{/* Mobile menu button */}
					<button
						className="md:hidden text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					>
						{mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
					</button>
				</div>

				{/* Mobile Nav */}
				{mobileMenuOpen && (
					<div className="border-t border-neutral-100 bg-white px-4 py-3 md:hidden dark:border-neutral-700 dark:bg-neutral-900">
						<div className="flex flex-col gap-3">
							{navItems.map((item) => (
								<Link
									key={item.to}
									to={item.to}
									onClick={() => setMobileMenuOpen(false)}
									className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
								>
									{t(item.key)}
								</Link>
							))}
							<div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-700">
								<div className="flex items-center gap-3">
									<ThemeToggle iconSize={14} />
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
