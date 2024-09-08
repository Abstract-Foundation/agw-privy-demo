import {
  encodeFunctionData,
  Hex,
  toBytes,
  keccak256,
  WalletClient,
  Address,
  Account,
  Transport,
  WriteContractParameters,
} from 'viem'
import { 
  getGeneralPaymasterInput,
  ChainEIP712,
} from 'viem/zksync';
import {BATCH_CALLER_ADDRESS, SMART_ACCOUNT_FACTORY_ADDRESS} from "./constants";
import AccountFactoryAbi from "./AccountFactory.json";

type Call = {
  target: Address
  allowFailure: boolean
  value: bigint
  callData: Hex
}

export async function deployAccountWithInitializer<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined,
  account extends Account | undefined = Account | undefined,
  chainOverride extends ChainEIP712 | undefined = ChainEIP712 | undefined,
>(
  signerClient: WalletClient<Transport, chain, account>,
  validatorAddress: Address,
  initCallData: Hex,
  initValue: bigint,
): Promise<Hex> {
  const addressBytes = toBytes(signerClient.account!.address);
  const salt = keccak256(addressBytes);

  const initialCall = {
    target: BATCH_CALLER_ADDRESS,
    allowFailure: false,
    value: initValue,
    callData: initCallData,
  } as Call;

  // Create calldata for initializing the proxy account
  const initializerCallData = encodeFunctionData({
    abi: [{
      name: 'initialize',
      type: 'function',
      inputs: [
        { name: 'initialK1Owner', type: 'address' },
        { name: 'initialK1Validator', type: 'address' },
        { name: 'modules', type: 'bytes[]' },
        {
          name: 'initCall',
          type: 'tuple',
          components: [
            { name: 'target', type: 'address' },
            { name: 'allowFailure', type: 'bool' },
            { name: 'value', type: 'uint256' },
            { name: 'callData', type: 'bytes' }
          ]
        }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    }],
    functionName: 'initialize',
    args: [
      signerClient.account!.address,
      validatorAddress,
      [],
      initialCall
    ]
  });

  const writeContractParams: WriteContractParameters<typeof AccountFactoryAbi, 'deployAccount'> = {
    account: signerClient.account!,
    chain: signerClient.chain,
    address: SMART_ACCOUNT_FACTORY_ADDRESS,
    abi: AccountFactoryAbi,
    functionName: 'deployAccount',
    args: [salt, initializerCallData],
  };

  const hash = await signerClient.writeContract(writeContractParams);
  return hash;
}
