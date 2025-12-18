/** @jsxImportSource @emotion/react */
import { css, useTheme } from '@emotion/react';
import { BarChart, ChartsProvider, ChartsThemeProvider } from '@overture-stack/arranger-charts';
import { useArrangerData } from '@overture-stack/arranger-components';
import { ReactElement, useMemo } from 'react';
import { CustomUIThemeInterface } from '../theme';
import ErrorBoundary from '../components/ErrorBoundary';
import { chartFilter } from '../utils/sqonHelpers';
import { shuffleArray } from '../utils/chartUtils';

const FamilyHistoryChart = (): ReactElement => {
    const theme = useTheme() as CustomUIThemeInterface;
    const { sqon, setSQON } = useArrangerData({ callerName: 'FamilyHistoryChart' });

    const chartFilters = useMemo(() => ({
        familyHistoryOfCancer: chartFilter('data__familyHistoryOfCancer', sqon, setSQON),
    }), [sqon, setSQON]);

    const shuffledPalette = useMemo(() => shuffleArray(theme.colors.chartPalette), []);

    return (
        <div
            css={css`
				padding: 0.75rem;
				background-color: ${theme.colors.white};
				border-radius: 0.5rem;
				border: 0.0625rem solid #BABCC2;
				margin: 0.9375rem 0;
			`}
        >
            <h3
                css={css`
					margin: 0 0 0.625rem 0;
					color: ${theme.colors.black};
					font-family: 'Montserrat', sans-serif;
					font-size: 0.875rem;
					font-weight: 600;
				`}
            >
                Family History of Cancer
            </h3>

            <div style={{ height: '180px' }}>
                <ErrorBoundary>
                    <ChartsProvider debugMode={false} loadingDelay={0}>
                        <ChartsThemeProvider colors={shuffledPalette}>
                            <BarChart
                                fieldName="data__familyHistoryOfCancer"
                                maxBars={15}
                                handlers={{
                                    onClick: (config) => {
                                        return chartFilters.familyHistoryOfCancer(config.data.key);
                                    },
                                }}
                                theme={{
                                    axisLeft: {
                                        legend: 'History',
                                    },
                                    axisBottom: {
                                        legend: 'Count',
                                    },
                                }}
                            />
                        </ChartsThemeProvider>
                    </ChartsProvider>
                </ErrorBoundary>
            </div>
        </div>
    );
};

export default FamilyHistoryChart;

