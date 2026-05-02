import { StreamNetworkFrame } from "semiotic"
import { OtherFrame } from "semiotic/network"

export function MyChart() {
  return <StreamNetworkFrame nodes={[]} edges={[]} />;
}

const Cmp = StreamNetworkFrame
export { Cmp }
