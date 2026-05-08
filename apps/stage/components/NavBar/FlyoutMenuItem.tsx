import { css, useTheme } from '@emotion/react';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import defaultTheme from '../theme';
import { StyledListLink } from './styles';

interface FlyoutItem {
	label: string;
	href: string;
}

const FlyoutMenuItem = ({ label, items }: { label: string; items: FlyoutItem[] }): ReactElement => {
	const theme: typeof defaultTheme = useTheme();
	const triggerRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLUListElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const openPanel = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		if (triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setPanelPos({ top: rect.top, left: rect.right });
		}
		setIsOpen(true);
	};

	const scheduleClose = () => {
		closeTimer.current = setTimeout(() => setIsOpen(false), 120);
	};

	const cancelClose = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
	};

	// Prevent Dropdown's document-level mousedown listener (handleClickOutside) from
	// seeing mousedown events on the portal panel. Without this, mousedown on a flyout
	// item causes the parent Dropdown to close and unmount the portal before click fires.
	useEffect(() => {
		if (!isOpen || !panelRef.current) return;
		const panel = panelRef.current;
		const stopMouseDown = (e: MouseEvent) => e.stopPropagation();
		panel.addEventListener('mousedown', stopMouseDown);
		return () => panel.removeEventListener('mousedown', stopMouseDown);
	}, [isOpen]);

	useEffect(() => {
		return () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		};
	}, []);

	return (
		<>
			<div
				ref={triggerRef}
				onMouseEnter={openPanel}
				onMouseLeave={scheduleClose}
				css={css`
					align-items: center;
					background-color: ${theme.colors.white};
					border: 1px solid ${theme.colors.grey_2};
					box-sizing: border-box;
					color: ${theme.colors.black};
					cursor: default;
					display: flex;
					font-size: 14px;
					justify-content: space-between;
					min-height: 40px;
					padding: 8px 12px;
					width: 100%;

					&:hover {
						background-color: ${theme.colors.grey_1};
					}
				`}
			>
				<span>{label}</span>
				<span
					css={css`
						display: inline-block;
						width: 5px;
						height: 5px;
						border: 1px solid ${theme.colors.grey_5};
						border-top: none;
						border-left: none;
						transform: rotate(-45deg);
						flex-shrink: 0;
					`}
				/>
			</div>

			{isOpen &&
				createPortal(
					<ul
						ref={panelRef}
						onMouseEnter={cancelClose}
						onMouseLeave={scheduleClose}
						css={css`
							background: ${theme.colors.white};
							border-left: 4px solid ${theme.colors.primary_dark};
							box-shadow: 0 8px 21px 0 rgba(0, 0, 0, 0.1), 0 2px 4px 0 rgba(0, 0, 0, 0.1);
							font-family: var(--stage-font-base, 'Lato', sans-serif);
							list-style: none;
							margin: 0;
							min-width: 180px;
							padding: 0;
							position: fixed;
							top: ${panelPos.top}px;
							left: ${panelPos.left}px;
							z-index: 10000;
						`}
					>
						{items.map(({ label: itemLabel, href }) => (
							<li key={href}>
								<StyledListLink href={href} target="_blank" rel="noopener noreferrer">
									{itemLabel}
								</StyledListLink>
							</li>
						))}
					</ul>,
					document.body,
				)}
		</>
	);
};

export default FlyoutMenuItem;
