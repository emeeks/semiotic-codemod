import { StreamNetworkFrame } from "semiotic"
import { useRef } from "react"

export function MySankey() {
  const ref = useRef(null)
  return <StreamNetworkFrame chartType="sankey" ref={ref} size={[800, 400]} showParticles />;
}

export function AlreadySpecified() {
  // chartType is already set; transform should leave it intact.
  return <StreamNetworkFrame chartType="sankey" size={[400, 200]} />;
}
