export interface FaucetRequest {
  address: string;                    // Ethereum address (checksum)
  turnstile_token?: string;           
}

export interface FaucetResponse {
  success: boolean;
  message: string;
  tx_hash: string | null;
  amount: number | null;              // USDC enviado (ej: 100.0)
  balance: number | null;             // Balance del wallet tras recibir
  wait_time?: number | null;          // Segundos a esperar si hay rate limit
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  rpc_connected: boolean;
  faucet_balance: number;             // Balance USDC del faucet
  redis_available: boolean;
  database_enabled: boolean;
  timestamp: string;
}

export interface BalanceResponse {
  address: string;
  balance: number;
  symbol: string;                     // "USDC"
  decimals: number;                   // 6
}

export interface StatsResponse {
  faucet_balance: number;
  total_requests: number;
  unique_wallets: number;
  unique_ips: number;
  amount_per_request: number;
  using_redis: boolean;
  rate_limits: {
    per_ip_seconds: number;
    per_wallet_seconds: number;
  };
}

export interface RootResponse {
  name: string;
  version: string;
  environment: string;
  network: string;
  chain_id: number;
  contract: string;
  features: {
    database: boolean;
    redis: boolean;
    turnstile: boolean;
  };
  endpoints: Record<string, string>;
}

export class FaucetAPIClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL =
      baseURL ||
      import.meta.env.VITE_FAUCET_API_URL ||
      "http://localhost:8000";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(
          error.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Network error");
    }
  }

  async root(): Promise<RootResponse> {
    return this.request<RootResponse>("/");
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  async requestTokens(data: FaucetRequest): Promise<FaucetResponse> {
    return this.request<FaucetResponse>("/faucet", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getBalance(address: string): Promise<BalanceResponse> {
    return this.request<BalanceResponse>(`/balance/${address}`);
  }

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>("/stats");
  }
}

export default FaucetAPIClient;