import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number; // milliseconds, 0 = persistent (manual dismiss only)
	details?: string; // Optional error details
	persistent?: boolean; // If true, doesn't auto-dismiss
}

interface ToastStore {
	toasts: Toast[];
}

function createToastStore() {
	const { subscribe, update } = writable<ToastStore>({ toasts: [] });

	let idCounter = 0;

	return {
		subscribe,
		add: (message: string, type: ToastType = 'info', duration: number = 3000, details?: string, persistent?: boolean) => {
			const id = `toast-${Date.now()}-${idCounter++}`;
			const toast: Toast = { id, message, type, duration, details, persistent: persistent || duration === 0 };

			update((state) => ({
				toasts: [...state.toasts, toast]
			}));

			// Auto-dismiss after duration (unless persistent or duration is 0)
			if (duration > 0 && !persistent) {
				setTimeout(() => {
					toastStore.dismiss(id);
				}, duration);
			}

			return id;
		},
		dismiss: (id: string) => {
			update((state) => ({
				toasts: state.toasts.filter((t) => t.id !== id)
			}));
		},
		clear: () => {
			update(() => ({ toasts: [] }));
		},
		// Convenience methods
		success: (message: string, duration?: number) => {
			return toastStore.add(message, 'success', duration);
		},
		error: (message: string, duration?: number, details?: string) => {
			// Errors are persistent by default if they have details
			const isPersistent = details !== undefined;
			return toastStore.add(message, 'error', isPersistent ? 0 : (duration || 5000), details, isPersistent);
		},
		info: (message: string, duration?: number) => {
			return toastStore.add(message, 'info', duration);
		},
		warning: (message: string, duration?: number) => {
			return toastStore.add(message, 'warning', duration);
		}
	};
}

export const toastStore = createToastStore();
