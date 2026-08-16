import { useMemo } from 'react';
import { useAuth } from '../features/auth';
import { ApiClient } from './apiClient';
import { config } from '../config/env';

export const useApiClient = (): ApiClient => {
  const { getAccessToken } = useAuth();

  const apiClient = useMemo(() => {
    return new ApiClient(
      {
        baseUrl: config.api.baseUrl,
      },
      getAccessToken
    );
  }, [getAccessToken]);

  return apiClient;
};
