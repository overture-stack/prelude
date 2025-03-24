import { css } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import { AlertDef, isAlertDefs, SystemAlert } from './helper';

type SystemAlertsProps = {
	alerts?: AlertDef[]; // alerts prop is optional
	resetOnRefresh?: boolean; // Reset dismissed alerts on refresh
};

const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts, resetOnRefresh = false }) => {
	const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

	// Safely parse the environment variable
	const getAlertsFromEnv = (): AlertDef[] => {
		try {
			// Read from NEXT_PUBLIC_SYSTEM_ALERTS environment variable
			const envAlerts = process.env.NEXT_PUBLIC_SYSTEM_ALERTS;

			if (typeof envAlerts === 'string' && envAlerts.trim() !== '') {
				const parsed = JSON.parse(envAlerts);
				if (isAlertDefs(parsed)) {
					return parsed;
				} else {
					console.warn('System alerts in environment variable are not in the expected format', parsed);
				}
			}
		} catch (error) {
			console.error('Error parsing system alerts from environment variable:', error);
		}
		return [];
	};

	// Determine the final alerts to display - prioritize props over environment variables
	const finalAlerts: AlertDef[] = alerts || getAlertsFromEnv();

	useEffect(() => {
		if (resetOnRefresh) {
			localStorage.removeItem('SYSTEM_ALERTS_DISMISSED_IDS');
			setDismissedAlertIds([]); // Reset the state
		} else {
			try {
				const storedDismissedIds = JSON.parse(localStorage.getItem('SYSTEM_ALERTS_DISMISSED_IDS') || '[]');
				setDismissedAlertIds(Array.isArray(storedDismissedIds) ? storedDismissedIds : []);
			} catch (error) {
				console.error('Error parsing dismissed alert IDs from localStorage:', error);
				setDismissedAlertIds([]);
			}
		}
	}, [resetOnRefresh]);

	const handleClose = (id: string) => {
		const updatedDismissedIds = [...dismissedAlertIds, id];
		setDismissedAlertIds(updatedDismissedIds);
		localStorage.setItem('SYSTEM_ALERTS_DISMISSED_IDS', JSON.stringify(updatedDismissedIds));
	};

	// Filter out dismissed alerts
	const displayAlerts = finalAlerts.filter((alert: AlertDef) => !dismissedAlertIds.includes(alert.id));

	if (displayAlerts.length === 0) {
		return null;
	}

	return (
		<div
			css={css`
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				width: 100%;
				z-index: 2000;
			`}
		>
			{displayAlerts.map((alert) => (
				<SystemAlert alert={alert} key={alert.id} onClose={() => handleClose(alert.id)} />
			))}
		</div>
	);
};

export default SystemAlerts;
