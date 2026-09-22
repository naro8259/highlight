import type { QuickStartContent } from '../../QuickstartContent'
import { verifyLogs } from '../shared-snippets-logging'
import { verifyTraces } from '../shared-snippets-tracing'
import { jsGetSnippet, verifyError } from './shared-snippets-monitoring'

const serverHooks = `import { building } from '$app/environment'
import { H } from '@highlight-run/node'
import type { Handle, HandleServerError } from '@sveltejs/kit'

if (!building && !H.isInitialized()) {
  H.init({
    projectID: '<YOUR_PROJECT_ID>',
    serviceName: 'sveltekit-server',
    environment: 'production',
  })
}

export const handle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event)

  // Copy Web Headers into a mutable carrier before passing them to OpenTelemetry.
  const headers = Object.fromEntries(event.request.headers)

  return H.runWithHeaders(
    \`\${event.request.method} \${event.url.pathname}\`,
    headers,
    () => resolve(event),
  )
}

export const handleError: HandleServerError = ({ error, event, message }) => {
  if (!building) {
    const headers = Object.fromEntries(event.request.headers)
    const { secureSessionId, requestId } = H.parseHeaders(headers)
    H.consumeError(
      error instanceof Error ? error : new Error(String(error)),
      secureSessionId,
      requestId,
    )
  }

  return { message }
}`

export const JSSvelteKitReorganizedContent: QuickStartContent = {
	title: 'SvelteKit',
	subtitle: 'Capture server errors, logs, and traces from SvelteKit.',
	logoKey: 'sveltekit',
	products: ['Errors', 'Logs', 'Traces'],
	entries: [
		jsGetSnippet(['node']),
		{
			title: 'Instrument requests in `hooks.server.ts`.',
			content:
				'Initialize `@highlight-run/node` in a server-only hook and wrap each request with `H.runWithHeaders`. ' +
				'Use `Object.fromEntries(event.request.headers)` for the tracing carrier: SvelteKit exposes Web `Headers`, while OpenTelemetry injects propagation values by mutating the carrier. ' +
				"`handleError` reports unexpected server errors and preserves SvelteKit's safe response message.",
			code: [{ text: serverHooks, language: 'ts' }],
		},
		{
			title: 'Use a Node-compatible SvelteKit deployment.',
			content:
				'This setup uses the Highlight Node SDK, so deploy with a Node-compatible adapter such as `@sveltejs/adapter-node`. Static-only and edge-only deployments do not run this Node server hook.',
		},
		verifyError(
			'SvelteKit',
			`// src/routes/highlight-test/+server.ts
export const GET = () => {
  throw new Error('SvelteKit backend test error')
}`,
		),
		verifyLogs,
		verifyTraces,
	],
}
