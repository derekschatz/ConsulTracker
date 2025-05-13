import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatHours } from '@/lib/format-utils';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface MonthlyRevenueData {
  month: number;
  revenue: number;
  billableHours: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueData[];
  loading?: boolean;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthlyRevenueChart = ({ data, loading = false }: MonthlyRevenueChartProps) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  // Format data for the chart
  const chartData = data.map(item => ({
    name: monthNames[item.month],
    Invoiced: item.revenue,
    Hours: item.billableHours,
  }));

  if (loading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          vertical={false} 
          stroke={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} 
        />
        <XAxis 
          dataKey="name" 
          stroke={isDarkMode ? 'hsl(var(--muted-foreground))' : undefined}
        />
        <YAxis 
          yAxisId="left" 
          orientation="left" 
          tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })}
          stroke={isDarkMode ? 'hsl(var(--muted-foreground))' : undefined}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          tickFormatter={(value) => `${formatHours(value)}h`}
          stroke={isDarkMode ? 'hsl(var(--muted-foreground))' : undefined}
        />
        <Tooltip 
          formatter={(value, name) => {
            if (name === 'Invoiced') return formatCurrency(value as number);
            if (name === 'Hours') return `${formatHours(value as number)} hours`;
            return value;
          }}
          contentStyle={{
            backgroundColor: isDarkMode ? 'hsl(var(--card))' : 'white',
            borderColor: isDarkMode ? 'hsl(var(--border))' : '#cccccc',
            color: isDarkMode ? 'hsl(var(--card-foreground))' : undefined,
          }}
          itemStyle={{
            color: isDarkMode ? 'hsl(var(--foreground))' : undefined,
          }}
        />
        <Legend 
          wrapperStyle={{
            color: isDarkMode ? 'hsl(var(--foreground))' : undefined,
          }}
        />
        <Bar yAxisId="left" dataKey="Invoiced" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="Hours" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyRevenueChart;
