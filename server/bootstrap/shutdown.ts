import type { Server } from 'node:http';

type Hook = () => Promise<void> | void;

let draining = false;
const hooks = new Set<Hook>();

export function isDraining() { return draining; }

export function registerShutdownHook(fn: Hook) {
  hooks.add(fn);
  return () => hooks.delete(fn);
}

/**
 * Wire process signals, stop accepting new requests, wait for in-flight to finish,
 * run registered hooks, then exit (force after grace).
 */
export function initGracefulShutdown(server: Server, opts?: { graceMs?: number }) {
  const graceMs = opts?.graceMs ?? 25000;

  // Optional: harden Node's default timeouts for keep-alive conns
  try {
    // @ts-ignore (these exist on Node HTTP server)
    server.keepAliveTimeout = 65000;
    // @ts-ignore
    server.headersTimeout = 66000;
  } catch {}

  const sockets = new Set<any>();
  server.on('connection', (socket: any) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  async function shutdown(signal: string) {
    if (draining) return;
    draining = true;
    console.log(`[shutdown] received ${signal}, draining...`);

    // stop accepting new connections
    server.close(() => {
      console.log('[shutdown] http server closed');
    });

    // run hooks in parallel
    const runHooks = Promise.allSettled(Array.from(hooks).map(fn => Promise.resolve().then(fn)));

    // force stop after grace period
    const force = setTimeout(() => {
      console.warn('[shutdown] force-closing remaining sockets');
      for (const s of sockets) {
        try { s.destroy(); } catch {}
      }
      process.exit(1);
    }, graceMs);

    try {
      await runHooks;
      clearTimeout(force);
      console.log('[shutdown] all hooks completed, exiting');
      process.exit(0);
    } catch {
      clearTimeout(force);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}