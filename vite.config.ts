import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Get version info at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const gitHash = execSync('git rev-parse HEAD').toString().trim();
const gitHashShort = execSync('git rev-parse --short=7 HEAD').toString().trim();
const buildTime = new Date().toISOString();

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(`${pkg.version}+${gitHashShort}`),
		__BUILD_TIME__: JSON.stringify(buildTime),
		__COMMIT_HASH__: JSON.stringify(gitHash)
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true
	}
});
