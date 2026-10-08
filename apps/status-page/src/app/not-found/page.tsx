import { Link } from 'react-router';
import { Search, Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const suggestionKeys = [
	{ key: 'status', path: '/' },
	{ key: 'incidents', path: '/incidents' },
	{ key: 'maintenance', path: '/maintenance' },
	{ key: 'subscribe', path: '/subscribe' },
] as const;

export default function NotFoundPage() {
	const { t } = useTranslation();

	return (
		<div className="mx-auto max-w-2xl px-4 py-20 text-center">
			<div className="text-9xl font-bold text-primary-100/25">404</div>
			<h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
				{t('notFound.title')}
			</h1>
			<p className="mx-auto mt-4 max-w-md text-neutral-600">
				{t('notFound.description')}
			</p>

			<div className="mt-8 flex flex-wrap justify-center gap-3">
				{suggestionKeys.map(({ key, path }) => (
					<Link
						key={key}
						to={path}
						className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
					>
						<Search className="h-3.5 w-3.5" />
						{t(`nav.${key}`)}
					</Link>
				))}
			</div>

			<div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
				<Link
					to="/"
					className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-700"
				>
					<Home className="h-4 w-4" />
					{t('notFound.goHome')}
				</Link>
				<button
					onClick={() => window.history.back()}
					className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-neutral-0 px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-card transition-colors hover:bg-neutral-50"
				>
					<ArrowLeft className="h-4 w-4" />
					{t('notFound.goBack')}
				</button>
			</div>
		</div>
	);
}
