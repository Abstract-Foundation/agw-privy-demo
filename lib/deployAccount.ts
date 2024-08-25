import { createPublicClient, http, encodeFunctionData, Hex, WalletClient, CustomTransport, Chain, Account, toBytes, keccak256 } from 'viem'
import { abstractTestnet } from 'viem/chains'
import ABI from "../lib/AccountFactory.json";

// Environment variables
const FACTORY_ADDRESS = '0x88219cF9438e6fFF5ffA9812CEf4F433E2f2f4A6'
const EOA_VALIDATOR_ADDRESS = '0xC23a31018bf14bEFC9d7C209d6B4646C3EFC4138'

const publicClient = createPublicClient({
  chain: abstractTestnet,
  transport: http()
})

async function addressHasCode(address: `0x${string}`): Promise<boolean> {
  try {
    const bytecode = await publicClient.getCode({
      address: address
    })
    return bytecode !== null && bytecode !== '0x' && bytecode !== undefined
  } catch (error) {
    console.error('Error checking address:', error)
    return false
  }
}

export async function deployAccount(privyClient:  WalletClient<CustomTransport, Chain, Account>): Promise<`0x${string}`> {
  // Generate salt based off address
  const addressBytes = toBytes(privyClient.account.address);
  const salt = keccak256(addressBytes);

  // Get the deployed account address
  const accountAddress = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: ABI,
    functionName: 'getAddressForSalt',
    args: [salt],
  }) as `0x${string}`;

  // No need to deploy if the account already exists
  const accountExists = await addressHasCode(accountAddress);
  if (accountExists) {
    return accountAddress;
  }

  // Define the call struct
  const call = {
    target: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    allowFailure: false,
    value: 0n,
    callData: '0x' as Hex,
  }

  // Create calldata for initializing the proxy account
  const initializer = encodeFunctionData({
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
      privyClient.account.address,
      EOA_VALIDATOR_ADDRESS,
      [],
      call
    ]
  })

  // Deploy the account
  const hash = await privyClient.writeContract({
    address: FACTORY_ADDRESS,
    abi: ABI,
    functionName: 'deployAccount',
    args: [salt, initializer],
  })

  // Wait for the transaction to be mined
  await publicClient.waitForTransactionReceipt({ hash })
  return accountAddress as `0x${string}`;
}
