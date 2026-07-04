import { useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { ApiClient } from './apiClient';
import { config } from '../config/env';

export const useApiClient = (): ApiClient => {
  const { getAccessToken } = useAuth();

  const apiClient = useMemo(() => {
    return new ApiClient(
      {
        baseUrl: config.api.baseUrl,
        version: config.api.version,
      },
      getAccessToken
    );
  }, [getAccessToken]);

  return apiClient;
};
