export interface OAuthConfigLogDecision {
  level: 'info' | 'warn';
  message: string;
}

export function getOAuthConfigLogDecision(
  nodeEnv: string | undefined,
  hasGoogleClientId: boolean,
  hasGoogleClientSecret: boolean
): OAuthConfigLogDecision {
  if (hasGoogleClientId && hasGoogleClientSecret) {
    return {
      level: 'info',
      message: 'Google OAuth credentials configured. OAuth login enabled.'
    };
  }

  if (nodeEnv === 'development') {
    return {
      level: 'info',
      message: 'Google OAuth credentials not configured. OAuth login is disabled in development until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.'
    };
  }

  return {
    level: 'warn',
    message: 'Google OAuth credentials not configured - OAuth login disabled'
  };
}