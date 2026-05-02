import { ForceDirectedGraph } from "semiotic/network";
import { BarChart } from "semiotic/ordinal";
import { RealtimeLineChart } from "semiotic/realtime";
import { ThemeProvider } from "semiotic/themes";
import { LineChart } from "semiotic/xy";
import type { BarChartProps } from "semiotic/ordinal";
import type { LineChartProps } from "semiotic/xy";
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
