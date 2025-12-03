import type { TransactionRequest } from 'ethers';
import type { JsonRpcProvider } from 'ethers';
import { ethers } from 'ethers';

/**
 * Normalize signature parity (v) to 0 or 1, re-serialize the EIP-1559 transaction and send it.
 *
 * This helper accepts an unsigned transaction object (must include chainId, type:2, maxFeePerGas, maxPriorityFeePerGas, nonce, gasLimit)
 * plus a signedRawTx string returned by the signer (e.g. Ledger). It parses the signature, forces v to parity (0/1),
 * re-serializes the tx and broadcasts it using the provided provider.
 *
 * Note: uses ethers v6 utilities for parsing/serializing.
 */
export async function sendSignedRawTxWithParityFix(
  provider: JsonRpcProvider,
  unsignedTx: TransactionRequest,
  signedRawTx: string
) {
  // Parse signed raw tx to extract r, s, v
  const parsed = ethers.utils.parseTransaction(signedRawTx)
  if (!parsed.r || !parsed.s || parsed.v === undefined) {
    throw new Error('signedRawTx did not contain r/s/v')
  }

  // Normalize parity to 0 or 1
  const parity = Number(parsed.v) % 2

  // Ensure unsignedTx has needed fields for serialization
  const txForSerialize = {
    to: unsignedTx.to,
    nonce: unsignedTx.nonce,
    value: unsignedTx.value ?? 0,
    gasLimit: unsignedTx.gasLimit,
    type: 2,
    chainId: unsignedTx.chainId,
    maxFeePerGas: unsignedTx.maxFeePerGas,
    maxPriorityFeePerGas: unsignedTx.maxPriorityFeePerGas,
    data: unsignedTx.data ?? '0x',
  }

  const raw = ethers.utils.serializeTransaction(txForSerialize as any, {
    r: parsed.r,
    s: parsed.s,
    v: parity,
  })

  return provider.sendTransaction(raw)
}

export type SendSignedRawTxWithParityFix = typeof sendSignedRawTxWithParityFix
