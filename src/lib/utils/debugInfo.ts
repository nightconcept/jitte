/**
 * Debug information utility for copying system state to clipboard
 */

import { consoleCapture } from './consoleCapture';

/**
 * Detect browser and OS information
 */
function getBrowserInfo(): string {
	const ua = navigator.userAgent;
	let browser = 'Unknown';
	let version = '';
	let os = 'Unknown';

	// Detect browser
	if (ua.includes('Chrome') && !ua.includes('Edg')) {
		browser = 'Chrome';
		version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
	} else if (ua.includes('Edg')) {
		browser = 'Edge';
		version = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
	} else if (ua.includes('Firefox')) {
		browser = 'Firefox';
		version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
	} else if (ua.includes('Safari') && !ua.includes('Chrome')) {
		browser = 'Safari';
		version = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
	}

	// Detect OS
	if (ua.includes('Windows NT 10.0')) {
		os = 'Windows 10/11';
	} else if (ua.includes('Windows')) {
		os = 'Windows';
	} else if (ua.includes('Mac OS X')) {
		const osVersion = ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || '';
		os = `macOS ${osVersion}`;
	} else if (ua.includes('Linux')) {
		os = 'Linux';
	} else if (ua.includes('Android')) {
		os = 'Android';
	} else if (ua.includes('iOS')) {
		os = 'iOS';
	}

	// Detect architecture
	const arch = navigator.userAgent.includes('x64') || navigator.userAgent.includes('WOW64')
		? 'x64'
		: navigator.userAgent.includes('ARM')
			? 'ARM'
			: '';

	return `${browser} ${version} (${os}${arch ? ' ' + arch : ''})`;
}

/**
 * Check if FileSystem Access API is available
 */
function hasFileSystemAPI(): boolean {
	return 'showOpenFilePicker' in window;
}

/**
 * Detect storage mode (would need to check actual usage)
 */
function getStorageMode(): string {
	// This is a placeholder - in reality, you'd check your actual storage system
	return hasFileSystemAPI() ? 'FileSystem' : 'localStorage';
}

/**
 * Format the current timestamp with timezone
 */
function formatTimestamp(): string {
	const now = new Date();
	const offset = -now.getTimezoneOffset();
	const offsetHours = Math.floor(Math.abs(offset) / 60)
		.toString()
		.padStart(2, '0');
	const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
	const offsetSign = offset >= 0 ? '+' : '-';

	// Get timezone abbreviation
	const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const tzAbbr = new Date()
		.toLocaleTimeString('en-US', { timeZoneName: 'short' })
		.split(' ')[2];

	return `${now.toISOString().slice(0, -1)}${offsetSign}${offsetHours}:${offsetMinutes} (${tzAbbr})`;
}

/**
 * Generate complete debug info text
 */
export function generateDebugInfo(): string {
	const lines: string[] = [];

	// Version info
	lines.push(`Jitte v${__APP_VERSION__}`);
	lines.push(`Timestamp: ${formatTimestamp()}`);
	lines.push(`Built: ${__BUILD_TIME__}`);
	lines.push(`Commit: ${__COMMIT_HASH__}`);
	lines.push('');

	// System info
	lines.push(`Browser: ${getBrowserInfo()}`);
	lines.push(`FileSystem API: ${hasFileSystemAPI() ? '✓ Available' : '✗ Not Available'}`);
	lines.push(`Storage Mode: ${getStorageMode()}`);
	lines.push('');

	// Console logs
	const logs = consoleCapture.getLogsAsText(10);
	lines.push('Console Log (last 10):');
	lines.push(logs);

	return lines.join('\n');
}
