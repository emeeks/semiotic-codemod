import { RealtimeSankey } from "semiotic"
import { useRef } from "react"

export function MySankey() {
  const ref = useRef(null)
  return <RealtimeSankey ref={ref} size={[800, 400]} showParticles />
}

export function AlreadySpecified() {
  // chartType is already set; transform should leave it intact.
  return <RealtimeSankey chartType="sankey" size={[400, 200]} />
}
