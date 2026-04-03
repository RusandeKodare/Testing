import { getOAuthConfigLogDecision } from '../../../src/utils/oauthConfigStatus';

describe('oauthConfigStatus', () => {
  it('returns info when OAuth credentials are fully configured', () => {
    const decision = getOAuthConfigLogDecision('development', true, true);

    expect(decision.level).toBe('info');
    expect(decision.message).toBe('Google OAuth credentials configured. OAuth login enabled.');
  });

  it('returns info in development when credentials are missing', () => {
    const decision = getOAuthConfigLogDecision('development', false, false);

    expect(decision.level).toBe('info');
    expect(decision.message).toContain('OAuth login is disabled in development');
  });

  it('returns warn in non-development when credentials are missing', () => {
    const decision = getOAuthConfigLogDecision('production', false, false);

    expect(decision.level).toBe('warn');
    expect(decision.message).toBe('Google OAuth credentials not configured - OAuth login disabled');
  });
});