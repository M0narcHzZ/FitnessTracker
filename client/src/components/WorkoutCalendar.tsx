import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import { format, isSameDay, isAfter, isBefore, addMonths } from "date-fns";
import { WorkoutLog } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{data.name || "Тренировка"}</h3>
        <Badge variant={data.completed ? "success" : "outline"}>
          {data.completed ? "Завершена" : "В процессе"}
        </Badge>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {format(new Date(data.date), "dd MMMM yyyy, HH:mm", { locale: ru })}
      </div>
      
      {exerciseLogs.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-md font-medium">Упражнения:</h4>
          <div className="space-y-2">
            {exerciseLogs.map((log: any) => (
              <div key={log.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                <div>
                  <span className="font-medium">{log.exercise.name}</span>
                  <div className="text-sm text-muted-foreground">
                    {log.reps && `${log.reps} повт.`}
                    {log.weight && ` | ${log.weight} кг`}
                    {log.duration && ` | ${log.duration}`}
                  </div>
                </div>
                {log.completed && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">
          Нет данных об упражнениях
        </div>
      )}
    </div>
  );
};

const WorkoutCalendar = ({ workoutLogs }: WorkoutCalendarProps) => {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  
  // Получаем даты тренировок
  const workoutDays = workoutLogs.map(log => new Date(log.date));
  
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
  
  // Функция перехода к предыдущему месяцу
  const goToPreviousMonth = () => {
    setMonth(prev => addMonths(prev, -1));
  };
  
  // Функция перехода к следующему месяцу
  const goToNextMonth = () => {
    setMonth(prev => addMonths(prev, 1));
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
  const formatCaption = (month: Date, options: { locale?: Locale }) => {
    return (
      <div className="flex justify-between items-center px-1">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium">
          {format(month, "LLLL yyyy", { locale: options.locale })}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextMonth}
          className="h-7 w-7"
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
            month={month}
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
          />
        </CardContent>
      </Card>
      
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle>
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
                          flex justify-between items-center p-3 rounded-md cursor-pointer border
                          ${workout.completed 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                            : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'}
                        `}
                        onClick={() => setSelectedWorkoutId(workout.id)}
                      >
                        <div>
                          <div className="font-medium">{workout.name || "Тренировка"}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(workout.date), "HH:mm", { locale: ru })}
                          </div>
                        </div>
                        <Badge variant={workout.completed ? "success" : "secondary"}>
                          {workout.completed ? "Завершена" : "В процессе"}
                        </Badge>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Детали тренировки</DialogTitle>
                      </DialogHeader>
                      <WorkoutDetails workoutLogId={workout.id} />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                На выбранный день нет тренировок
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkoutCalendar;