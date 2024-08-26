import { TransactionRequest } from "viem/_types/zksync/types/transaction";
import { abstractTestnet } from "viem/chains";

// TODO: type is not quite right
export function getSignInput(transaction: TransactionRequest) {
  return {
    txType: 113n,
    from: transaction.from!,
    to: transaction.to,
    gasLimit: transaction.gas,
    gasPerPubdataByteLimit: 50_000n,
    maxFeePerGas: transaction.maxFeePerGas,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
    paymaster: transaction.paymaster,
    nonce: transaction.nonce,
    value: 0,
    data: transaction.data,
    factoryDeps: [],
    paymasterInput: transaction.paymasterInput,
  };
}

export function typedDataTypes() {
  return {
    Transaction: [
      { name: "txType", type: "uint256" },
      { name: "from", type: "uint256" },
      { name: "to", type: "uint256" },
      { name: "gasLimit", type: "uint256" },
      { name: "gasPerPubdataByteLimit", type: "uint256" },
      { name: "maxFeePerGas", type: "uint256" },
      { name: "maxPriorityFeePerGas", type: "uint256" },
      { name: "paymaster", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "factoryDeps", type: "bytes32[]" },
      { name: "paymasterInput", type: "bytes" },
    ],
  };
}

export function getTypedDataDomain() {
  return {
    name: "zkSync",
    version: "2",
    chainId: abstractTestnet.id,
  }
}