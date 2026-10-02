import { AsyncLocalStorage } from 'node:async_hooks';

export interface Credentials {
  apiUrl: string;
  apiToken: string;
}

const requestCredentials = new AsyncLocalStorage<Credentials>();

/**
 * Runs `fn` with credentials scoped to the current async context, so a single process can
 * serve many users at once (remote Streamable HTTP mode). Takes priority over env vars and
 * ~/.sigq/config.json.
 */
export function runWithCredentials<T>(credentials: Credentials, fn: () => T): T {
  return requestCredentials.run(credentials, fn);
}

export function getScopedCredentials(): Credentials | undefined {
  return requestCredentials.getStore();
}
