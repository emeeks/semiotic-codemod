import { RealtimeNetworkFrame } from "semiotic"
import { OtherFrame } from "semiotic/network"

export function MyChart() {
  return <RealtimeNetworkFrame nodes={[]} edges={[]} />
}

const Cmp = RealtimeNetworkFrame
export { Cmp }
