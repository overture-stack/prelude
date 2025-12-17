/** @jsxImportSource @emotion/react */
import { css, useTheme } from '@emotion/react';
import { useArrangerData } from '@overture-stack/arranger-components';
import { ReactElement, useEffect, useState } from 'react';
import { CustomUIThemeInterface } from '../theme';
import createArrangerFetcher from '../utils/arrangerFetcher';
import ParticipantIcon from './icons/ParticipantIcon';
import GeneticIcon from './icons/GeneticIcon';
import PrimarySiteIcon from './icons/PrimarySiteIcon';

// Configuration from environment variables or defaults
const ARRANGER_API = import.meta.env.VITE_ARRANGER_API || 'http://localhost:5050';

const arrangerFetcher = createArrangerFetcher({
	ARRANGER_API,
});

const statsQuery = `
	query ($sqon: JSON) {
		file {
			aggregations(filters: $sqon) {
				data__selfreportedprimarycancerdiagnosis {
					buckets {
						key
					}
				}
				data__selfreportedgeneticsclinicvisited {
					buckets {
						key
					}
				}
				data__participantid {
					buckets {
						key
					}
				}
			}
		}
	}
`;

const Stats = (): ReactElement => {
	const theme = useTheme() as CustomUIThemeInterface;
	const { sqon } = useArrangerData({ callerName: 'Stats' });
	const [stats, setStats] = useState({
		totalParticipants: 0,
		uniqueVariants: 0,
		primarySites: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		const queryBody = {
			variables: sqon ? { sqon } : {},
			query: statsQuery,
		};
		
		console.log('Sending query:', JSON.stringify(queryBody, null, 2));
		
		arrangerFetcher({
			endpoint: 'graphql',
			body: JSON.stringify(queryBody),
		})
			.then((response: any) => {
				console.log('Stats response:', response);
				const data = response?.data?.file || response?.file;
				if (data) {
					// Count unique participants using aggregation
					const participantAggs = data.aggregations?.data__participantid?.buckets || [];
					const totalParticipants = participantAggs.length;

					const primaryCancerAggs = data.aggregations?.data__selfreportedprimarycancerdiagnosis?.buckets || [];
					const uniqueVariants = primaryCancerAggs.length;
					const geneticsClinicAggs = data.aggregations?.data__selfreportedgeneticsclinicvisited?.buckets || [];
					const primarySites = geneticsClinicAggs.length;

					console.log('Parsed stats:', { totalParticipants, uniqueVariants, primarySites, participantAggs, primaryCancerAggs, geneticsClinicAggs });
					console.log('Available aggregations:', Object.keys(data.aggregations || {}));
					setStats({
						totalParticipants,
						uniqueVariants,
						primarySites,
					});
				} else {
					console.warn('No data in response:', response);
				}
				setLoading(false);
			})
			.catch((err: any) => {
				console.error('Error fetching stats:', err);
				console.error('Error response data:', err?.response?.data);
				console.error('Error response status:', err?.response?.status);
				setLoading(false);
			});
	}, [sqon]);

	return (
		<div
			css={css`
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				margin: 0.9375rem 0;
				padding: 1.25rem;
				background-color: ${theme.colors.white};
				border-radius: 0.5rem;
				border: 0.0625rem solid #BABCC2;
				align-items: center;
				@media (max-width: 768px) {
					flex-direction: column;
					gap: 1.25rem;
					align-items: flex-start;
				}
			`}
		>
			<div
				css={css`
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 0.5rem;
					flex: 0 0 auto;
                    margin-left: 7rem;
				`}
			>
				<ParticipantIcon />
				<div
					css={css`
						display: flex;
						flex-direction: row;
						align-items: baseline;
						gap: 0.5rem;
					`}
				>
					<span
						css={css`
							font-size: 1rem;
							font-weight: 400;
							color: ${theme.colors.black};
						`}
					>
						{loading ? '...' : stats.totalParticipants.toLocaleString()}
					</span>
					<span
						css={css`
							font-size: 1rem;
							font-weight: 400;
							color: ${theme.colors.black};
						`}
					>
						Participants
					</span>
				</div>
			</div>
			<div
				css={css`
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 0.5rem;
					flex: 1 1 auto;
					justify-content: center;
				`}
			>
				<GeneticIcon />
				<div
					css={css`
						display: flex;
						flex-direction: row;
						align-items: baseline;
						gap: 0.5rem;
					`}
				>
					<span
						css={css`
							font-size: 1rem;
							font-weight: 400;
							color: ${theme.colors.black};
						`}
					>
						{loading ? '...' : stats.uniqueVariants.toLocaleString()}
					</span>
					<span
						css={css`
							font-size: 1rem;
							font-weight: 400;
							color: ${theme.colors.black};
						`}
					>
						Unique Genetic Variants
					</span>
				</div>
			</div>
			<div
				css={css`
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 0.5rem;
					flex: 0 0 auto;
					margin-right: 7rem;
				`}
			>
				<PrimarySiteIcon />
				<div
					css={css`
						display: flex;
						flex-direction: row;
						align-items: baseline;
						gap: 0.5rem;
					`}
				>
					<span
						css={css`
							font-size: 1rem;
							font-weight: 400;
							color: ${theme.colors.black};
						`}
					>
						{loading ? '...' : stats.primarySites.toLocaleString()}
					</span>
					<span
						css={css`
							font-size: 1rem;
							font-weight: 400;
							color: ${theme.colors.black};
						`}
					>
						Primary Sites
					</span>
				</div>
			</div>
		</div>
	);
};

export default Stats;

