import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, CalendarIcon, CheckCircle2, Info } from "lucide-react";
import { ru } from "date-fns/locale";
import { WorkoutLog } from "@shared/schema";
import { formatDateToRu } from "@/lib/utils";
import { 
  format, 
  isToday, 
  addDays, 
  isSameDay, 
  startOfMonth, 
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth
} from "date-fns";

interface WorkoutCalendarProps {
  workoutLogs: WorkoutLog[];
  onDateClick?: (date: Date) => void;
}

const WorkoutCalendar = ({ workoutLogs, onDateClick }: WorkoutCalendarProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  
  // Функция для получения тренировок на выбранную дату
  const getWorkoutsForDate = (date: Date) => {
    return workoutLogs.filter(log => {
      const logDate = new Date(log.date);
      return isSameDay(logDate, date);
    });
  };
  
  // Функция для форматирования статистики за период
  const getStatsForPeriod = (startDate: Date, endDate: Date) => {
    const logsInPeriod = workoutLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate <= endDate;
    });
    
    const completedWorkouts = logsInPeriod.filter(log => log.completed).length;
    const totalWorkouts = logsInPeriod.length;
    const completion = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
    
    return {
      completedWorkouts,
      totalWorkouts,
      completion
    };
  };
  
  // Статистика для текущего месяца
  const monthStartDate = startOfMonth(date);
  const monthEndDate = endOfMonth(date);
  const monthStats = getStatsForPeriod(monthStartDate, monthEndDate);
  
  // Статистика для текущей недели
  const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(date, { weekStartsOn: 1 });
  const weekStats = getStatsForPeriod(weekStartDate, weekEndDate);
  
  // Создаем массив дат с тренировками для использования в календаре
  const workoutDates = workoutLogs.map(log => new Date(log.date));
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Календарь тренировок</span>
          <TabsList>
            <TabsTrigger 
              value="month" 
              onClick={() => setView("month")}
              className={view === "month" ? "bg-primary text-white" : ""}
            >
              Месяц
            </TabsTrigger>
            <TabsTrigger 
              value="week" 
              onClick={() => setView("week")}
              className={view === "week" ? "bg-primary text-white" : ""}
            >
              Неделя
            </TabsTrigger>
          </TabsList>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  setDate(newDate);
                  if (onDateClick) {
                    onDateClick(newDate);
                  }
                }
              }}
              locale={ru}
              modifiers={{
                workout: workoutDates,
                completed: workoutLogs
                  .filter(log => log.completed)
                  .map(log => new Date(log.date))
              }}
              modifiersClassNames={{
                workout: "workout-day",
                completed: "completed-workout"
              }}
              className="border rounded-md"
              components={{
                DayContent: (props) => {
                  const isWorkoutDay = workoutDates.some(wDate => 
                    isSameDay(wDate, props.date)
                  );
                  const isCompletedWorkout = workoutLogs
                    .filter(log => log.completed)
                    .some(log => isSameDay(new Date(log.date), props.date));
                  
                  return (
                    <div className="relative">
                      <time dateTime={format(props.date, 'yyyy-MM-dd')}>
                        {props.date.getDate()}
                      </time>
                      {isWorkoutDay && !isCompletedWorkout && (
                        <div className="absolute top-0 right-0 h-2 w-2 bg-blue-500 rounded-full"></div>
                      )}
                      {isCompletedWorkout && (
                        <div className="absolute top-0 right-0 h-2 w-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  );
                }
              }}
            />
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="space-y-6">
              {/* Статистика */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium">За неделю</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Тренировок</span>
                        <span className="font-medium">{weekStats.totalWorkouts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Выполнено</span>
                        <span className="font-medium">{weekStats.completedWorkouts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Процент</span>
                        <span className="font-medium">{weekStats.completion}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium">За месяц</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Тренировок</span>
                        <span className="font-medium">{monthStats.totalWorkouts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Выполнено</span>
                        <span className="font-medium">{monthStats.completedWorkouts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Процент</span>
                        <span className="font-medium">{monthStats.completion}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Тренировки на выбранную дату */}
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isToday(date) ? 'Сегодня' : formatDateToRu(date)}
                </h3>
                
                {getWorkoutsForDate(date).length > 0 ? (
                  <div className="space-y-2">
                    {getWorkoutsForDate(date).map((workout) => (
                      <Card key={workout.id} className="overflow-hidden">
                        <div className={`flex items-center p-3 ${workout.completed ? 'bg-green-50' : 'bg-blue-50'}`}>
                          <div className="flex-1">
                            <div className="font-medium">{workout.name || "Тренировка"}</div>
                            <div className="text-sm text-muted-foreground">
                              {workout.completed ? 
                                <span className="flex items-center text-green-600">
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Выполнена
                                </span> : 
                                <span className="flex items-center text-blue-600">
                                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                                  Запланирована
                                </span>
                              }
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/30 rounded-lg">
                    <Info className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">Нет тренировок</h3>
                    <p className="text-sm text-muted-foreground">
                      На выбранную дату не запланировано тренировок
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutCalendar;