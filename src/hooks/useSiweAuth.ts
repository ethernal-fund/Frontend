import { useWalletClient } from 'wagmi';
import { useAuthStore }    from '@/stores/authStore';
import { buildApiUrl, API_ENDPOINTS } from '@/config/api_config';
import api from '@/lib/axios';

export function useSiweAuth() {
  const { data: walletClient } = useWalletClient();
  const { setTokens, logout }  = useAuthStore();

  const login = async () => {
    if (!walletClient) throw new Error('Wallet no conectada');
    const address = walletClient.account.address;

    const { data: { nonce } } = await api.get(                                       // pide el nonce
      buildApiUrl(API_ENDPOINTS.AUTH.NONCE),
      { params: { address } }
    );

    const message   = `Ethernal Fund\nNonce: ${nonce}`;                              // mensaje a firmar en la wallet (pop up)
    const signature = await walletClient.signMessage({ message });                   // el backend verifica y emite los tokens
    const { data } = await api.post(buildApiUrl(API_ENDPOINTS.AUTH.VERIFY), {
      address, signature, nonce,
    });

    setTokens(data.accessToken, data.refreshToken);
  };

  return { login, logout };
}