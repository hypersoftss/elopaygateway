export type LoginLanguage = 'zh' | 'en';

type AuthErrorLike = {
  message?: string;
  status?: number;
};

const NETWORK_ERROR_REGEX = /failed to fetch|fetch failed|networkerror|network request failed|load failed|typeerror/i;
const RATE_LIMIT_ERROR_REGEX = /rate limit|too many requests|429/;
const INVALID_CREDENTIALS_REGEX = /invalid login credentials|invalid credentials|email not confirmed|invalid email or password/;

export const getLoginErrorMessage = (
  error: AuthErrorLike | null | undefined,
  language: LoginLanguage,
  fallbackInvalidCredentials: string
): string => {
  const rawMessage = (error?.message || '').trim();
  const message = rawMessage.toLowerCase();

  if (NETWORK_ERROR_REGEX.test(message)) {
    return language === 'zh'
      ? '网络连接失败，请检查网络或稍后重试'
      : 'Network error: cannot reach backend. Please check internet/VPN and try again.';
  }

  if (RATE_LIMIT_ERROR_REGEX.test(message)) {
    return language === 'zh'
      ? '请求过于频繁，请等待1分钟后重试'
      : 'Too many attempts. Please wait 1 minute and try again.';
  }

  if (INVALID_CREDENTIALS_REGEX.test(message)) {
    return fallbackInvalidCredentials;
  }

  return rawMessage || fallbackInvalidCredentials;
};
