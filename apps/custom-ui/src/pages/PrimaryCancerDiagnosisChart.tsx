/** @jsxImportSource @emotion/react */
import { css, useTheme } from '@emotion/react';
import { BarChart, ChartsProvider, ChartsThemeProvider } from '@overture-stack/arranger-charts';
import { useArrangerData } from '@overture-stack/arranger-components';
import { ReactElement, useMemo } from 'react';
import { CustomUIThemeInterface } from '../theme';
import ErrorBoundary from '../components/ErrorBoundary';
import { chartFilter } from '../utils/sqonHelpers';
import { shuffleArray } from '../utils/chartUtils';

const PrimaryCancerDiagnosisChart = (): ReactElement => {
    const theme = useTheme() as CustomUIThemeInterface;
    const { sqon, setSQON } = useArrangerData({ callerName: 'PrimaryCancerDiagnosisChart' });

    const chartFilters = useMemo(() => ({
        selfReportedPrimaryCancerDiagnosis: chartFilter('data__selfReportedPrimaryCancerDiagnosis', sqon, setSQON),
    }), [sqon, setSQON]);

    const shuffledPalette = useMemo(() => shuffleArray(theme.colors.chartPalette), []);

    return (
        <div
            css={css`
				padding: 1.25rem;
				background-color: ${theme.colors.white};
				border-radius: 0.5rem;
				border: 0.0625rem solid #BABCC2;
				margin: 0.9375rem 0;
			`}
        >
            <h3
                css={css`
					margin: 0 0 1.25rem 0;
					color: ${theme.colors.black};
					font-size: 1.125rem;
					font-weight: 600;
					font-family: 'Montserrat', sans-serif;
				`}
            >
                Primary Cancer Diagnosis
            </h3>

            <div style={{ height: '400px' }}>
                <ErrorBoundary>
                    <ChartsProvider debugMode={false} loadingDelay={0}>
                        <ChartsThemeProvider colors={shuffledPalette}>
                            <BarChart
                                fieldName="data__selfReportedPrimaryCancerDiagnosis"
                                maxBars={15}
                                handlers={{
                                    onClick: (config) => {
                                        return chartFilters.selfReportedPrimaryCancerDiagnosis(config.data.key);
                                    },
                                }}
                                theme={{
                                    axisLeft: {
                                        legend: 'Diagnosis',
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

export default PrimaryCancerDiagnosisChart;

