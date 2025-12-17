/** @jsxImportSource @emotion/react */
import { css, useTheme } from '@emotion/react';
import { Aggregations, useArrangerTheme } from '@overture-stack/arranger-components';
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/types';
import { ReactElement, useState, useEffect } from 'react';
import { CustomUIThemeInterface } from '../theme';
import { checkIconSvg } from './icons/CheckIcon';

// Generate data URL from CheckIcon SVG
const checkIconDataUrl = encodeURIComponent(checkIconSvg);

const getAggregationsStyles = (theme: CustomUIThemeInterface): UseThemeContextProps => {
	// Encode the primary_dark color for use in SVG data URLs
	const primaryDarkEncoded = encodeURIComponent(theme.colors.primary_dark);

	return {
		callerName: 'Data-Table-4-Facets',
		components: {
			Aggregations: {
				AggsGroup: {
					collapsedBackground: theme.colors.white,
					headerSticky: true,
					css: css`
						&,
						&.aggregation-group,
						&[class*="AggsGroup"] {
							border-bottom: 0.1rem solid #E5E7EB !important;
						}

						.header {
							position: sticky;
							top: 0;
							z-index: 10;
							background-color: ${theme.colors.white};
						}
						.title-wrapper {
							background-color: ${theme.colors.white};
                            /* Make wrapper a flex container to order siblings */
                            display: flex;
                            align-items: center;
							border-bottom: none !important;

							.title-control {
                                order: 1;
                                flex-grow: 1;
								display: flex;
								flex-direction: row;
								justify-content: space-between;
								align-items: center;
								width: 100%;
								.collapsing-icon,
								.arrow-icon {
									order: 2;
									margin-left: auto;
                                    transition: transform 0.2s;
                                    color: #282A35;
                                    /* Target the path to override hardcoded fill */
                                    path {
                                        fill: #282A35 !important;
                                    }
								}
								.title {
									order: 1;
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
									max-width: 14.5rem;
                                    margin-right: 0; /* Add some space between title and arrow */
								}

                                /* Enforce arrow rotation based on title attribute */
                                /* When title contains "expand" (collapsed), point down (0deg or default) */
                                &[title*="expand"] .arrow-icon {
                                    transform: rotate(0deg);
                                }
                                /* When title contains "collapse" (expanded), point up (180deg) */
                                &[title*="collapse"] .arrow-icon {
                                    transform: rotate(180deg);
                                }
							}

                            /* Move microscope icon to the left */
                            .filter-icon {
                                order: 0;
                                margin-right: -0.25rem;
                                flex-shrink: 0; /* Prevent icon from shrinking */
                            }

                            /* Hide microscope icon when filter is collapsed (not expanded) */
                            &:has(.title-control[title*="expand"]) .filter-icon {
                                display: none !important;
                            }

                            /* Hide alphabet sort icon */
                            .sorting-icon {
                                display: none !important;
                            }
						}
						.title {
							font-size: 0.875rem;
							font-weight: 600;
							line-height: 1.25rem;
						}
						.toggle-button {
							font-size: 0.75rem;
							padding: 0.125rem 0.3125rem 0.5rem 0.3125rem;
							margin-left: 0.3125rem;
							.toggle-button-option {
								border: 0.0625rem solid #ddd;
								&:nth-of-type(2) {
									border-left: 0;
									border-right: 0;
								}
							}
							.toggle-button-option .bucket-count {
								font-size: 0.6875rem;
								display: inline-block;
								background-color: #e0e0e0;
								padding: 0 0.1875rem;
								border-radius: 0.1875rem;
							}
							.toggle-button-option.active {
								background-color: #e3f2fd;
								.bucket-count {
									background-color: #000000ff;
								}
							}
							.toggle-button-option.disabled {
								background-color: #f5f5f5;
								color: #999;
							}
						}
						input[type='checkbox'] {
						/* hide the native checkbox completely */
						appearance: none;
						-webkit-appearance: none;
						width: 1rem;
						height: 1rem;
						border: 0.0625rem solid #BABCC2;
						border-radius: 0.1875rem;
						display: inline-flex;
						justify-content: center;
						align-items: center;
						cursor: pointer;
						background: white; /* unselected box */
						}

						input[type='checkbox']:checked {
						background-color: #64BC46;
						border: 0.0625rem solid #64BC46;
						}

						input[type='checkbox']:checked::after {
						content: url("data:image/svg+xml,${checkIconDataUrl}");
						display: block;
						width: 12px;
						height: 9px;
						margin-bottom: 0.4rem;
						}
						.bucket-item {
						position: relative;
						margin: 0.125rem 0;
						padding: 0.125rem 0.5rem;
						}

						.bucket-item:has(input[type='checkbox']:checked) {
							&::before {
								content: "";
								position: absolute;

								top: -0.2rem;
								bottom: -0.2rem;

								left: 0;
								right: 0;

								background-color: #EFF8EC;

								z-index: 0;
							}

							/* Change bucket count background when checked */
							[class*="BucketCount"],
							[class*="bucket-count"] {
								background-color: #B2DDA2 !important;
							}
						}

						/* Keep content above the green highlight */
						.bucket-item > * {
						position: relative;
						z-index: 1;
						}

						/* Style for Select All button */
						.custom-select-all-btn {
							color: #286C77 !important;
							text-decoration: underline;
							background: none !important;
							border: none !important;
							cursor: pointer;
							font-size: 0.6875rem !important;
							margin: 0 !important;
							padding: 0 1rem !important;
							display: inline-block !important;
							font-weight: 300 !important;
							text-align: left !important;
							font-family: inherit;
							flex-shrink: 0;
							&:hover {
								text-decoration: underline;
							}
						}

						/* Container for Select All and More buttons */
						.custom-buttons-container {
							display: flex !important;
							align-items: center !important;
							justify-content: space-between !important;
							margin-top: 0.25rem !important;
							width: 100% !important;
							flex-wrap: nowrap !important;
							position: relative !important;
						}

						/* Position More button to the right */
						.custom-buttons-container button.showMore-wrapper,
						.custom-buttons-container button[class*="MoreOrLessButton"],
						.custom-buttons-container button:not(.custom-select-all-btn) {
							margin-right: 0.5rem !important;
							margin-left: auto !important;
							flex-shrink: 0 !important;
						}

					`,
					headerBackground: theme.colors.white,
					headerDividerColor: theme.colors.grey_2,
					headerFontColor: theme.colors.black,
				},
				BucketCount: {
					background: '#E5E7EB',
					fontSize: '0.75rem',
					css: css`
						margin-top: 0.1rem;
					`,
				},
				FilterInput: {
					css: css`
						border-radius: 0.3125rem;
						border: 0.0625rem solid ${theme.colors.primary};
						margin: 0.375rem 0.3125rem 0.4375rem 0;
						&.focused {
							box-shadow: inset 0 0 0.125rem 0.0625rem ${theme.colors.primary};
						}
						& input {
							font-size: 0.75rem;
							&::placeholder {
								color: ${theme.colors.black};
							}
						}
						input[type='text' i] {
							margin-left: 0.3125rem;
							margin-top: 0.125rem;
						}
					`,
				},
				MoreOrLessButton: {
					css: css`
						font-size: 0.6875rem;
						margin-top: -0.95rem;
						margin-right: 0.5rem;
						&::before {
							padding-top: 0.1875rem;
							margin-right: 0.1875rem;
						}
						&.more::before {
							content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 11 11'%3E%3Cpath fill='${primaryDarkEncoded}' fill-rule='evenodd' d='M7.637 6.029H6.034v1.613c0 .291-.24.53-.534.53-.294 0-.534-.239-.534-.53V6.03H3.363c-.294 0-.534-.238-.534-.529 0-.29.24-.529.534-.529h1.603V3.358c0-.291.24-.53.534-.53.294 0 .534.239.534.53V4.97h1.603c.294 0 .534.238.534.529 0 .29-.24.529-.534.529M5.5 0C2.462 0 0 2.462 0 5.5S2.462 11 5.5 11 11 8.538 11 5.5 8.538 0 5.5 0'/%3E%3C/svg%3E%0A");
						}
						&.less::before {
							content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 20 20'%3E%3Cpath fill='${primaryDarkEncoded}' fill-rule='evenodd' d='M13.81 10.952H6.19c-.523 0-.952-.428-.952-.952s.429-.952.952-.952h7.62c.523 0 .952.428.952.952s-.429.952-.952.952M10 0C4.476 0 0 4.476 0 10s4.476 10 10 10 10-4.476 10-10S15.524 0 10 0'/%3E%3C/svg%3E%0A");
						}
					`,
					fontColor: theme.colors.primary_dark,
				},
				RangeAgg: {
					css: css`
					&[data-fieldName='analysis.host.host_age'] .unit-wrapper {
						display: none;
					}
				`,
					RangeLabel: {
						borderRadius: '0.2rem',
						fontWeight: 'bold !important',
						css: css`
						font-size: 0.6875rem;
						background-color: #e0e0e0;
						&:last-of-type,
						&:nth-of-type(4) {
							background-color: #ffffff;
							color: #999;
						}
					`,
						padding: '0 0.2rem',
					},
					RangeSlider: {
						borderColor: '#ddd',
						disabledBackground: '#e0e0e0',
					},
					RangeTrack: {
						disabledInBackground: theme.colors.grey_1,
						disabledOutBackground: theme.colors.grey_3,
						inBackground: theme.colors.primary,
						outBackground: theme.colors.grey_1,
					},
				},
				TextHighlight: {
					css: css`
					&.active {
						color: #04518C !important;
					}
				`,
				},
				TreeJointIcon: {
					fill: theme.colors.primary,
					size: 8,
					transition: 'all 0s',
				},
			},
		},
	} as UseThemeContextProps;
};

