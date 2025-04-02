import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Sales by Product Chart
export function SalesByProductChart() {
  // Sample data for the chart
  const data = useMemo(() => [
    { name: 'Segunda', 'Empréstimo Consignado': 65, 'Crédito Imobiliário': 28, 'Financiamento': 35 },
    { name: 'Terça', 'Empréstimo Consignado': 59, 'Crédito Imobiliário': 48, 'Financiamento': 25 },
    { name: 'Quarta', 'Empréstimo Consignado': 80, 'Crédito Imobiliário': 40, 'Financiamento': 55 },
    { name: 'Quinta', 'Empréstimo Consignado': 81, 'Crédito Imobiliário': 19, 'Financiamento': 45 },
    { name: 'Sexta', 'Empréstimo Consignado': 56, 'Crédito Imobiliário': 86, 'Financiamento': 66 },
    { name: 'Sábado', 'Empréstimo Consignado': 55, 'Crédito Imobiliário': 27, 'Financiamento': 42 },
    { name: 'Domingo', 'Empréstimo Consignado': 40, 'Crédito Imobiliário': 90, 'Financiamento': 60 }
  ], []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.05)" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="Empréstimo Consignado"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          fill="rgba(63, 81, 181, 0.1)"
        />
        <Line
          type="monotone"
          dataKey="Crédito Imobiliário"
          stroke="hsl(var(--secondary))"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          fill="rgba(255, 64, 129, 0.1)"
        />
        <Line
          type="monotone"
          dataKey="Financiamento"
          stroke="hsl(var(--success))"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          fill="rgba(76, 175, 80, 0.1)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Proposals by Status Chart
export function ProposalsByStatusChart({ data }: any) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return [
      { name: 'Em Negociação', value: data.emNegociacao || 0 },
      { name: 'Aceitas', value: data.aceitas || 0 },
      { name: 'Em Análise', value: data.emAnalise || 0 },
      { name: 'Recusadas', value: data.recusadas || 0 }
    ];
  }, [data]);

  const COLORS = ['#7986cb', '#81c784', '#ff80ab', '#e57373'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="90%"
          fill="#8884d8"
          paddingAngle={2}
          dataKey="value"
          label={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value}`, 'Quantidade']} />
      </PieChart>
    </ResponsiveContainer>
  );
}
