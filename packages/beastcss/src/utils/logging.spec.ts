/* eslint-disable no-console */
import { bold, blue, yellow, red } from 'kolorist';
import { defaultLogger, setVerbosity } from './logging';

describe('logger', () => {
  let spyDebug: jest.SpyInstance;
  let spyInfo: jest.SpyInstance;
  let spyWarn: jest.SpyInstance;
  let spyError: jest.SpyInstance;

  beforeEach(() => {
    spyDebug = jest.spyOn(console, 'debug').mockImplementation();
    spyInfo = jest.spyOn(console, 'info').mockImplementation();
    spyWarn = jest.spyOn(console, 'warn').mockImplementation();
    spyError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should log until specified level', () => {
    const logger = setVerbosity(defaultLogger, 'debug');

    logger.debug('message');
    logger.info('message');
    logger.warn('message');
    logger.error('message');

    logger.debug('message', 'processId');
    logger.info('message', 'processId');
    logger.warn('message', 'processId');
    logger.error('message', 'processId');

    expect(spyDebug.mock.results).toHaveLength(2);
    expect(spyInfo.mock.results).toHaveLength(2);
    expect(spyWarn.mock.results).toHaveLength(2);
    expect(spyError.mock.results).toHaveLength(2);

    expect((spyDebug.mock.calls[0] as string[])[0]).toBe('message');
    expect((spyDebug.mock.calls[1] as string[])[0]).toBe('[processId] message');

    expect((spyInfo.mock.calls[0] as string[])[0]).toBe(bold(blue('message')));
    expect((spyInfo.mock.calls[1] as string[])[0]).toBe(
      bold(blue('[processId] message'))
    );

    expect((spyWarn.mock.calls[0] as string[])[0]).toBe(yellow('message'));
    expect((spyWarn.mock.calls[1] as string[])[0]).toBe(
      yellow('[processId] message')
    );

    expect((spyError.mock.calls[0] as string[])[0]).toBe(bold(red('message')));
    expect((spyError.mock.calls[1] as string[])[0]).toBe(
      bold(red('[processId] message'))
    );
  });

  it('should log until specified level with a custom logger', () => {
    const customLogger = setVerbosity(
      {
        debug: (msg: string) => console.debug(msg),
        info: (msg: string) => console.info(`prefix ${msg}`),
        warn: (msg: string) => console.warn(msg),
        error: (msg: string) => console.error(msg),
      },
      'info'
    );

    customLogger.debug('');
    customLogger.info('message');
    customLogger.warn('');
    customLogger.error('');

    const infoCalls = spyInfo.mock.calls[0] as string[];

    expect(spyDebug.mock.results).toHaveLength(0);
    expect(spyInfo.mock.results).toHaveLength(1);
    expect(spyWarn.mock.results).toHaveLength(1);
    expect(spyError.mock.results).toHaveLength(1);

    expect(infoCalls[0]).toBe('prefix message');
  });
});
