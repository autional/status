import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	subscribeEmail,
	unsubscribeEmail,
	fetchSubscriptionPreferences,
	updateSubscriptionPreferences,
} from '@/lib/api';
import type { SubscriptionPreferences } from '@/lib/api';
import {
	Bell,
	CheckCircle,
	Mail,
	Loader2,
	AlertCircle,
	Rss,
	XCircle,
	Settings,
	KeyRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toggle, Input } from '@autional/ui';

const emailSchema = z.object({
	email: z.string().email(),
});
type EmailForm = z.infer<typeof emailSchema>;

const tokenSchema = z.object({
	token: z.string().min(1),
});
type TokenForm = z.infer<typeof tokenSchema>;

const prefTokenSchema = z.object({
	prefToken: z.string().min(1),
});
type PrefTokenForm = z.infer<typeof prefTokenSchema>;

type SubscribeMode = 'subscribe' | 'unsubscribe' | 'preferences';

const DIGEST_OPTIONS = [
	{ value: 'immediate', label: 'subscribe.preferences.digestImmediate' },
	{ value: 'daily', label: 'subscribe.preferences.digestDaily' },
	{ value: 'weekly', label: 'subscribe.preferences.digestWeekly' },
];

export default function SubscribePage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
	const [mode, setMode] = useState<SubscribeMode>('subscribe');

	const emailForm = useForm<EmailForm>({
		resolver: zodResolver(emailSchema),
		defaultValues: { email: '' },
	});
	const tokenForm = useForm<TokenForm>({
		resolver: zodResolver(tokenSchema),
		defaultValues: { token: '' },
	});

	const prefForm = useForm<PrefTokenForm>({
		resolver: zodResolver(prefTokenSchema),
		defaultValues: { prefToken: '' },
	});
	// getValues 不触发重渲染 ⇒ 加载按钮的 disabled 恒为初始值（S-01）。
	// useWatch 订阅表单值变化，setValue/输入/自动回填都能实时解除禁用。
	const watchedPrefToken = useWatch({ control: prefForm.control, name: 'prefToken' });

	// Preferences state
	const [prefsLoading, setPrefsLoading] = useState(false);
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const [prefs, setPrefs] = useState<SubscriptionPreferences | null>(null);
	const [prefsToken, setPrefsToken] = useState('');

	// 邮件内「管理偏好」链接入口：/subscribe/manage?token=…（或 /subscribe?token=…）。
	// 有令牌时自动切到偏好页并加载；只触发只读 GET，不做任何写操作（邮件客户端预取无害）。
	const [searchParams] = useSearchParams();
	const queryToken = searchParams.get('token') ?? '';
	const autoLoadedRef = useRef(false);

	const handleSubscribe = async (data: EmailForm) => {
		if (loading) return;

		setLoading(true);
		setResult(null);
		try {
			const res = await subscribeEmail(data.email);
			setResult({
				success: res.success,
				message: res.message ?? t(res.code || 'subscribe.subscribeError'),
			});
			if (res.success) emailForm.reset();
		} catch {
			setResult({ success: false, message: t('subscribe.subscribeError') });
		} finally {
			setLoading(false);
		}
	};

	const handleUnsubscribe = async (data: TokenForm) => {
		if (loading) return;

		setLoading(true);
		setResult(null);
		try {
			const res = await unsubscribeEmail(data.token);
			setResult({
				success: res.success,
				message: res.message ?? t(res.code || 'subscribe.unsubscribeError'),
			});
			if (res.success) tokenForm.reset();
		} catch {
			setResult({ success: false, message: t('subscribe.unsubscribeError') });
		} finally {
			setLoading(false);
		}
	};

	const loadPreferences = async (token: string) => {
		if (prefsLoading) return;

		setPrefsLoading(true);
		setPrefsLoaded(false);
		try {
			const res = await fetchSubscriptionPreferences(token);
			if (res.kind === 'ok') {
				setPrefs(res.prefs);
				setPrefsToken(token);
				setPrefsLoaded(true);
			} else if (res.kind === 'invalidToken') {
				setResult({ success: false, message: t('subscribe.preferences.invalidToken') });
			} else {
				setResult({ success: false, message: t('subscribe.preferences.loadError') });
			}
		} finally {
			setPrefsLoading(false);
		}
	};

	const handleLoadPreferences = () => {
		if (prefsLoading) return;
		const token = prefForm.getValues('prefToken').trim();
		if (!token) return;
		void loadPreferences(token);
	};

	const handleSavePreferences = async () => {
		if (!prefs || !prefsToken || prefsLoading) return;

		setPrefsLoading(true);
		try {
			const res = await updateSubscriptionPreferences(prefsToken, {
				notifyIncidents: prefs.notifyIncidents,
				notifyMaintenance: prefs.notifyMaintenance,
				notifyRecovery: prefs.notifyRecovery,
				digestFrequency: prefs.digestFrequency,
				categories: prefs.categories,
			});
			if (res.kind === 'ok') {
				setPrefs(res.prefs);
				setResult({ success: true, message: t('subscribe.preferences.saveSuccess') });
			} else if (res.kind === 'invalidToken') {
				setResult({ success: false, message: t('subscribe.preferences.invalidToken') });
			} else {
				setResult({ success: false, message: t('subscribe.preferences.saveError') });
			}
		} finally {
			setPrefsLoading(false);
		}
	};

	// 管理页显式退订：仅在用户点击时执行（链接本身是 GET，不做自动退订以免预取误触）
	const handleUnsubscribeFromPrefs = async () => {
		if (!prefsToken || loading) return;

		setLoading(true);
		setResult(null);
		try {
			const res = await unsubscribeEmail(prefsToken);
			if (res.success) {
				setPrefs(null);
				setPrefsLoaded(false);
				setPrefsToken('');
				prefForm.reset();
			}
			setResult({
				success: res.success,
				message: res.message ?? t(res.code || 'subscribe.unsubscribeError'),
			});
		} finally {
			setLoading(false);
		}
	};

	// 落地即加载（仅当 URL 携带管理令牌）：切到偏好 tab、回填令牌、只读拉取
	useEffect(() => {
		if (!queryToken || autoLoadedRef.current) return;
		autoLoadedRef.current = true;
		prefForm.setValue('prefToken', queryToken);
		setMode('preferences');
		void loadPreferences(queryToken);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryToken]);

	const handleTogglePref = (key: 'notifyIncidents' | 'notifyMaintenance' | 'notifyRecovery') => {
		if (!prefs) return;
		setPrefs({ ...prefs, [key]: !prefs[key] });
	};

	const handleDigestChange = (val: string) => {
		if (!prefs) return;
		setPrefs({ ...prefs, digestFrequency: val });
	};

	return (
		<div className="mx-auto max-w-2xl px-4 py-12">
			<div className="text-center">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
					<Bell size={24} className="text-primary-600 dark:text-primary-400" />
				</div>
				<h1 className="text-2xl font-bold text-neutral-900">
					{t('subscribe.title')}
				</h1>
				<p className="mx-auto mt-2 max-w-md text-sm text-muted">
					{t('subscribe.desc')}
				</p>
			</div>

			{/* Mode Toggle */}
			<div className="mt-8 flex justify-center">
				<div
					role="tablist"
					className="inline-flex rounded-lg border border-neutral-200 bg-neutral-0 p-1"
				>
					<button
						role="tab"
						id="tab-subscribe"
						aria-selected={mode === 'subscribe'}
						aria-controls="panel-subscribe"
						onClick={() => {
							setMode('subscribe');
							setResult(null);
						}}
						className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
							mode === 'subscribe'
								? 'bg-primary-600 text-white'
								: 'text-neutral-600 hover:text-neutral-900'
						}`}
					>
						{t('subscribe.subscribeTab')}
					</button>
					<button
						role="tab"
						id="tab-unsubscribe"
						aria-selected={mode === 'unsubscribe'}
						aria-controls="panel-unsubscribe"
						onClick={() => {
							setMode('unsubscribe');
							setResult(null);
						}}
						className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
							mode === 'unsubscribe'
								? 'bg-primary-600 text-white'
								: 'text-neutral-600 hover:text-neutral-900'
						}`}
					>
						{t('subscribe.unsubscribeTab')}
					</button>
					<button
						role="tab"
						id="tab-preferences"
						aria-selected={mode === 'preferences'}
						aria-controls="panel-preferences"
						onClick={() => {
							setMode('preferences');
							setResult(null);
						}}
						className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
							mode === 'preferences'
								? 'bg-primary-600 text-white'
								: 'text-neutral-600 hover:text-neutral-900'
						}`}
					>
						{t('subscribe.preferencesTab')}
					</button>
				</div>
			</div>

			<div
				role="tabpanel"
				id={`panel-${mode}`}
				aria-labelledby={`tab-${mode}`}
				className="mt-6 rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-card"
			>
				{mode === 'subscribe' ? (
					<form onSubmit={emailForm.handleSubmit(handleSubscribe)} className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="mb-1.5 block text-sm font-medium text-neutral-700"
							>
								{t('subscribe.emailLabel')}
							</label>
							{/* 图标几何交给设计系统的 Input prefix 槽（第 61 轮）：
							    原来这里是 absolute 图标 + 算出来的 pl-9（12 起点 + 16 图标 + 8 间隙）。 */}
							<Input
								id="email"
								type="email"
								{...emailForm.register('email')}
								placeholder="your@email.com"
								prefix={<Mail size={16} />}
							/>
							{emailForm.formState.errors.email && (
								<p className="mt-1 text-xs text-danger-text">{t('subscribe.invalidEmail')}</p>
							)}
						</div>

						<button
							type="submit"
							disabled={loading}
							className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{loading ? (
								<>
									<Loader2 size={16} className="animate-spin" />
									{t('subscribe.processing')}
								</>
							) : (
								<>
									<Bell size={16} />
									{t('subscribe.submit')}
								</>
							)}
						</button>
					</form>
				) : mode === 'unsubscribe' ? (
					<form onSubmit={tokenForm.handleSubmit(handleUnsubscribe)} className="space-y-4">
						<div>
							<label
								htmlFor="token"
								className="mb-1.5 block text-sm font-medium text-neutral-700"
							>
								{t('subscribe.tokenLabel')}
							</label>
							<Input
								id="token"
								type="text"
								{...tokenForm.register('token')}
								placeholder={t('subscribe.tokenPlaceholder')}
								prefix={<XCircle size={16} />}
							/>
							{tokenForm.formState.errors.token && (
								<p className="mt-1 text-xs text-danger-text">{t('subscribe.tokenRequired')}</p>
							)}
							<p className="mt-1.5 text-xs text-muted">
								{t('subscribe.tokenHint')}
							</p>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-0 transition-colors hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{loading ? (
								<>
									<Loader2 size={16} className="animate-spin" />
									{t('subscribe.processing')}
								</>
							) : (
								<>
									<XCircle size={16} />
									{t('subscribe.unsubscribeBtn')}
								</>
							)}
						</button>
					</form>
				) : (
					/* ─── Preferences Form ─── */
					<div className="space-y-4">
						<h3 className="text-base font-semibold text-neutral-900">
							{t('subscribe.preferences.title')}
						</h3>
						<p className="text-xs text-muted">
							{t('subscribe.preferences.desc')}
						</p>

						{/* Management token（U349：偏好以令牌为键，不再凭邮箱读取） */}
						<div>
							<label
								htmlFor="pref-token"
								className="mb-1.5 block text-sm font-medium text-neutral-700"
							>
								{t('subscribe.preferences.tokenLabel')}
							</label>
							<div className="flex gap-2">
								<div className="flex-1">
									<Input
										id="pref-token"
										type="text"
										{...prefForm.register('prefToken')}
										onChange={(e) => {
											prefForm.register('prefToken').onChange(e);
											setPrefsLoaded(false);
										}}
										placeholder={t('subscribe.preferences.tokenPlaceholder')}
									/>
								</div>
								<button
									type="button"
									onClick={prefForm.handleSubmit(() => handleLoadPreferences())}
									disabled={prefsLoading || !(watchedPrefToken ?? '').trim()}
									className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors disabled:opacity-50"
								>
									{prefsLoading ? (
										<Loader2 size={14} className="animate-spin" />
									) : (
										<Settings size={14} />
									)}
									{t('subscribe.preferences.load')}
								</button>
							</div>
							{prefForm.formState.errors.prefToken && (
								<p className="mt-1 text-xs text-danger-text">
									{t('subscribe.preferences.tokenRequired')}
								</p>
							)}
							<p className="mt-1.5 text-xs text-muted">
								{t('subscribe.preferences.tokenHint')}
							</p>
						</div>

						{/* Not verified warning */}
						{prefsLoaded && prefs && !prefs.verified && (
							<div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
								<AlertCircle size={16} />
								{t('subscribe.preferences.notVerified')}
							</div>
						)}

						{/* Preferences toggles */}
						{prefsLoaded && prefs && (
							<div className="space-y-3 rounded-md border border-neutral-100 bg-neutral-50 p-4">
								{/* Notify Incidents */}
								<label className="flex items-center justify-between cursor-pointer">
									<div>
										<span className="text-sm font-medium text-neutral-800">
											{t('subscribe.preferences.notifyIncidents')}
										</span>
										<p className="text-xs text-muted">
											{t('subscribe.preferences.notifyIncidentsDesc')}
										</p>
									</div>
									<Toggle
										checked={prefs.notifyIncidents}
										onChange={() => handleTogglePref('notifyIncidents')}
										size="sm"
									/>
								</label>

								{/* Notify Maintenance */}
								<label className="flex items-center justify-between cursor-pointer">
									<div>
										<span className="text-sm font-medium text-neutral-800">
											{t('subscribe.preferences.notifyMaintenance')}
										</span>
										<p className="text-xs text-muted">
											{t('subscribe.preferences.notifyMaintenanceDesc')}
										</p>
									</div>
									<Toggle
										checked={prefs.notifyMaintenance}
										onChange={() => handleTogglePref('notifyMaintenance')}
										size="sm"
									/>
								</label>

								{/* Notify Recovery */}
								<label className="flex items-center justify-between cursor-pointer">
									<div>
										<span className="text-sm font-medium text-neutral-800">
											{t('subscribe.preferences.notifyRecovery')}
										</span>
										<p className="text-xs text-muted">
											{t('subscribe.preferences.notifyRecoveryDesc')}
										</p>
									</div>
									<Toggle
										checked={prefs.notifyRecovery}
										onChange={() => handleTogglePref('notifyRecovery')}
										size="sm"
									/>
								</label>

								{/* Digest Frequency */}
								<div className="pt-2 border-t border-neutral-200">
									<label className="mb-2 block text-sm font-medium text-neutral-800">
										{t('subscribe.preferences.digestFrequency')}
									</label>
									<select
										value={prefs.digestFrequency}
										onChange={(e) => handleDigestChange(e.target.value)}
										className="w-full rounded-md border border-neutral-300 bg-neutral-0 py-2 px-3 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
									>
										{DIGEST_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{t(opt.label)}
											</option>
										))}
									</select>
								</div>
							</div>
						)}

						{/* Save button */}
						{prefsLoaded && prefs && (
							<button
								type="button"
								onClick={handleSavePreferences}
								disabled={prefsLoading}
								className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{prefsLoading && prefsLoaded ? (
									<>
										<Loader2 size={16} className="animate-spin" />
										{t('subscribe.processing')}
									</>
								) : (
									<>
										<Settings size={16} />
										{t('subscribe.preferences.save')}
									</>
								)}
							</button>
						)}

						{/* 显式退订（管理链接入口的收尾动作；仅点击时执行） */}
						{prefsLoaded && prefs && (
							<button
								type="button"
								onClick={handleUnsubscribeFromPrefs}
								disabled={loading}
								className="flex w-full items-center justify-center gap-2 rounded-md border border-danger-soft px-4 py-2.5 text-sm font-medium text-danger-text transition-colors hover:bg-danger-soft disabled:opacity-60 disabled:cursor-not-allowed dark:border-danger-soft dark:text-danger-text dark:hover:bg-danger-soft/20"
							>
								{loading ? (
									<>
										<Loader2 size={16} className="animate-spin" />
										{t('subscribe.processing')}
									</>
								) : (
									<>
										<XCircle size={16} />
										{t('subscribe.preferences.unsubscribeAction')}
									</>
								)}
							</button>
						)}
					</div>
				)}

				{result && (
					<div
						className={`mt-4 flex items-center gap-2 rounded-md p-3 text-sm ${
							result.success
								? 'bg-success-soft text-success-text dark:bg-success-soft/30 dark:text-success-text'
								: 'bg-danger-soft text-danger-text dark:bg-danger-soft/30 dark:text-danger-text'
						}`}
					>
						{result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
						{result.message}
					</div>
				)}
			</div>

			{/* Subscription Benefits */}
			<div className="mt-8 grid gap-4 sm:grid-cols-3">
				<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-center">
					<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success-text dark:bg-success-soft/30 dark:text-success-text">
						<Rss size={18} />
					</div>
					<h3 className="text-sm font-semibold text-neutral-900">
						{t('subscribe.benefit.realtime')}
					</h3>
					<p className="mt-1 text-xs text-muted">
						{t('subscribe.benefit.realtimeDesc')}
					</p>
				</div>
				<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-center">
					<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-info-soft text-info-text dark:bg-info-soft/30 dark:text-info-text">
						<CheckCircle size={18} />
					</div>
					<h3 className="text-sm font-semibold text-neutral-900">
						{t('subscribe.benefit.resolve')}
					</h3>
					<p className="mt-1 text-xs text-muted">
						{t('subscribe.benefit.resolveDesc')}
					</p>
				</div>
				<div className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-center">
					<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
						<Bell size={18} />
					</div>
					<h3 className="text-sm font-semibold text-neutral-900">
						{t('subscribe.benefit.advance')}
					</h3>
					<p className="mt-1 text-xs text-muted">
						{t('subscribe.benefit.advanceDesc')}
					</p>
				</div>
			</div>
		</div>
	);
}
