type Level = 'silent' | 'error' | 'warn' | 'info' | 'debug';

function readLevel(): Level {
  try {
    const v =
      (import.meta as any)?.env?.VITE_LOG_LEVEL ??
      (globalThis as any)?.VITE_LOG_LEVEL ??
      'info';
    const s = String(v).toLowerCase();
    return (['silent','error','warn','info','debug'] as const).includes(s as any) ? (s as Level) : 'info';
  } catch { return 'info'; }
}

const order: Record<Level, number> = { silent:0, error:1, warn:2, info:3, debug:4 };
const lvl = readLevel();
const min = order[lvl] ?? 3;

// Lite console-backed logger compatible with server .info/.warn/.error usage
export const logger = {
  debug: (...args: any[]) => { if (min >= 4) console.debug(...args); },
  info:  (...args: any[]) => { if (min >= 3) console.info(...args); },
  warn:  (...args: any[]) => { if (min >= 2) console.warn(...args); },
  error: (...args: any[]) => { if (min >= 1) console.error(...args); },
  child: (_bindings: any) => logger
};