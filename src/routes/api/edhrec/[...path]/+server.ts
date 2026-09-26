import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const path = params.path;
	if (!/^(?:commanders|cards)\/[a-z0-9-]+$|^top\/salt$/.test(path)) {
		return new Response('Invalid EDHREC path', { status: 400 });
	}

	try {
		const response = await fetch(`https://edhrec.com/${path}`);
		return new Response(await response.text(), {
			status: response.status,
			headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'text/html' }
		});
	} catch {
		return new Response('EDHREC is unavailable', { status: 502 });
	}
};
