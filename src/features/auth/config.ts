import { config as envConfig } from '../../config/env';

export const authConfig = {
  domain: envConfig.auth.domain,
  clientId: envConfig.auth.clientId,
  audience: envConfig.auth.audience,
  redirectUri: envConfig.auth.redirectUri,
};
