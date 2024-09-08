import {
  TypedDataDefinition,
  TypedData,
  TypedDataParameter,
  Address,
  PublicClient,
  Hex,
  toBytes,
  keccak256,
  Transport
} from 'viem';
import { SignTypedDataParams } from '@privy-io/react-auth';
import ABI from "./AccountFactory.json";
import { SMART_ACCOUNT_FACTORY_ADDRESS } from './constants';
import { ChainEIP712 } from 'viem/zksync';

type MessageTypes = Record<string, { name: string; type: string }[]>

function convertBigIntToString(value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  } else if (Array.isArray(value)) {
    return value.map(convertBigIntToString);
  } else if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, convertBigIntToString(val)])
    );
  }
  return value;
}

type MessageTypeProperty = {
  name: string;
  type: string;
};

export function convertToSignTypedDataParams<
  T extends TypedData | Record<string, unknown>,
  P extends keyof T | 'EIP712Domain'
>(typedDataDef: TypedDataDefinition<T, P>): SignTypedDataParams {
  // Helper function to convert TypedDataParameter to MessageTypeProperty
  function convertToMessageTypeProperty(param: TypedDataParameter): MessageTypeProperty {
    return {
      name: param.name,
      type: param.type,
    };
  }

  // Ensure the types property is correctly formatted
  const types: MessageTypes = {};
  
  // Use type assertion to treat typedDataDef.types as a safe type
  const safeTypes = typedDataDef.types as { [key: string]: readonly TypedDataParameter[] | undefined };

  for (const [key, value] of Object.entries(safeTypes)) {
    if (Array.isArray(value)) {
      types[key] = value.map(convertToMessageTypeProperty);
    } else if (value && typeof value === 'object') {
      types[key] = Object.entries(value).map(([name, type]) => ({
        name,
        type: typeof type === 'string' ? type : type.type,
      }));
    }
  }

  // Construct the result object
  const result: SignTypedDataParams = {
    types,
    primaryType: typedDataDef.primaryType as string,
    domain: convertBigIntToString(typedDataDef.domain) ?? {},
    message: typedDataDef.primaryType === 'EIP712Domain'
      ? {}
      : convertBigIntToString(typedDataDef.message as Record<string, unknown>),
  };

  return result;
}

export async function getSmartAccountAddressFromInitialSigner<
  chain extends ChainEIP712 | undefined = ChainEIP712 | undefined
>(
  initialSigner: Address, publicClient: PublicClient<Transport, chain>
): Promise<Hex> {
  // Generate salt based off address
  const addressBytes = toBytes(initialSigner);
  const salt = keccak256(addressBytes);

  // Get the deployed account address
  const accountAddress = await publicClient.readContract({
    address: SMART_ACCOUNT_FACTORY_ADDRESS,
    abi: ABI,
    functionName: 'getAddressForSalt',
    args: [salt],
  }) as Hex;

  return accountAddress;
}
