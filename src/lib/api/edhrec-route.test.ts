import { afterEach, expect, test, vi } from 'vitest';

import { GET } from '../../routes/api/edhrec/[...path]/+server';
import { EDHRECClient } from './edhrec-client';

afterEach(() => vi.unstubAllGlobals());

test('requests commander pages on the app origin', async () => {
	const fetch = vi.fn().mockResolvedValue(new Response('page'));
	vi.stubGlobal('fetch', fetch);

	await expect(new EDHRECClient().fetchCommanderPage("Atraxa, Praetors' Voice")).resolves.toBe(
		'page'
	);
	expect(fetch).toHaveBeenCalledWith('/api/edhrec/commanders/atraxa-praetors-voice', {
		signal: expect.any(AbortSignal)
	});
});

test('fetches allowed EDHREC pages through the server', async () => {
	const fetch = vi.fn().mockResolvedValue(
		new Response('page', {
			status: 200,
			headers: { 'Content-Type': 'text/html' }
		})
	);
	vi.stubGlobal('fetch', fetch);

	const response = await GET({ params: { path: 'commanders/atraxa-praetors-voice' } } as Parameters<
		typeof GET
	>[0]);
	expect(fetch).toHaveBeenCalledWith('https://edhrec.com/commanders/atraxa-praetors-voice');
	expect(response.status).toBe(200);
	expect(await response.text()).toBe('page');
});

test('rejects paths outside the EDHREC page allowlist', async () => {
	const fetch = vi.fn();
	vi.stubGlobal('fetch', fetch);

	const response = await GET({ params: { path: 'cards/../../admin' } } as Parameters<
		typeof GET
	>[0]);
	expect(response.status).toBe(400);
	expect(fetch).not.toHaveBeenCalled();
});
