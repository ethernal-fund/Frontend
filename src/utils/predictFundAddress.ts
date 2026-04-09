// utils/predictFundAddress.ts
//
// Predice la address de un fondo PersonalFund antes de que sea deployado.
// Usa el mismo algoritmo CREATE2 que create_minimal_proxy_to de Vyper:
//   keccak256(0xff ++ factory ++ salt ++ keccak256(initcode))[12:]
//
// El initcode EIP-1167 tiene esta estructura fija:
//   PREFIX (20 bytes) + implementation address (20 bytes) + SUFFIX (15 bytes)
//
// Fuente del initcode: Vyper docs + banteg.xyz/posts/minimal-proxies
// PR original: https://github.com/vyperlang/vyper/pull/2460

import { type Address, encodeAbiParameters, keccak256, concat, getAddress } from 'viem'

// EIP-1167 minimal proxy initcode — igual al que usa Vyper create_minimal_proxy_to
// pre + <20 bytes de implementation address> + post
const EIP1167_PREFIX = '0x3d602d80600a3d3981f3363d3d373d3d3d363d73' as const
const EIP1167_SUFFIX = '0x5af43d82803e903d91602b57fd5bf3'           as const

/**
 * Calcula el salt que usa la Factory para un usuario y nonce dados.
 * Debe coincidir exactamente con _generateSalt() en PersonalFundFactory.vy:
 *   keccak256(concat(convert(msg.sender, bytes20), convert(nonce, bytes32)))
 */
export function generateSalt(userAddress: Address, nonce: bigint): `0x${string}` {
  // address (20 bytes) + uint256 (32 bytes)
  const encoded = encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [userAddress, nonce]
  )
  return keccak256(encoded)
}

/**
 * Construye el initcode del proxy minimal para una implementation address dada.
 * PREFIX + implementation (20 bytes) + SUFFIX
 */
function buildProxyInitcode(implementation: Address): `0x${string}` {
  // Remover 0x de prefix, agregar address sin 0x, agregar suffix sin 0x
  const prefix  = EIP1167_PREFIX.slice(2)
  const impl    = implementation.slice(2).toLowerCase().padStart(40, '0')
  const suffix  = EIP1167_SUFFIX.slice(2)
  return `0x${prefix}${impl}${suffix}`
}

/**
 * Predice la address CREATE2 de un clon PersonalFund.
 *
 * @param factory        - Address del contrato PersonalFundFactory
 * @param implementation - Address del contrato PersonalFund (template)
 * @param userAddress    - Address del usuario que crea el fondo
 * @param nonce          - deploymentNonce del usuario (leer de Factory antes de llamar)
 *
 * @returns Address predicha del nuevo fondo
 *
 * @example
 * const nonce = await publicClient.readContract({
 *   address: FACTORY_ADDRESS,
 *   abi: factoryAbi,
 *   functionName: 'deploymentNonce',
 *   args: [userAddress],
 * })
 * const predicted = predictFundAddress(FACTORY_ADDRESS, PERSONAL_FUND_ADDRESS, userAddress, nonce)
 */
export function predictFundAddress(
  factory:        Address,
  implementation: Address,
  userAddress:    Address,
  nonce:          bigint,
): Address {
  const salt         = generateSalt(userAddress, nonce)
  const initcode     = buildProxyInitcode(implementation)
  const initcodeHash = keccak256(initcode as `0x${string}`)

  // CREATE2: keccak256(0xff ++ factory ++ salt ++ keccak256(initcode))[12:]
  const create2Input = concat([
    '0xff',
    factory,
    salt,
    initcodeHash,
  ])

  const hash    = keccak256(create2Input)
  const address = getAddress(`0x${hash.slice(26)}`) // últimos 20 bytes = slice(12, 32)

  return address
}

/**
 * Hook de conveniencia: obtiene el nonce actual del usuario y predice su próximo fondo.
 * Útil para mostrar la address en el UI antes de firmar la tx.
 *
 * @example
 * import { usePublicClient } from 'wagmi'
 * const client = usePublicClient()
 * const address = await getNextFundAddress(client, chainId, userAddress)
 */
export async function getNextFundAddress(
  publicClient:    { readContract: Function },
  factoryAddress:  Address,
  implAddress:     Address,
  userAddress:     Address,
): Promise<Address> {
  const nonce = await publicClient.readContract({
    address:      factoryAddress,
    abi:          [{ name: 'deploymentNonce', type: 'function', stateMutability: 'view',
                     inputs: [{ name: '_user', type: 'address' }],
                     outputs: [{ type: 'uint256' }] }],
    functionName: 'deploymentNonce',
    args:         [userAddress],
  }) as bigint

  return predictFundAddress(factoryAddress, implAddress, userAddress, nonce)
}