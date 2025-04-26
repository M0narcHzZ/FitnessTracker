import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutExecution from "@/components/WorkoutExecution";
import { WorkoutProgramWithExercises } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ExecuteWorkout = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [workoutLogId, setWorkoutLogId] = useState<number | null>(null);
  
  // Fetch workout program details
  const { data: workout, isLoading, error } = useQuery<WorkoutProgramWithExercises>({
    queryKey: [`/api/workout-programs/${id}`],
  });
  
  // Create workout log mutation
  const createWorkoutLogMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/workout-logs", {
        workoutProgramId: parseInt(id),
        date: new Date().toISOString(),
        completed: false
      });
    },
    onSuccess: (data) => {
      setWorkoutLogId(data.id);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось начать тренировку",
        variant: "destructive",
      });
      navigate("/workouts");
    }
  });
  
  // Create workout log when component mounts
  useEffect(() => {
    if (id && !workoutLogId) {
      createWorkoutLogMutation.mutate();
    }
  }, [id]);
  
  if (isLoading || createWorkoutLogMutation.isPending) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-20" />
          </div>
          
          <Skeleton className="h-4 w-56 mb-4" />
          
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
          
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (error || !workout) {
    return (
      <div className="p-4">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <span className="material-icons text-4xl text-destructive mb-2">
            error_outline
          </span>
          <p className="text-neutral-medium">
            Не удалось загрузить данные тренировки.
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
            onClick={() => navigate("/workouts")}
          >
            Вернуться к программам
          </button>
        </div>
      </div>
    );
  }
  
  if (!workoutLogId) {
    return (
      <div className="p-4">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <span className="material-icons text-4xl text-neutral-medium mb-2">
            hourglass_empty
          </span>
          <p className="text-neutral-medium">
            Подготовка к тренировке...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <WorkoutExecution workout={workout} workoutLogId={workoutLogId} />
  );
};

export default ExecuteWorkout;
