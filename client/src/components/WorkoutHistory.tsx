import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow, isToday, format } from "date-fns";
import { ru } from "date-fns/locale";
import { WorkoutLog } from "@shared/schema";
import { 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Check, 
  CheckCircle, 
  Clock4, 
  Dumbbell, 
  ListFilter
} from "lucide-react";
import { formatDateToRu, getColorClass, getLightBgClass } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface WorkoutHistoryProps {
  workoutLogs: WorkoutLog[];
}

interface WorkoutDetailsProps {
  workoutLogId: number;
  onClose: () => void;
}

// Компонент детального просмотра тренировки
const WorkoutDetails = ({ workoutLogId, onClose }: WorkoutDetailsProps) => {
  // Получаем логи упражнений
  const { 
    data: exerciseLogs, 
    isLoading 
  } = useQuery({ 
    queryKey: ['/api/workout-logs', workoutLogId, 'exercise-logs'], 
    queryFn: () => 
      fetch(`/api/workout-logs/${workoutLogId}/exercise-logs`).then(res => res.json()) 
  });

  // Получаем детали тренировки
  const { 
    data: workoutLog 
  } = useQuery({ 
    queryKey: ['/api/workout-logs', workoutLogId], 
    queryFn: () => 
      fetch(`/api/workout-logs/${workoutLogId}`).then(res => res.json()),
    enabled: !!workoutLogId 
  });

  if (isLoading || !exerciseLogs || !workoutLog) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Загрузка...</DialogTitle>
        </DialogHeader>
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {workoutLog.name || "Тренировка"}
        </DialogTitle>
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarIcon className="mr-1 h-4 w-4" />
          {formatDateToRu(workoutLog.date)}
          {workoutLog.completed && (
            <Badge variant="success" className="ml-2">
              <Check className="mr-1 h-3 w-3" />
              Выполнена
            </Badge>
          )}
        </div>
      </DialogHeader>
      
      <div className="space-y-4 my-2">
        {exerciseLogs.length > 0 ? (
          exerciseLogs.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <div className="flex p-3 bg-muted/20">
                <div className="mr-4">
                  <div className="bg-primary-light p-2 rounded-full">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{log.exercise.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {log.reps && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {log.reps} повт.
                      </span>
                    )}
                    {log.sets && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {log.sets} подх.
                      </span>
                    )}
                    {log.weight && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {log.weight} кг
                      </span>
                    )}
                    {log.duration && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {log.duration}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {log.completed ? 'Выполнено' : 'Не выполнено'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-6 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">Нет данных об упражнениях</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </DialogContent>
  );
};

const WorkoutHistory = ({ workoutLogs }: WorkoutHistoryProps) => {
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  
  // Фильтрация логов
  const filteredLogs = workoutLogs.filter(log => {
    if (filter === "all") return true;
    if (filter === "completed") return log.completed;
    if (filter === "pending") return !log.completed;
    return true;
  });
  
  // Сортировка логов по дате (от новых к старым)
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>История тренировок</CardTitle>
              <CardDescription>
                Ваши недавние тренировки и их статус
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Все
              </Button>
              <Button
                variant={filter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("completed")}
              >
                Выполненные
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("pending")}
              >
                Ожидающие
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedLogs.length > 0 ? (
            <div className="space-y-3">
              {sortedLogs.map(log => {
                const logDate = new Date(log.date);
                const dateLabel = isToday(logDate) 
                  ? 'Сегодня' 
                  : formatDistanceToNow(logDate, { addSuffix: true, locale: ru });
                
                return (
                  <Card
                    key={log.id}
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedWorkoutId(log.id)}
                  >
                    <div className={`p-4 flex items-center justify-between border-l-4 ${
                      log.completed ? 'border-green-500' : 'border-blue-500'
                    }`}>
                      <div className="flex items-center">
                        <div className={`rounded-full p-2 mr-4 ${
                          log.completed ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {log.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock4 className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {log.name || "Тренировка"}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {dateLabel}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <ListFilter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Нет тренировок</h3>
              <p className="text-muted-foreground mt-1">
                {filter === "all" 
                  ? "У вас еще нет записей о тренировках" 
                  : filter === "completed" 
                    ? "У вас нет выполненных тренировок" 
                    : "У вас нет запланированных тренировок"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedWorkoutId && (
        <Dialog open={!!selectedWorkoutId} onOpenChange={(open) => !open && setSelectedWorkoutId(null)}>
          <WorkoutDetails 
            workoutLogId={selectedWorkoutId} 
            onClose={() => setSelectedWorkoutId(null)} 
          />
        </Dialog>
      )}
    </div>
  );
};

export default WorkoutHistory;