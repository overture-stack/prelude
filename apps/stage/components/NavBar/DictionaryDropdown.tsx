// components/NavBar/DictionaryDropdown.tsx
import { css, useTheme } from '@emotion/react';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { DictionaryInfo } from '../../pages/api/dictionaries';
import { InternalLink } from '../Link';
import Dropdown from './Dropdown';
import { StyledListLink } from './styles';

const DictionaryDropdown = () => {
	const router = useRouter();
	const theme = useTheme();
	const [dictionaries, setDictionaries] = useState<DictionaryInfo[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Fetch dictionaries from API
		fetch('/api/dictionaries')
			.then((response) => response.json())
			.then((data) => {
				setDictionaries(data);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching dictionaries:', error);
				setLoading(false);
			});
	}, []);

	if (loading) {
		return null; // Or a loading indicator
	}

	// If no dictionaries, return null
	if (dictionaries.length === 0) {
		return null;
	}

	// If only one dictionary, render as a simple link button (no dropdown chevron)
	if (dictionaries.length === 1) {
		const dictionary = dictionaries[0];
		return (
			<InternalLink path={dictionary.path}>
				<a
					css={css`
						width: 100%;
						height: 100%;
						display: flex;
						align-items: center;
						justify-content: center;
						color: ${theme.colors.accent_dark};
						font-size: 14px;
						font-weight: bold;
						text-decoration: none;
						cursor: pointer;

						&.active {
							color: ${theme.colors.primary_dark};
							background-color: ${theme.colors.grey_1};
						}
					`}
					className={cx({ active: router.asPath.startsWith(dictionary.path) })}
				>
					Data Dictionaries
				</a>
			</InternalLink>
		);
	}

	// Generate dropdown items for multiple dictionaries
	const dropdownItems = dictionaries.map((dictionary) => (
		<InternalLink key={dictionary.id} path={dictionary.path}>
			<StyledListLink className={cx({ active: router.asPath.startsWith(dictionary.path) })}>
				{dictionary.title}
			</StyledListLink>
		</InternalLink>
	));

	// Convert dictionary paths to INTERNAL_PATHS type using type assertion
	const dictionaryPaths = dictionaries.map((dictionary) => dictionary.path as unknown as INTERNAL_PATHS);

	return (
		<Dropdown
			css={css`
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				color: ${theme.colors.accent_dark};
				font-size: 14px;
				font-weight: bold;
			`}
			data={dropdownItems}
			label="Dictionaries"
			urls={dictionaryPaths}
		/>
	);
};

export default DictionaryDropdown;
