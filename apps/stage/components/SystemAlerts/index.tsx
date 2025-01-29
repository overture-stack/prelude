import React, { useEffect, useState } from 'react';
import { AlertDef, SystemAlert } from './helper';

type SystemAlertsProps = {
	alerts?: AlertDef[]; // alerts prop is now optional
	resetOnRefresh?: boolean; // Reset dismissed alerts on refresh
};

const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts, resetOnRefresh = false }) => {
	const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

	// Fallback to environment variable if alerts prop is not provided
	const alertsFromEnv = process.env.NEXT_PUBLIC_SYSTEM_ALERTS ? JSON.parse(process.env.NEXT_PUBLIC_SYSTEM_ALERTS) : [];

	// Determine the final alerts to display
	const finalAlerts: AlertDef[] = alerts || alertsFromEnv; // Explicitly typing finalAlerts

	useEffect(() => {
		if (resetOnRefresh) {
			localStorage.removeItem('SYSTEM_ALERTS_DISMISSED_IDS');
			setDismissedAlertIds([]); // Reset the state
		} else {
			const storedDismissedIds = JSON.parse(localStorage.getItem('SYSTEM_ALERTS_DISMISSED_IDS') || '[]');
			setDismissedAlertIds(storedDismissedIds);
		}
	}, [resetOnRefresh]);

	const handleClose = (id: string) => {
		const updatedDismissedIds = [...dismissedAlertIds, id];
		setDismissedAlertIds(updatedDismissedIds);
		localStorage.setItem('SYSTEM_ALERTS_DISMISSED_IDS', JSON.stringify(updatedDismissedIds));
	};

	// Filter out dismissed alerts
	const displayAlerts = finalAlerts.filter((alert: AlertDef) => !dismissedAlertIds.includes(alert.id));

	return (
		<>
			{displayAlerts.map((alert) => (
				<SystemAlert alert={alert} key={alert.id} onClose={() => handleClose(alert.id)} />
			))}
		</>
	);
};

export default SystemAlerts;
