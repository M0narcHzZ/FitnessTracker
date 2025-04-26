import { useState } from "react";
import { DayPicker, Row, RowProps } from "react-day-picker";
import { ru } from "date-fns/locale";
import { 
  format, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  isWithinInterval,
  getWeek 
} from "date-fns";
import { WorkoutLog } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  CheckCircle2, 
  CalendarDays, 
  CheckCircle, 
  CircleDashed, 
  Dumbbell, 
  CalendarX,
  Clock,
  Repeat,
  Weight,
  Timer,
  ClipboardList,
  Plus
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface WorkoutCalendarProps {
  workoutLogs: WorkoutLog[];
}

const WorkoutDetails = ({ workoutLogId }: { workoutLogId: number }) => {
  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/workout-logs/${workoutLogId}`],
  });

  const { data: exerciseLogs = [], isLoading: isExerciseLogsLoading } = useQuery<any[]>({
    queryKey: [`/api/workout-logs/${workoutLogId}/exercise-logs`],
  });

  if (isLoading || isExerciseLogsLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div>Ошибка загрузки данных</div>;
  }

  if (!data) {
    return <div>Информация о тренировке не найдена</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          {data.name || "Тренировка"}
        </h3>
        <Badge variant={data.completed ? "success" : "outline"} className="px-3 py-1 text-sm">
          {data.completed ? "Завершена" : "В процессе"}
        </Badge>
      </div>
      
      <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
        <Clock className="h-4 w-4 mr-2 text-primary" />
        {format(new Date(data.date), "dd MMMM yyyy, HH:mm", { locale: ru })}
      </div>
      
      {exerciseLogs.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-md font-medium flex items-center">
            <Dumbbell className="h-4 w-4 mr-2 text-primary" />
            Упражнения:
          </h4>
          <div className="space-y-3">
            {exerciseLogs.map((log: any) => (
              <div 
                key={log.id} 
                className={`flex justify-between items-center p-3 rounded-lg border
                  ${log.completed 
                    ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/30' 
                    : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800'}
                `}
              >
                <div>
                  <div className="font-medium">{log.exercise.name}</div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-2 mt-1">
                    {log.reps && (
                      <span className="inline-flex items-center bg-background rounded-full px-2 py-0.5 text-xs border">
                        <Repeat className="h-3 w-3 mr-1" /> {log.reps} повт.
                      </span>
                    )}
                    {log.weight && (
                      <span className="inline-flex items-center bg-background rounded-full px-2 py-0.5 text-xs border">
                        <Weight className="h-3 w-3 mr-1" /> {log.weight} кг
                      </span>
                    )}
                    {log.duration && (
                      <span className="inline-flex items-center bg-background rounded-full px-2 py-0.5 text-xs border">
                        <Timer className="h-3 w-3 mr-1" /> {log.duration}
                      </span>
                    )}
                  </div>
                </div>
                {log.completed && (
                  <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full px-2 py-1">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Выполнено
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-muted">
          <ClipboardList className="h-12 w-12 mb-2 text-muted-foreground/50" />
          <p className="text-center">Нет данных об упражнениях</p>
          <Button variant="link" size="sm" className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Добавить упражнения
          </Button>
        </div>
      )}
    </div>
  );
};

// Компонент для отображения только одной недели
const SingleWeekRow = (props: RowProps) => {
  const { displayMonth } = props;
  if (!displayMonth) return null;
  
  // Просто передаем все пропы оригинальному компоненту Row без добавления className
  return <Row {...props} />;
};

const WorkoutCalendar = ({ workoutLogs }: WorkoutCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  
  // Получаем даты тренировок
  const workoutDays = workoutLogs.map(log => new Date(log.date));
  
  // Расчет дней текущей недели
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Неделя начинается с понедельника
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Модификатор для стилизации дней с тренировками
  const isWorkoutDay = (date: Date) => {
    return workoutDays.some(workoutDate => isSameDay(date, workoutDate));
  };
  
  // Модификатор для стилизации дней с завершенными тренировками
  const isCompletedWorkoutDay = (date: Date) => {
    return workoutLogs.some(log => 
      log.completed && isSameDay(new Date(log.date), date)
    );
  };
  
  // Функция перехода к предыдущей неделе
  const goToPreviousWeek = () => {
    setCurrentWeek(prevWeek => subWeeks(prevWeek, 1));
  };
  
  // Функция перехода к следующей неделе
  const goToNextWeek = () => {
    setCurrentWeek(prevWeek => addWeeks(prevWeek, 1));
  };

  // Получение тренировок для выбранного дня
  const getWorkoutsForDay = (date: Date) => {
    return workoutLogs.filter(log => isSameDay(new Date(log.date), date));
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    
    // Если на выбранный день есть тренировки, показываем первую
    const dayWorkouts = getWorkoutsForDay(day);
    if (dayWorkouts.length > 0) {
      setSelectedWorkoutId(dayWorkouts[0].id);
    } else {
      setSelectedWorkoutId(null);
    }
  };
  
  // Функция для форматирования заголовка календаря
  const formatCaption = (_: Date, options: { locale?: any }) => {
    const weekNumber = getWeek(currentWeek);
    return (
      <div className="flex justify-between items-center px-1 pt-1 pb-3">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousWeek}
          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary border-0 shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[200px]">
          <div className="font-semibold text-base">
            {format(weekStart, "d MMM", { locale: options.locale })} - {format(weekEnd, "d MMM yyyy", { locale: options.locale })}
          </div>
          <div className="text-xs text-muted-foreground mt-1 bg-primary/5 rounded-full px-2 py-0.5 inline-block">
            Неделя {weekNumber}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextWeek}
          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary border-0 shadow-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Календарь тренировок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={(day) => day && handleDayClick(day)}
            month={weekStart}
            locale={ru}
            weekStartsOn={1}
            formatters={{ formatCaption }}
            modifiers={{
              workout: (date) => isWorkoutDay(date),
              completed: (date) => isCompletedWorkoutDay(date),
            }}
            modifiersClassNames={{
              workout: "workout-day",
              completed: "completed-workout",
            }}
            components={{
              Row: SingleWeekRow
            }}
            // Показываем только дни текущей недели
            hidden={(date) => !isWithinInterval(date, { start: weekStart, end: weekEnd })}
            footer={
              <div className="mt-4 text-center">
                {(() => {
                  const workoutsThisWeek = workoutDays.filter(date => 
                    isWithinInterval(date, { start: weekStart, end: weekEnd })
                  ).length;
                  
                  const completedWorkoutsThisWeek = workoutLogs.filter(log => 
                    log.completed && isWithinInterval(new Date(log.date), { start: weekStart, end: weekEnd })
                  ).length;
                  
                  return workoutsThisWeek > 0 ? (
                    <div className="flex flex-col gap-2 items-center">
                      <div className="flex gap-1.5 items-center">
                        <div className="bg-primary/10 dark:bg-primary/20 rounded-full px-2.5 py-1.5 text-sm font-medium text-primary">
                          {workoutsThisWeek}
                        </div>
                        <span className="text-sm text-muted-foreground">тренировок на этой неделе</span>
                      </div>
                      {completedWorkoutsThisWeek > 0 && (
                        <div className="text-xs text-success flex items-center">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          <span>{completedWorkoutsThisWeek} из {workoutsThisWeek} тренировок выполнено</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 items-center">
                      <div className="text-sm text-muted-foreground">Нет тренировок на этой неделе</div>
                      <Button variant="link" size="sm" className="h-7 text-xs text-primary flex items-center gap-1 px-2 py-0">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Добавить тренировку</span>
                      </Button>
                    </div>
                  );
                })()}
              </div>
            }
          />
        </CardContent>
      </Card>
      
      {selectedDay && (
        <Card className="overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" />
              Тренировки на {format(selectedDay, "d MMMM", { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getWorkoutsForDay(selectedDay).length > 0 ? (
              <div className="space-y-3">
                {getWorkoutsForDay(selectedDay).map((workout) => (
                  <Dialog key={workout.id}>
                    <DialogTrigger asChild>
                      <div
                        className={`
                          flex justify-between items-center p-4 rounded-lg cursor-pointer border 
                          shadow-sm transition-all duration-200 hover:shadow-md
                          ${workout.completed 
                            ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20' 
                            : 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20'}
                        `}
                        onClick={() => setSelectedWorkoutId(workout.id)}
                      >
                        <div className="flex items-center">
                          {workout.completed ? (
                            <CheckCircle className="h-10 w-10 mr-3 text-green-500" />
                          ) : (
                            <CircleDashed className="h-10 w-10 mr-3 text-blue-500" />
                          )}
                          <div>
                            <div className="font-medium text-base">{workout.name || "Тренировка"}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(workout.date), "HH:mm", { locale: ru })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge 
                            variant={workout.completed ? "success" : "secondary"}
                            className="px-3 py-1"
                          >
                            {workout.completed ? "Завершена" : "В процессе"}
                          </Badge>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center text-xl">
                          <Dumbbell className="mr-2 h-5 w-5 text-primary" />
                          Детали тренировки
                        </DialogTitle>
                      </DialogHeader>
                      <WorkoutDetails workoutLogId={workout.id} />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-muted">
                <div className="bg-muted/50 rounded-full p-4 mb-4">
                  <CalendarX className="h-10 w-10 text-muted-foreground/70" />
                </div>
                <p className="text-center font-medium mb-1">На выбранный день нет тренировок</p>
                <p className="text-center text-sm text-muted-foreground/80 max-w-[250px] mb-4">
                  Вы можете запланировать новую тренировку на {format(selectedDay, "d MMMM", { locale: ru })}
                </p>
                <Button size="sm" className="gap-1 shadow-sm">
                  <Calendar className="h-4 w-4" />
                  Добавить тренировку
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkoutCalendar;