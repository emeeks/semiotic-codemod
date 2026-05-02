import { LineChart, BarChart, RealtimeSankey, RealtimeNetworkFrame, ThemeProvider } from "semiotic"

export function Demo() {
  return (
    <ThemeProvider>
      <LineChart data={[]} xAccessor="x" yAccessor="y" />
      <BarChart data={[]} categoryAccessor="c" valueAccessor="v" />
      <RealtimeSankey size={[800, 400]} showParticles />
      <RealtimeNetworkFrame nodes={[]} edges={[]} />
    </ThemeProvider>
  )
}
