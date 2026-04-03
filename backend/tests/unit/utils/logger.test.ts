const childLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const rootLogger = {
  child: jest.fn(() => childLogger),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const transportMock = jest.fn(() => 'transport-instance');

const pinoMock: any = jest.fn(() => rootLogger);
pinoMock.transport = transportMock;
pinoMock.stdTimeFunctions = { isoTime: jest.fn() };

jest.mock('pino', () => pinoMock);
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

describe('logger utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('caches child logger per module', async () => {
    const loggerModule = await import('../../../src/utils/logger');

    const one = loggerModule.getLogger('profile');
    const two = loggerModule.getLogger('profile');

    expect(rootLogger.child).toHaveBeenCalledTimes(1);
    expect(one).toBe(two);
  });

  it('logs security login events for each event type', async () => {
    const loggerModule = await import('../../../src/utils/logger');

    loggerModule.logSecurityEvent('login_attempt', { username: 'alice' });
    loggerModule.logSecurityEvent('login_success', { userId: 1 });
    loggerModule.logSecurityEvent('login_failed', { username: 'alice', reason: 'bad_password' });
    loggerModule.logSecurityEvent('registration', { username: 'alice' });
    loggerModule.logSecurityEvent('lockout', { username: 'alice', attempts: 5 });

    expect(childLogger.info).toHaveBeenCalledWith(
      { event: 'login_attempt', username: 'alice' },
      'Login attempt'
    );
    expect(childLogger.info).toHaveBeenCalledWith(
      { event: 'login_success', userId: 1 },
      'Successful login'
    );
    expect(childLogger.warn).toHaveBeenCalledWith(
      { event: 'login_failed', username: 'alice', reason: 'bad_password' },
      'Login failed'
    );
    expect(childLogger.info).toHaveBeenCalledWith(
      { event: 'registration', username: 'alice' },
      'New user registration'
    );
    expect(childLogger.error).toHaveBeenCalledWith(
      { event: 'lockout', username: 'alice', attempts: 5 },
      'Account locked due to failed attempts'
    );
  });

  it('creates production logger without transport', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';

    await import('../../../src/utils/logger');

    expect(transportMock).not.toHaveBeenCalled();
    expect(pinoMock).toHaveBeenCalled();
  });
});