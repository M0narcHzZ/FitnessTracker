interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

const StatCard = ({ title, value, change, isPositive = true }: StatCardProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-sm text-neutral-medium font-medium">{title}</h3>
      <div className="flex items-baseline mt-1">
        <span className="text-xl font-bold">{value}</span>
        {change && (
          <span className={`text-xs ml-2 ${isPositive ? "text-success" : "text-destructive"}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
