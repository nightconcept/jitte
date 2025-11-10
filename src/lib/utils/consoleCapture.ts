/**
 * Console log capture utility for debugging
 * Captures console.log, info, warn, and error calls with timestamps
 */

interface LogEntry {
	timestamp: string;
	level: 'log' | 'info' | 'warn' | 'error';
	message: string;
}

class ConsoleCapture {
	private logs: LogEntry[] = [];
	private maxLogs = 50;
	private originalConsole = {
		log: console.log,
		info: console.info,
		warn: console.warn,
		error: console.error
	};

	constructor() {
		this.wrapConsole();
	}

	private formatTimestamp(): string {
		const now = new Date();
		const hours = now.getHours().toString().padStart(2, '0');
		const minutes = now.getMinutes().toString().padStart(2, '0');
		const seconds = now.getSeconds().toString().padStart(2, '0');
		const ms = now.getMilliseconds().toString().padStart(3, '0');
		return `${hours}:${minutes}:${seconds}.${ms}`;
	}

	private formatArgs(args: any[]): string {
		return args
			.map((arg) => {
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg);
					} catch {
						return String(arg);
					}
				}
				return String(arg);
			})
			.join(' ');
	}

	private addLog(level: 'log' | 'info' | 'warn' | 'error', args: any[]) {
		const timestamp = this.formatTimestamp();
		const message = this.formatArgs(args);

		this.logs.push({ timestamp, level, message });

		// Keep only the last maxLogs entries
		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
		}
	}

	private wrapConsole() {
		console.log = (...args: any[]) => {
			this.addLog('log', args);
			this.originalConsole.log(...args);
		};

		console.info = (...args: any[]) => {
			this.addLog('info', args);
			this.originalConsole.info(...args);
		};

		console.warn = (...args: any[]) => {
			this.addLog('warn', args);
			this.originalConsole.warn(...args);
		};

		console.error = (...args: any[]) => {
			this.addLog('error', args);
			this.originalConsole.error(...args);
		};
	}

	/**
	 * Get the last N log entries
	 */
	getLogs(count: number = 10): LogEntry[] {
		return this.logs.slice(-count);
	}

	/**
	 * Format logs as text for copying to clipboard
	 */
	getLogsAsText(count: number = 10): string {
		const logs = this.getLogs(count);
		if (logs.length === 0) {
			return 'No logs captured yet';
		}
		return logs.map((log) => `[${log.timestamp}] ${log.message}`).join('\n');
	}

	/**
	 * Get all captured logs
	 */
	getAllLogs(): LogEntry[] {
		return [...this.logs];
	}

	/**
	 * Clear all captured logs
	 */
	clear() {
		this.logs = [];
	}
}

// Create singleton instance
export const consoleCapture = new ConsoleCapture();
