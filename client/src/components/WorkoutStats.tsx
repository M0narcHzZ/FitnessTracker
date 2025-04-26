import { useState, useMemo } from "react";
import { WorkoutLog } from "@shared/schema";
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth, parseISO, differenceInDays, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WorkoutStatsProps {
  workoutLogs: WorkoutLog[];
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

const WorkoutStats = ({ workoutLogs }: WorkoutStatsProps) => {
  const [timeRange, setTimeRange] = useState<"1m" | "3m" | "6m" | "all">("3m");
  
  // Фильтрация тренировок в зависимости от выбранного временного интервала
  const filteredWorkoutLogs = useMemo(() => {
    const currentDate = new Date();
    
    let startDate: Date;
    switch (timeRange) {
      case "1m":
        startDate = subMonths(currentDate, 1);
        break;
      case "3m":
        startDate = subMonths(currentDate, 3);
        break;
      case "6m":
        startDate = subMonths(currentDate, 6);
        break;
      case "all":
      default:
        return workoutLogs;
    }
    
    return workoutLogs.filter(log => {
      const logDate = new Date(log.date);
      return isWithinInterval(logDate, {
        start: startDate,
        end: currentDate
      });
    });
  }, [workoutLogs, timeRange]);
  
  // Статистика типов тренировок (программы)
  const workoutTypeStats = useMemo(() => {
    const stats: Record<number, { name: string; count: number; color: string }> = {};
    const colors = ["#4CAF50", "#2196F3", "#FFC107", "#9C27B0", "#FF5722", "#00BCD4"];
    
    filteredWorkoutLogs.forEach(log => {
      const programId = log.workoutProgramId;
      if (!stats[programId]) {
        stats[programId] = {
          name: log.name || `Программа ${programId}`,
          count: 0,
          color: colors[Object.keys(stats).length % colors.length]
        };
      }
      stats[programId].count++;
    });
    
    return Object.values(stats);
  }, [filteredWorkoutLogs]);

  // Данные для пирога типов тренировок
  const pieChartData = useMemo(() => {
    return workoutTypeStats.map(item => ({
      name: item.name,
      value: item.count,
      color: item.color
    }));
  }, [workoutTypeStats]);
  
  // Статистика по статусу тренировок (завершенные/незавершенные)
  const completionStats = useMemo(() => {
    const completed = filteredWorkoutLogs.filter(log => log.completed).length;
    const incomplete = filteredWorkoutLogs.length - completed;
    
    return [
      { name: 'Завершено', value: completed, color: '#4CAF50' },
      { name: 'Не завершено', value: incomplete, color: '#F44336' }
    ];
  }, [filteredWorkoutLogs]);

  // Статистика тренировок по месяцам
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { month: string, count: number }> = {};
    const currentDate = new Date();
    
    // Создаем записи для последних 6 месяцев
    for (let i = 0; i < 6; i++) {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'LLL', { locale: ru });
      
      stats[monthKey] = {
        month: monthName,
        count: 0
      };
    }
    
    // Заполняем статистику
    filteredWorkoutLogs.forEach(log => {
      const logDate = new Date(log.date);
      if (differenceInDays(currentDate, logDate) <= 180) { // последние 6 месяцев
        const monthKey = format(logDate, 'yyyy-MM');
        if (stats[monthKey]) {
          stats[monthKey].count++;
        }
      }
    });
    
    // Преобразуем объект в массив и сортируем по дате
    return Object.values(stats).reverse();
  }, [filteredWorkoutLogs]);

  // Расчет процента завершенных тренировок
  const completionPercentage = useMemo(() => {
    if (filteredWorkoutLogs.length === 0) return 0;
    return Math.round((filteredWorkoutLogs.filter(log => log.completed).length / filteredWorkoutLogs.length) * 100);
  }, [filteredWorkoutLogs]);

  // Общее количество тренировок
  const totalWorkouts = filteredWorkoutLogs.length;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Статистика тренировок</h2>
        <Tabs 
          defaultValue="3m" 
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as "1m" | "3m" | "6m" | "all")} 
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="1m">1 мес</TabsTrigger>
            <TabsTrigger value="3m">3 мес</TabsTrigger>
            <TabsTrigger value="6m">6 мес</TabsTrigger>
            <TabsTrigger value="all">Все</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {totalWorkouts === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-6">
            <p className="text-muted-foreground text-center">
              Нет данных о тренировках за выбранный период
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Карточка с общей статистикой */}
          <Card className="col-span-full md:col-span-1">
            <CardHeader>
              <CardTitle>Общая статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Всего тренировок</p>
                <p className="text-3xl font-bold">{totalWorkouts}</p>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-medium">Процент завершения</p>
                  <p className="text-sm font-medium">{completionPercentage}%</p>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* График типов тренировок */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Типы тренировок</CardTitle>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} тренировок`, 'Количество']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-[200px]">
                  <p className="text-muted-foreground">Нет данных</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* График завершенных/незавершенных тренировок */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Завершение тренировок</CardTitle>
            </CardHeader>
            <CardContent>
              {completionStats.some(stat => stat.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={completionStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {completionStats.map((entry, index) => (
                        <Cell key={`completion-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} тренировок`, 'Количество']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-[200px]">
                  <p className="text-muted-foreground">Нет данных</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* График тренировок по месяцам */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Тренировки по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyStats.some(month => month.count > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} тренировок`, 'Количество']} />
                    <Legend />
                    <Bar 
                      name="Количество тренировок"
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-[300px]">
                  <p className="text-muted-foreground">Нет данных за последние месяцы</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkoutStats;