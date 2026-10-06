import { ErrorBoundary as SharedErrorBoundary } from '@autional/ui';
import i18n from '@/i18n';
import { type ReactNode } from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

const isDev = import.meta.env.DEV;

export function ErrorBoundary({ children, fallback }: Props) {
	return (
		<SharedErrorBoundary
			fallback={fallback}
			devMode={isDev}
			title={i18n.t('error.boundary.title')}
			message={i18n.t('error.boundary.unknown')}
			retryLabel={i18n.t('error.boundary.retry')}
		>
			{children}
		</SharedErrorBoundary>
	);
}
