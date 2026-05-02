import { LineChart, BarChart, ForceDirectedGraph, ThemeProvider, RealtimeLineChart } from "semiotic"
import type { LineChartProps, BarChartProps } from "semiotic"
import { LinkedCharts } from "semiotic"

export function Dashboard() {
  return (
    <ThemeProvider>
      <LinkedCharts>
        <LineChart data={[]} xAccessor="x" yAccessor="y" />
        <BarChart data={[]} categoryAccessor="c" valueAccessor="v" />
        <ForceDirectedGraph nodes={[]} edges={[]} />
        <RealtimeLineChart />
      </LinkedCharts>
    </ThemeProvider>
  )
}
