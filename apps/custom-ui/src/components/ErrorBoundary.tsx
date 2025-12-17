/** @jsxImportSource @emotion/react */
import { Component, ErrorInfo, ReactElement, ReactNode } from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactElement;
}

interface State {
	hasError: boolean;
	error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div
						css={{
							padding: '1.25rem',
							border: '0.0625rem solid #ff6b6b',
							borderRadius: '0.5rem',
							backgroundColor: '#ffe0e0',
							color: '#c92a2a',
						}}
					>
						<h3>Chart Error</h3>
						<p>There was an error loading the chart. This may be due to a library issue.</p>
					</div>
				)
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;




