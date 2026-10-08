import { useSearchParams, Link } from 'react-router';
import { useEffect, useState, useRef } from 'react';
import { verifySubscription } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const VERIFY_TIMEOUT_MS = 20000;

function VerifyContent() {
	const { t } = useTranslation();
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');
	const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
	const [loading, setLoading] = useState(true);
	const [timedOut, setTimedOut] = useState(false);
	const timedOutRef = useRef(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!token) {
			setResult({ success: false, message: t('verify.noToken') });
			setLoading(false);
			return;
		}

		// Reset state on each effect run
		timedOutRef.current = false;
		setTimedOut(false);
		setLoading(true);

		// Start a timeout fallback
		timeoutRef.current = setTimeout(() => {
			timedOutRef.current = true;
			setTimedOut(true);
			setLoading(false);
		}, VERIFY_TIMEOUT_MS);

		verifySubscription(token)
			.then((res) => {
				if (!timedOutRef.current) {
					setResult({
						success: res.success,
						message: res.message ?? t(res.code || 'verify.error'),
					});
				}
			})
			.catch(() => {
				if (!timedOutRef.current) {
					setResult({ success: false, message: t('verify.error') });
				}
			})
			.finally(() => {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
					timeoutRef.current = null;
				}
				if (!timedOutRef.current) {
					setLoading(false);
				}
			});

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [token]); // eslint-disable-line react-hooks/exhaustive-deps

	if (timedOut) {
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<div className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
						<AlertTriangle size={32} className="text-amber-600 dark:text-amber-400" />
					</div>
					<h1 className="text-xl font-bold text-neutral-900">
						{t('verify.timeoutTitle')}
					</h1>
					<p className="mt-2 text-sm text-muted">
						{t('verify.timeoutDesc')}
					</p>
					<div className="mt-8 flex flex-col items-center gap-3">
						<Link
							to="/subscribe"
							className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
						>
							<Mail size={14} />
							{t('verify.resubscribe')}
						</Link>
						<Link
							to="/"
							className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
						>
							<ArrowLeft size={14} />
							{t('verify.backHome')}
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-xl px-4 py-16">
			<div className="text-center">
				{loading ? (
					<>
						<Loader2 size={40} className="mx-auto animate-spin text-primary-600" />
						<h1 className="mt-6 text-xl font-bold text-neutral-900">
							{t('verify.title')}
						</h1>
						<p className="mt-2 text-sm text-muted">
							{t('verify.subtitle')}
						</p>
					</>
				) : result?.success ? (
					<>
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft/30">
							<CheckCircle size={32} className="text-success-text" />
						</div>
						<h1 className="text-xl font-bold text-neutral-900">
							{t('verify.success')}
						</h1>
						<p className="mt-2 text-sm text-muted">{result.message}</p>
						<p className="mt-4 text-sm text-neutral-600">
							{t('verify.successDesc')}
						</p>
					</>
				) : (
					<>
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft/30">
							<XCircle size={32} className="text-danger-text" />
						</div>
						<h1 className="text-xl font-bold text-neutral-900">
							{t('verify.fail')}
						</h1>
						<p className="mt-2 text-sm text-muted">{result?.message}</p>
						<p className="mt-4 text-sm text-neutral-600">
							{t('verify.failDesc')}
						</p>
					</>
				)}
			</div>

			{/* Actions */}
			<div className="mt-8 flex flex-col items-center gap-3">
				<Link
					to="/"
					className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
				>
					<ArrowLeft size={14} />
					{t('verify.backHome')}
				</Link>
				{!loading && !result?.success && (
					<Link
						to="/subscribe"
						className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
					>
						<Mail size={14} />
						{t('verify.resubscribe')}
					</Link>
				)}
			</div>
		</div>
	);
}

export default function VerifySubscriptionPage() {
	return (
		<ErrorBoundary>
			<VerifyContent />
		</ErrorBoundary>
	);
}
