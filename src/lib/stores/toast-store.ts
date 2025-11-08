import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number; // milliseconds
}

interface ToastStore {
	toasts: Toast[];
}

function createToastStore() {
	const { subscribe, update } = writable<ToastStore>({ toasts: [] });

	let idCounter = 0;

	return {
		subscribe,
		add: (message: string, type: ToastType = 'info', duration: number = 3000) => {
			const id = `toast-${Date.now()}-${idCounter++}`;
			const toast: Toast = { id, message, type, duration };

			update((state) => ({
				toasts: [...state.toasts, toast]
			}));

			// Auto-dismiss after duration
			if (duration > 0) {
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
		error: (message: string, duration?: number) => {
			return toastStore.add(message, 'error', duration);
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
