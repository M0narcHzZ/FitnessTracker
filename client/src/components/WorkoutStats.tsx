import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Legend 
} from "recharts";
import { WorkoutLog } from "@shared/schema";
import { 
  subDays, 
  subWeeks, 
  subMonths, 
  startOfDay, 
  startOfWeek, 
  format, 
  isWithinInterval 
} from "date-fns";
import { ru } from "date-fns/locale";

interface WorkoutStatsProps {
  workoutLogs: WorkoutLog[];
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

const WorkoutStats = ({ workoutLogs }: WorkoutStatsProps) => {
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  
  // Подготовка данных для статистики
  const prepareStatsData = () => {
    const today = new Date();
    let startDate: Date;
    
    // Определение начальной даты в зависимости от выбранного периода
    switch (period) {
      case "week":
        startDate = subDays(today, 7);
        break;
      case "month":
        startDate = subMonths(today, 1);
        break;
      case "year":
        startDate = subMonths(today, 12);
        break;
    }
    
    // Фильтруем логи за выбранный период
    const filteredLogs = workoutLogs.filter(log => {
      const logDate = new Date(log.date);
      return isWithinInterval(logDate, { start: startDate, end: today });
    });
    
    const totalWorkouts = filteredLogs.length;
    const completedWorkouts = filteredLogs.filter(log => log.completed).length;
    
    // Создаем данные для диаграммы
    const completionRate = totalWorkouts > 0 
      ? Math.round((completedWorkouts / totalWorkouts) * 100) 
      : 0;
    
    return {
      totalWorkouts,
      completedWorkouts,
      completionRate
    };
  };
  
  // Создание данных для еженедельной статистики
  const createWeeklyData = (): ChartData[] => {
    const today = new Date();
    const startDate = subDays(today, 6);
    const data: ChartData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, 6 - i);
      const dayName = format(date, 'EEEEEE', { locale: ru });
      
      const workouts = workoutLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getDate() === date.getDate() && 
               logDate.getMonth() === date.getMonth() && 
               logDate.getFullYear() === date.getFullYear();
      });
      
      data.push({
        name: dayName,
        value: workouts.length,
        color: '#4f46e5'
      });
    }
    
    return data;
  };
  
  // Создание данных для ежемесячной статистики
  const createMonthlyData = (): ChartData[] => {
    const today = new Date();
    const startDate = subWeeks(today, 4);
    const data: ChartData[] = [];
    
    for (let i = 0; i < 4; i++) {
      const weekStart = subWeeks(today, 3 - i);
      const weekEnd = subDays(subWeeks(today, 2 - i), 1);
      const weekName = `Неделя ${i + 1}`;
      
      const workouts = workoutLogs.filter(log => {
        const logDate = new Date(log.date);
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
      });
      
      data.push({
        name: weekName,
        value: workouts.length,
        color: '#4f46e5'
      });
    }
    
    return data;
  };
  
  // Создание данных для годовой статистики
  const createYearlyData = (): ChartData[] => {
    const today = new Date();
    const startDate = subMonths(today, 11);
    const data: ChartData[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(today, 11 - i);
      const monthName = format(monthDate, 'LLL', { locale: ru });
      
      const workouts = workoutLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getMonth() === monthDate.getMonth() && 
               logDate.getFullYear() === monthDate.getFullYear();
      });
      
      data.push({
        name: monthName,
        value: workouts.length,
        color: '#4f46e5'
      });
    }
    
    return data;
  };
  
  // Создание данных для диаграммы по статусу выполнения
  const createStatusData = (): ChartData[] => {
    const { totalWorkouts, completedWorkouts } = prepareStatsData();
    const uncompletedWorkouts = totalWorkouts - completedWorkouts;
    
    return [
      { name: "Выполнено", value: completedWorkouts, color: "#22c55e" },
      { name: "Не выполнено", value: uncompletedWorkouts, color: "#ef4444" }
    ];
  };
  
  const stats = prepareStatsData();
  const weeklyData = createWeeklyData();
  const monthlyData = createMonthlyData();
  const yearlyData = createYearlyData();
  const statusData = createStatusData();
  
  // Определение данных для отображения на основе выбранного периода
  const getChartData = () => {
    switch (period) {
      case "week":
        return weeklyData;
      case "month":
        return monthlyData;
      case "year":
        return yearlyData;
    }
  };
  
  const chartData = getChartData();
  
  // Настройка подписей для оси X на основе выбранного периода
  const getXAxisLabel = () => {
    switch (period) {
      case "week":
        return "День недели";
      case "month":
        return "Неделя";
      case "year":
        return "Месяц";
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Статистика тренировок</CardTitle>
          <CardDescription>
            Обзор ваших тренировок и прогресса
          </CardDescription>
          <Tabs
            defaultValue="week"
            value={period}
            onValueChange={(value) => setPeriod(value as "week" | "month" | "year")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="week">Неделя</TabsTrigger>
              <TabsTrigger value="month">Месяц</TabsTrigger>
              <TabsTrigger value="year">Год</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Карточки со статистикой */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-xl">
                    {stats.totalWorkouts}
                  </CardTitle>
                  <CardDescription>
                    Всего тренировок
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-xl">
                    {stats.completedWorkouts}
                  </CardTitle>
                  <CardDescription>
                    Выполнено
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="col-span-2">
                <CardHeader className="p-4">
                  <CardTitle className="text-xl">
                    {stats.completionRate}%
                  </CardTitle>
                  <CardDescription>
                    Доля выполненных тренировок
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Progress 
                    value={stats.completionRate} 
                    className="h-2 bg-neutral-200"
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Круговая диаграмма по статусу */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* График частоты тренировок */}
          <div className="mt-6 h-72">
            <h3 className="text-lg font-medium mb-4">Частота тренировок</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  label={{ 
                    value: getXAxisLabel(), 
                    position: 'insideBottom', 
                    offset: -15 
                  }}
                />
                <YAxis 
                  label={{ 
                    value: 'Количество тренировок', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <RechartsTooltip />
                <Bar dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutStats;