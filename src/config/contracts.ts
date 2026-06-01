import { useChainId } from 'wagmi'
import type { Abi } from 'viem'

// Chain JSON imports 
import raw421614   from '@/abis/ethernal-abis-421614.json'
import raw11155111 from '@/abis/ethernal-abis-11155111.json'
// import raw80002   from './ethernal-abis-80002.json'   polygon

// Types 

export type ContractName =
  | 'personalFundFactory'
  | 'personalFund'
  | 'treasury'
  | 'protocolRegistry'
  | 'userPreferences'
  | 'dateTime'
  | 'mockDeFiProtocol'
  | 'mockAaveAdapter'
  | 'mockOndoAdapter'
  | 'mockRWAToken'
  | 'mockUniswapRouter'
  | 'genericOndoRWAAdapter'
  | 'usdc'

export interface ContractEntry {
  address: `0x${string}`
  abi:     Abi
}

/** Registro completo de una chain. Cada contrato puede tener o no ABI. */
export type ChainContracts = {
  [K in ContractName]?: ContractEntry
}

// PascalCase → camelCase name map
// Mapea los nombres que vienen del JSON de Ethernal a los nombres canónicos.

const PASCAL_TO_CAMEL: Record<string, ContractName> = {
  PersonalFundFactory:   'personalFundFactory',
  PersonalFund:          'personalFund',
  Treasury:              'treasury',
  ProtocolRegistry:      'protocolRegistry',
  UserPreferences:       'userPreferences',
  DateTime:              'dateTime',
  MockDeFiProtocol:      'mockDeFiProtocol',
  MockAaveAdapter:       'mockAaveAdapter',
  MockOndoAdapter:       'mockOndoAdapter',
  MockRWAToken:          'mockRWAToken',
  MockUniswapRouter:     'mockUniswapRouter',
  GenericOndoRWAAdapter: 'genericOndoRWAAdapter',
}

// Raw JSON type (shape de ethernal-abis-{chainId}.json) 

interface EthernalJson {
  network:   string
  chain_id:  number
  generated: string
  usdc:      string
  contracts: Record<string, { address: string; abi: Abi }>
}

// Chain JSON registry 
// Agrega aquí cada JSON importado: { chainId: rawJson }

const CHAIN_JSONS: Record<number, EthernalJson> = {
  421614:   raw421614   as EthernalJson,
  11155111: raw11155111 as EthernalJson,
}

// USDC overrides 
// Para testnets con mock USDC distinto al que trae el JSON de Ethernal.
// Si el JSON ya tiene el USDC correcto, podés dejarlo vacío.

const USDC_OVERRIDES: Record<number, `0x${string}`> = {
  // 421614:   '0x...',  // descomentar si el JSON trae un USDC distinto
  // 11155111: '0x...',
  80002: '0xDA7610fD028bA2958d1Bb3dcB43F2d5d2Fb2A29d',
}

// Official USDC (mainnets y testnets sin JSON) 
const OFFICIAL_USDC: Record<number, `0x${string}`> = {
  421614:   '0x0463fb7aD07Eac920D1c3F55c96f22c35D5e9E7D',
  80002:    '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  84532:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  11155111: '0xa27dc7dd223a00E89B885CE6968E6379F7146CD3',
  42161:    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  137:      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  8453:     '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  10:       '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  1:        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
}

const EMPTY_ABI: Abi = []
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// ─── Fallback chains (sin JSON: pending / mainnets) ────────────────────────
// Solo addresses. ABIs serán [] hasta que exista su JSON.

const FALLBACK_CHAINS: Record<number, Partial<Record<ContractName, `0x${string}`>>> = {
  80002: {
    personalFundFactory: '0xf7b6b09F99d37dC1338c75EcC02aeA8b6E9686E5',
    treasury:            '0xFf64f402aaF12f242ebd435656377e5fce30a9E9',
    protocolRegistry:    '0x52240E0A314f538632b9052fB1f3F21dC15E7911',
    userPreferences:     '0x9fa77C672781429f88aD4b8795AC6aa022732f20',
    dateTime:            '0x05c5B4914CF6840f0830feC6D0e1ef828624fB89',
  },
  // Mainnets y testnets pending: agrega addresses cuando se desplieguen
  84532:    {},
  11155420: {},
  42161:    {},
  137:      {},
  8453:     {},
  10:       {},
  1:        {},
}

// ─── Core normalizer ────────────────────────────────────────────────────────
function resolveUSDC(chainId: number, jsonUSDC?: string): `0x${string}` {
  return (
    USDC_OVERRIDES[chainId] ??
    (jsonUSDC as `0x${string}` | undefined) ??
    OFFICIAL_USDC[chainId] ??
    ZERO_ADDRESS
  )
}

function normalizeJson(json: EthernalJson): ChainContracts {
  const result: ChainContracts = {}

  for (const [pascalName, { address, abi }] of Object.entries(json.contracts)) {
    const canonical = PASCAL_TO_CAMEL[pascalName]
    if (!canonical) continue // nombre desconocido, ignorar
    result[canonical] = { address: address as `0x${string}`, abi }
  }

  // USDC como ContractEntry (ABI mínimo ERC-20 suficiente para la mayoría de casos)
  result.usdc = {
    address: resolveUSDC(json.chain_id, json.usdc),
    abi:     ERC20_ABI,
  }
  return result
}

function normalizeFallback(
  chainId: number,
  addresses: Partial<Record<ContractName, `0x${string}`>>,
): ChainContracts {
  const result: ChainContracts = {}
  for (const [name, address] of Object.entries(addresses) as [ContractName, `0x${string}`][]) {
    if (address && address !== ZERO_ADDRESS) {
      result[name] = { address, abi: EMPTY_ABI }
    }
  }
  result.usdc = {
    address: resolveUSDC(chainId),
    abi:     ERC20_ABI,
  }

  return result
}

// Build registry 
const REGISTRY: Record<number, ChainContracts> = {}
for (const [chainIdStr, json] of Object.entries(CHAIN_JSONS)) {
  REGISTRY[Number(chainIdStr)] = normalizeJson(json)
}
for (const [chainIdStr, addresses] of Object.entries(FALLBACK_CHAINS)) {
  const chainId = Number(chainIdStr)
  if (!REGISTRY[chainId]) {
    REGISTRY[chainId] = normalizeFallback(chainId, addresses)
  }
}

// Public API
/** Devuelve el registro de contratos para un chainId. Nunca undefined. */
export function getContracts(chainId: number): ChainContracts {
  return REGISTRY[chainId] ?? {}
}

/** Devuelve un contrato específico o undefined si no está desplegado. */
export function getContract(
  chainId:  number,
  name:     ContractName,
): ContractEntry | undefined {
  return REGISTRY[chainId]?.[name]
}

/** True si el contrato tiene address válida (no zero, no undefined). */
export function isDeployed(chainId: number, name: ContractName): boolean {
  const entry = getContract(chainId, name)
  return !!entry && entry.address !== ZERO_ADDRESS
}

/** True si los contratos core están todos desplegados en la chain. */
export function isCoreDeployed(chainId: number): boolean {
  const core: ContractName[] = [
    'personalFundFactory', 'treasury', 'protocolRegistry', 'userPreferences',
  ]
  return core.every((name) => isDeployed(chainId, name))
}

/**
 * Hook de wagmi: devuelve contratos para la chain actualmente conectada.
 */
export function useContracts(): ChainContracts {
  const chainId = useChainId()
  return getContracts(chainId)
}

/**
 * Hook de wagmi: devuelve un contrato específico de la chain conectada.
 * Lanza si el contrato no está desplegado en esa chain.
 *
 */
export function useContract(name: ContractName): ContractEntry {
  const chainId = useChainId()
  const entry   = getContract(chainId, name)
  if (!entry) {
    throw new Error(
      `[contracts] "${name}" no está desplegado en chain ${chainId}. ` +
      `Verificá CHAIN_JSONS o FALLBACK_CHAINS en contracts.ts.`
    )
  }
  return entry
}

// ERC-20 ABI mínimo (transfer, approve, balanceOf, allowance)
const ERC20_ABI: Abi = [
  { type: 'function', name: 'balanceOf',   stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                                                                         outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance',   stateMutability: 'view',       inputs: [{ name: 'owner',   type: 'address' }, { name: 'spender', type: 'address' }],                                   outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve',     stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount',  type: 'uint256' }],                                   outputs: [{ type: 'bool'    }] },
  { type: 'function', name: 'transfer',    stateMutability: 'nonpayable', inputs: [{ name: 'to',      type: 'address' }, { name: 'amount',  type: 'uint256' }],                                   outputs: [{ type: 'bool'    }] },
  { type: 'function', name: 'transferFrom',stateMutability: 'nonpayable', inputs: [{ name: 'from',    type: 'address' }, { name: 'to',      type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals',    stateMutability: 'view',       inputs: [],                                                                                                             outputs: [{ type: 'uint8'   }] },
  { type: 'function', name: 'symbol',      stateMutability: 'view',       inputs: [],                                                                                                             outputs: [{ type: 'string'  }] },
]