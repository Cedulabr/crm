import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number | string;
  change: number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
}

export default function StatsCard({
  title,
  value,
  change,
  icon,
  iconBgColor,
  iconColor
}: StatsCardProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-success-dark' : 'text-error-dark';
  const changeIcon = isPositive ? 'arrow_upward' : 'arrow_downward';

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-400">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            <div className={`flex items-center mt-2 ${changeColor} text-sm`}>
              <span className="material-icons text-sm mr-1">{changeIcon}</span>
              <span>{Math.abs(change)}% esse mês</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-lg ${iconBgColor} bg-opacity-10 flex items-center justify-center`}>
            <span className={`material-icons ${iconColor}`}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
