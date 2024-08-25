import { createPublicClient, http, encodeFunctionData, Hex, WalletClient, CustomTransport, Chain, Account } from 'viem'
import { abstractTestnet } from 'viem/chains'

import { ConnectedWallet } from "@privy-io/react-auth";
import ABI from "../lib/AccountFactory.json";

// Environment variables
const FACTORY_ADDRESS = '0x88219cF9438e6fFF5ffA9812CEf4F433E2f2f4A6'
const EOA_VALIDATOR_ADDRESS = '0xC23a31018bf14bEFC9d7C209d6B4646C3EFC4138'

export async function deployAccount(privyClient:  WalletClient<CustomTransport, Chain, Account>): Promise<`0x${string}`> {
  // Create clients
  const publicClient = createPublicClient({
    chain: abstractTestnet,
    transport: http()
  })

  // Generate random salt
  const salt = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}` as `0x${string}`

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
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Get the deployed account address
  const accountAddress = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: ABI,
    functionName: 'getAddressForSalt',
    args: [salt],
  })

  console.log('Deployed account address:', accountAddress)
  return accountAddress as `0x${string}`;
}
