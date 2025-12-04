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
  const parsed = ethers.Transaction.from(signedRawTx)
  if (!parsed.signature) {
    throw new Error('signedRawTx did not contain signature')
  }

  // Normalize parity to 0 or 1
  const yParity = parsed.signature.yParity

  // Create a new transaction with the correct signature
  const newTx = ethers.Transaction.from({
    ...unsignedTx,
    to: unsignedTx.to as string,
    signature: {
      r: parsed.signature.r,
      s: parsed.signature.s,
      v: yParity, // Force v to be yParity (0 or 1)
    },
  } as any)

  return provider.broadcastTransaction(newTx.serialized)
}

export type SendSignedRawTxWithParityFix = typeof sendSignedRawTxWithParityFix
