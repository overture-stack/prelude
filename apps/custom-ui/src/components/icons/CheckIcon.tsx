// SVG markup for use in data URLs
export const checkIconSvg = `<svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M0.336769 5.97383C-0.69312 4.96783 0.872843 3.43819 1.90273 4.44419L3.89348 6.38875L10.0973 0.329008C11.1272 -0.677116 12.6931 0.852646 11.6632 1.85866L4.67646 8.68319C4.24401 9.1056 3.54294 9.1056 3.11049 8.68319L0.336769 5.97383Z" fill="white"/></svg>`;

const CheckIcon = ({ className }: { className?: string }) => {
	return (
		<svg
			className={className}
			width="12"
			height="9"
			viewBox="0 0 12 9"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M0.336769 5.97383C-0.69312 4.96783 0.872843 3.43819 1.90273 4.44419L3.89348 6.38875L10.0973 0.329008C11.1272 -0.677116 12.6931 0.852646 11.6632 1.85866L4.67646 8.68319C4.24401 9.1056 3.54294 9.1056 3.11049 8.68319L0.336769 5.97383Z"
				fill="white"
			/>
		</svg>
	);
};

export default CheckIcon;

