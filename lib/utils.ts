import {
  TypedDataDefinition,
  TypedData,
  TypedDataParameter,
} from 'viem';
import { SignTypedDataParams } from '@privy-io/react-auth';

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
