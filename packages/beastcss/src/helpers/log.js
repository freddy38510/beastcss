/* eslint-disable no-console */
import chalk from 'chalk';

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];

export const defaultLogger = {
  trace(msg) {
    console.trace(msg);
  },
  debug(msg) {
    console.debug(msg);
  },
  info(msg) {
    console.info(chalk.bold.blue(msg));
  },
  warn(msg) {
    console.warn(chalk.yellow(msg));
  },
  error(msg) {
    console.error(chalk.bold.red(msg));
  },
};

/**
 * Set the verbosity output of logger
 *
 * @param {import('../index').Logger} logger default or custom logger
 * @param {import('../index').logLevel} logLevel logging level verbosity
 * @returns {import('../index').Logger} logger with verbosity set from logLevel
 */
export function setVerbosity(logger, logLevel) {
  const logLevelIdx = LOG_LEVELS.indexOf(logLevel);
  const newLogger = [];

  LOG_LEVELS.forEach((type, index) => {
    if (index < logLevelIdx) {
      newLogger[type] = () => undefined; // silent

      return;
    }

    newLogger[type] = logger[type];
  });

  return newLogger;
}