const Facets = (): ReactElement => {
	const theme = useTheme() as CustomUIThemeInterface;
	useArrangerTheme(getAggregationsStyles(theme));
	const [isAllExpanded, setIsAllExpanded] = useState(false);

	useEffect(() => {
		// Root to observe (you can narrow this if you know a more specific selector)
		const root: ParentNode = document.body;

		const isMoreButton = (btn: HTMLButtonElement) => {
			const text = (btn.textContent || '').trim().toLowerCase();
			return (
				/\+?\d*\s*more/i.test(text) ||
				text === 'more' ||
				text === 'less'
			);
		};

		const addSelectAllButtons = () => {
			const groups = root.querySelectorAll<HTMLElement>('[class*="AggsGroup"]');

			groups.forEach(group => {
				// Need at least one bucket for this group
				const firstBucket = group.querySelector<HTMLElement>('.bucket-item');
				if (!firstBucket) return;

				const container = firstBucket.parentElement as HTMLElement | null;
				if (!container) return;

				// Apply flex layout to container to enable ordering
				if (container.style.display !== 'flex') {
					container.style.display = 'flex';
					container.style.flexDirection = 'column';
				}

				let buttonsContainer = container.querySelector('.custom-buttons-container') as HTMLElement;

				if (!buttonsContainer) {
					// Create wrapper for our button
					buttonsContainer = document.createElement('div');
					buttonsContainer.className = 'custom-buttons-container';

					const selectAllBtn = document.createElement('button');
					selectAllBtn.className = 'custom-select-all-btn';
					selectAllBtn.innerText = 'Select All';

					selectAllBtn.addEventListener('click', e => {
						e.preventDefault();
						e.stopPropagation();

						const allCheckboxes = group.querySelectorAll<HTMLInputElement>(
							'input[type="checkbox"]'
						);
						const checked = group.querySelectorAll<HTMLInputElement>(
							'input[type="checkbox"]:checked'
						);

						// If everything is checked, uncheck all; otherwise check all
						const targets =
							checked.length === allCheckboxes.length && allCheckboxes.length > 0
								? allCheckboxes
								: group.querySelectorAll<HTMLInputElement>(
									'input[type="checkbox"]:not(:checked)'
								);

						targets.forEach(cb => (cb as unknown as HTMLElement).click());
					});

					buttonsContainer.appendChild(selectAllBtn);
				}

				// Ensure button has high order
				buttonsContainer.style.order = '100';

				// Find the More/Less button in this container
				const moreButton = Array.from(
					container.querySelectorAll<HTMLButtonElement>('button')
				).find(btn => isMoreButton(btn));

				if (moreButton) {
					// Ensure More button has higher order
					moreButton.style.order = '101';
				}

				// Only append if not already in container
				if (buttonsContainer.parentElement !== container) {
					container.appendChild(buttonsContainer);
				}
			});
		};

		// Throttle using requestAnimationFrame instead of manual debouncing
		let scheduled = false;
		const handleMutations = () => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(() => {
				scheduled = false;
				addSelectAllButtons();
			});
		};

		// Initial run (in case everything is already rendered)
		addSelectAllButtons();

		const observer = new MutationObserver(handleMutations);
		observer.observe(root, { childList: true, subtree: true });

		return () => {
			observer.disconnect();
		};
	}, []);

	const handleToggleAll = () => {
		const toggleButtons = document.querySelectorAll('.title-control');
		toggleButtons.forEach((button) => {
			const title = button.getAttribute('title');
			if (isAllExpanded) {
				// If currently expanded, we want to collapse.
				// Look for "Click to collapse" which means it IS expanded.
				if (title && title.includes('Click to collapse')) {
					(button as HTMLElement).click();
				}
			} else {
				// If currently collapsed, we want to expand.
				// Look for "Click to expand" which means it IS collapsed.
				if (title && title.includes('Click to expand')) {
					(button as HTMLElement).click();
				}
			}
		});
		setIsAllExpanded(!isAllExpanded);
	};

	return (
		<article
			css={css`
				display: flex;
				flex-direction: column;
			`}
		>
			<div
				css={css`
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 0.375rem 0.5rem 0.125rem 0.5rem;
					border-bottom: none;
					background-color: ${theme.colors.white};
					position: sticky;
					top: 0;
					z-index: 5;
				`}
			>
				<h2
					css={css`
						font-size: 1rem;
						font-weight: 600;
						margin-left: 0.35rem;
					`}
				>
					Filters
				</h2>
				<button
					onClick={handleToggleAll}
					css={css`
                        background: none;
                        border: none;
                        color: #282A35;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 0.75rem;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        padding: 0;
                        /* Remove underline on hover */
                        &:hover {
                            text-decoration: none;
                        }
                    `}
				>
					{isAllExpanded ? 'Collapse All' : 'Expand All'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="4" /* Bolder arrow */
						strokeLinecap="round"
						strokeLinejoin="round"
						css={css`
                            margin-left: 0.25rem;
                            transition: transform 0.2s;
                            transform: ${isAllExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
                        `}
					>
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>
			</div>
			<Aggregations />
		</article>
	);
};

export default Facets;
