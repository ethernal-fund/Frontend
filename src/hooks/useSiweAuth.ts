import { useCallback }     from 'react';
import { useWalletClient } from 'wagmi';
import { useAuthStore }    from '@/stores/authStore';
import { buildApiUrl, API_ENDPOINTS } from '@/config/api.config';
import api from '@/lib/axios';

export function useSiweAuth() {
  const { data: walletClient } = useWalletClient();
  const { setTokens, logout }  = useAuthStore();

  const login = useCallback(async (): Promise<void> => {
    if (!walletClient) throw new Error('Wallet no conectada');

    const address = walletClient.account.address;
    const { data: nonceData } = await api.post<{ nonce: string; message: string }>(
      buildApiUrl(API_ENDPOINTS.AUTH.NONCE),
      { wallet_address: address },
    );

    const signature = await walletClient.signMessage({ message: nonceData.message });
    const { data } = await api.post<{ access_token: string }>(
      buildApiUrl(API_ENDPOINTS.AUTH.VERIFY),
      {
        wallet_address: address,
        signature,
        nonce: nonceData.nonce,
      },
    );

    setTokens(data.access_token);
  }, [walletClient, setTokens]);

  const silentLogin = useCallback(async (): Promise<boolean> => {
    if (!walletClient) return false;
    try {
      await login();
      return true;
    } catch {
      return false;
    }
  }, [walletClient, login]);

  return { login, silentLogin, logout };
}