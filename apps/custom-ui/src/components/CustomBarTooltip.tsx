/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ReactElement } from 'react';

interface CustomBarTooltipProps {
	indexValue?: string;
	value?: number;
	color?: string;
	label?: string;
	formattedValue?: string | number;
	[key: string]: any; // Allow any additional props from Nivo
}

const CustomBarTooltip = (props: CustomBarTooltipProps): ReactElement => {
	const { indexValue, value, label, formattedValue } = props;
	
	// Use label or indexValue, formattedValue or value
	const displayLabel = label || indexValue || '';
	const displayValue = formattedValue !== undefined ? formattedValue : (value !== undefined ? value : 0);
	
	return (
		<div
			css={css`
				background: rgba(0, 0, 0, 0.85);
				color: white;
				padding: 0.5rem 0.75rem;
				border-radius: 0.25rem;
				font-size: 0.75rem;
				font-family: 'Montserrat', sans-serif;
				box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.2);
				pointer-events: none;
				position: relative;
				white-space: nowrap;
				z-index: 1000;
			`}
		>
			<div
				css={css`
					font-weight: 600;
					margin-bottom: 0.25rem;
				`}
			>
				{displayLabel}:
			</div>
			<div
				css={css`
					font-weight: 700;
				`}
			>
				{typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue} Participants
			</div>
			<div
				css={css`
					position: absolute;
					left: -0.375rem;
					top: 50%;
					transform: translateY(-50%);
					width: 0;
					height: 0;
					border-top: 0.375rem solid transparent;
					border-bottom: 0.375rem solid transparent;
					border-right: 0.375rem solid rgba(0, 0, 0, 0.85);
				`}
			/>
		</div>
	);
};

export default CustomBarTooltip;

