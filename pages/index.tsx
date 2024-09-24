import { useConnect } from "wagmi";
import { abstractTestnet } from "viem/chains";

const SamplePage = () => {
  const { connect, connectors } = useConnect();
  return (
    <div className="p-8">
      <button
        className="ring-2 ring-violet-500 hover:ring-violet-700 p-2"
        onClick={() => {
          console.log("Connectors:", connectors);
          connect({ connector: connectors[0], chainId: abstractTestnet.id });
        }}
      >
        Click to Connect!
      </button>
    </div>
  );
};

export default SamplePage;
