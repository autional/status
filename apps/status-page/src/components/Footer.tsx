import { Link } from 'react-router';
import { Activity, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
	const { t } = useTranslation();
	return (
		<footer className="border-t border-neutral-200 bg-neutral-0">
			<div className="mx-auto max-w-6xl px-4 py-8">
				<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
					<div className="flex items-center gap-2 text-sm text-neutral-600">
						<Activity size={16} className="text-primary-600" />
						<span className="font-medium">{t('footer.brand')}</span>
						<span className="text-muted">·</span>
						<span>{t('footer.tagline')}</span>
					</div>

					<div className="flex items-center gap-4 text-sm text-muted">
						<Link
							to="/"
							className="hover:text-neutral-800 transition-colors"
						>
							{t('nav.status')}
						</Link>
						<Link
							to="/incidents"
							className="hover:text-neutral-800 transition-colors"
						>
							{t('nav.incidents')}
						</Link>
						<Link
							to="/maintenance"
							className="hover:text-neutral-800 transition-colors"
						>
							{t('nav.maintenance')}
						</Link>
						<Link
							to="/subscribe"
							className="hover:text-neutral-800 transition-colors"
						>
							{t('nav.subscribe')}
						</Link>
						<Link
							to="/rss"
							className="hover:text-neutral-800 transition-colors"
						>
							RSS
						</Link>
					</div>

					<div className="flex items-center gap-3 text-muted">
						<a
							href="mailto:support@autional.net"
							className="hover:text-neutral-600 transition-colors"
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
