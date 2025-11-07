/**
 * Type declarations for browser APIs that may not be in the standard lib
 */

interface FileSystemHandle {
	kind: 'file' | 'directory';
	name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
	kind: 'file';
	getFile(): Promise<File>;
	createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
	kind: 'directory';
	getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
	getDirectoryHandle(
		name: string,
		options?: { create?: boolean }
	): Promise<FileSystemDirectoryHandle>;
	removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
	resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
	keys(): AsyncIterableIterator<string>;
	values(): AsyncIterableIterator<FileSystemHandle>;
	entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
	queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
	requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemWritableFileStream extends WritableStream {
	write(data: BufferSource | Blob | string): Promise<void>;
	seek(position: number): Promise<void>;
	truncate(size: number): Promise<void>;
}

interface ShowDirectoryPickerOptions {
	id?: string;
	mode?: 'read' | 'readwrite';
	startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface ShowOpenFilePickerOptions {
	id?: string;
	mode?: 'read' | 'readwrite';
	startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
	types?: Array<{
		description?: string;
		accept: Record<string, string[]>;
	}>;
	excludeAcceptAllOption?: boolean;
	multiple?: boolean;
}

interface ShowSaveFilePickerOptions {
	id?: string;
	startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
	suggestedName?: string;
	types?: Array<{
		description?: string;
		accept: Record<string, string[]>;
	}>;
	excludeAcceptAllOption?: boolean;
}

interface Window {
	showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
	showOpenFilePicker(options?: ShowOpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
	showSaveFilePicker(options?: ShowSaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
