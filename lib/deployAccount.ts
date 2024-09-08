import {
  Address,
  encodeFunctionData,
  Hex,
  toBytes,
  keccak256,
  WalletClient,
  Transport,
  WriteContractParameters,
  Account,
} from 'viem'
import {
  ChainEIP712
} from 'viem/zksync';
import { BATCH_CALLER_ADDRESS, SMART_ACCOUNT_FACTORY_ADDRESS } from "./constants";
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
>(
  signerClient: WalletClient<Transport, chain, account>,
  validatorAddress: Address,
  initCallData: Hex,
  initValue: bigint,
  paymaster?: Address | undefined,
  paymasterInput?: Hex | undefined
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

  const writeContractParams = {
    account: signerClient.account as Account,
    chain: signerClient.chain,
    address: SMART_ACCOUNT_FACTORY_ADDRESS as Hex,
    abi: AccountFactoryAbi,
    functionName: 'deployAccount',
    args: [salt, initializerCallData],
    value: initValue,
    paymaster: paymaster,
    paymasterInput: paymasterInput,
  } as WriteContractParameters<typeof AccountFactoryAbi, 'deployAccount', [Hex, Hex], typeof signerClient.chain, typeof signerClient.account>;

  const hash = await signerClient.writeContract(writeContractParams);
  return hash;
}