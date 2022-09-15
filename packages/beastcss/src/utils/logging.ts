/* eslint-disable no-console */
import { bold, yellow, blue, red } from 'kolorist';
import type Beastcss from '../Beastcss';

export declare const Levels: readonly [
  'debug',
  'info',
  'warn',
  'error',
  'silent'
];

export type LogLevel = typeof Levels[number];

export interface Logger {
  debug: (msg: string, processId?: Beastcss.ProcessId) => void;
  info: (msg: string, processId?: Beastcss.ProcessId) => void;
  warn: (msg: string, processId?: Beastcss.ProcessId) => void;
  error: (msg: string, processId?: Beastcss.ProcessId) => void;
}

/**
 * Log levels ordered by verbosity.
 */
const levels: typeof Levels = ['debug', 'info', 'warn', 'error', 'silent'];

export const defaultLogger: Logger = {
  debug(msg: string, processId: Beastcss.ProcessId) {
    console.debug(`${processId ? `[${processId}] ` : ''}${msg}`);
  },
  info(msg: string, processId: Beastcss.ProcessId) {
    console.info(bold(blue(`${processId ? `[${processId}] ` : ''}${msg}`)));
  },
  warn(msg: string, processId: Beastcss.ProcessId) {
    console.warn(yellow(`${processId ? `[${processId}] ` : ''}${msg}`));
  },
  error(msg: string, processId: Beastcss.ProcessId) {
    console.error(bold(red(`${processId ? `[${processId}] ` : ''}${msg}`)));
  },
};

/**
 * Set the verbosity output of logger.
 */
export function setVerbosity(logger: Logger, logLevel: LogLevel): Logger {
  const logLevelIdx = levels.indexOf(logLevel);

  levels.forEach((type: LogLevel, index) => {
    if (index < logLevelIdx && type !== 'silent') {
      logger[type] = () => undefined; // silent
    }
  });

  return logger;
}
