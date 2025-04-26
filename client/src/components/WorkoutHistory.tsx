import { useState } from "react";
import { WorkoutLog } from "@shared/schema";
import { format, differenceInDays, compareDesc } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2,
  Clock, 
  Calendar, 
  ChevronRight, 
  Search, 
  FilterX,
  CalendarDays
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface WorkoutHistoryProps {
  workoutLogs: WorkoutLog[];
}

interface WorkoutDetailsProps {
  workoutLogId: number;
  onClose: () => void;
}

// Компонент для отображения подробных данных о тренировке
const WorkoutDetails = ({ workoutLogId, onClose }: WorkoutDetailsProps) => {
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
  
  const workoutDate = new Date(data.date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{data.name || "Тренировка"}</h3>
        <Badge variant={data.completed ? "success" : "outline"}>
          {data.completed ? "Завершена" : "В процессе"}
        </Badge>
      </div>
      
      <div className="flex items-center text-sm text-muted-foreground space-x-4">
        <div className="flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          {format(workoutDate, "d MMMM yyyy", { locale: ru })}
        </div>
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          {format(workoutDate, "HH:mm", { locale: ru })}
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-medium text-lg">Упражнения</h4>
        
        {exerciseLogs.length > 0 ? (
          <div className="space-y-2">
            {exerciseLogs.map((log: any) => (
              <div 
                key={log.id}
                className="p-3 rounded-md border border-muted bg-card flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{log.exercise.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {log.setNumber > 0 && `Подход ${log.setNumber}`}
                    {log.reps > 0 && ` • ${log.reps} повторений`}
                    {log.weight > 0 && ` • ${log.weight} кг`}
                    {log.duration && ` • ${log.duration}`}
                  </div>
                </div>
                
                {log.completed && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Нет данных об упражнениях
          </p>
        )}
      </div>
    </div>
  );
};

const WorkoutHistory = ({ workoutLogs }: WorkoutHistoryProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "inProgress">("all");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Сортируем и фильтруем логи тренировок
  const filteredAndSortedLogs = workoutLogs
    .filter(log => {
      // Фильтр по статусу
      if (filter === "completed" && !log.completed) return false;
      if (filter === "inProgress" && log.completed) return false;
      
      // Фильтр по поиску
      if (search.trim() !== "") {
        const searchLower = search.toLowerCase();
        const nameMatch = log.name?.toLowerCase().includes(searchLower);
        const dateMatch = format(new Date(log.date), "d MMMM yyyy", { locale: ru })
          .toLowerCase()
          .includes(searchLower);
        
        return nameMatch || dateMatch;
      }
      
      return true;
    })
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));
  
  const groupLogsByDate = (logs: WorkoutLog[]) => {
    const groups: Record<string, WorkoutLog[]> = {};
    
    logs.forEach(log => {
      const date = new Date(log.date);
      const dateKey = format(date, "yyyy-MM-dd");
      const formattedDate = format(date, "d MMMM yyyy", { locale: ru });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(log);
    });
    
    return Object.entries(groups).map(([dateKey, logs]) => ({
      date: dateKey,
      formattedDate: format(new Date(dateKey), "d MMMM yyyy", { locale: ru }),
      logs
    }));
  };
  
  const groupedLogs = groupLogsByDate(filteredAndSortedLogs);
  
  // Определение относительной даты
  const getRelativeDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = differenceInDays(today, date);
    
    if (diffDays === 0) return "Сегодня";
    if (diffDays === 1) return "Вчера";
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} дн. назад`;
    
    return null; // Возвращаем null, если не хотим показывать относительную дату
  };
  
  // Очистить фильтр
  const clearFilter = () => {
    setSearch("");
    setFilter("all");
  };
  
  return (
    <div className="space-y-6">
      {/* Панель фильтров */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Найти тренировку..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select 
            value={filter} 
            onValueChange={(value) => setFilter(value as "all" | "completed" | "inProgress")}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Статус тренировки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все тренировки</SelectItem>
              <SelectItem value="completed">Завершенные</SelectItem>
              <SelectItem value="inProgress">В процессе</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {(search !== "" || filter !== "all") && (
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilter} 
              className="h-8 gap-1 text-muted-foreground"
            >
              <FilterX className="h-4 w-4" />
              <span>Очистить фильтры</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Список тренировок по дням */}
      <div className="space-y-6">
        {groupedLogs.length > 0 ? (
          groupedLogs.map(group => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">
                  {group.formattedDate}
                  {getRelativeDateLabel(group.date) && (
                    <span className="text-sm font-normal ml-2 text-muted-foreground">
                      ({getRelativeDateLabel(group.date)})
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="space-y-2 pl-7">
                {group.logs.map(log => (
                  <Card 
                    key={log.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedWorkoutId(log.id);
                      setIsDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{log.name || "Тренировка"}</div>
                          <div className="text-sm text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {format(new Date(log.date), "HH:mm", { locale: ru })}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant={log.completed ? "success" : "outline"} className="h-5">
                            {log.completed ? "Завершена" : "В процессе"}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground text-center">
                {search !== "" || filter !== "all" ? 
                  "Нет тренировок, соответствующих фильтрам" : 
                  "История тренировок пуста"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Диалог с подробностями о тренировке */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Детали тренировки</DialogTitle>
          </DialogHeader>
          {selectedWorkoutId && (
            <WorkoutDetails 
              workoutLogId={selectedWorkoutId}
              onClose={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutHistory;