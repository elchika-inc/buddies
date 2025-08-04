export interface Environment {
  name: 'development' | 'staging' | 'production';
  api: {
    animals: string;
    users: string;
    matching: string;
    notifications: string;
  };
  enableDebug: boolean;
  sentryDsn?: string;
  analyticsId?: string;
}

const environments: Record<string, Environment> = {
  development: {
    name: 'development',
    api: {
      animals: import.meta.env.VITE_ANIMALS_API || 'http://localhost:8787',
      users: import.meta.env.VITE_USERS_API || 'http://localhost:8788',
      matching: import.meta.env.VITE_MATCHING_API || 'http://localhost:8789',
      notifications: import.meta.env.VITE_NOTIFICATIONS_API || 'http://localhost:8790'
    },
    enableDebug: true,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID
  },
  staging: {
    name: 'staging',
    api: {
      animals: 'https://animals.staging.pawmatch.workers.dev',
      users: 'https://users.staging.pawmatch.workers.dev',
      matching: 'https://matching.staging.pawmatch.workers.dev',
      notifications: 'https://notifications.staging.pawmatch.workers.dev'
    },
    enableDebug: true,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID
  },
  production: {
    name: 'production',
    api: {
      animals: 'https://animals.pawmatch.workers.dev',
      users: 'https://users.pawmatch.workers.dev',
      matching: 'https://matching.pawmatch.workers.dev',
      notifications: 'https://notifications.pawmatch.workers.dev'
    },
    enableDebug: false,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    analyticsId: import.meta.env.VITE_ANALYTICS_ID
  }
};

export const getCurrentEnvironment = (): Environment => {
  const envName = import.meta.env.VITE_ENVIRONMENT || 'development';
  return environments[envName] || environments.development;
};

export const isProduction = () => getCurrentEnvironment().name === 'production';
export const isStaging = () => getCurrentEnvironment().name === 'staging';
export const isDevelopment = () => getCurrentEnvironment().name === 'development';