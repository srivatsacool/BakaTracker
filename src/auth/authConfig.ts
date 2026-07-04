import { config } from '../config/env';

export const authConfig = {
  domain: config.auth.domain,
  clientId: config.auth.clientId,
  audience: config.auth.audience,
  redirectUri: config.auth.redirectUri,
};
