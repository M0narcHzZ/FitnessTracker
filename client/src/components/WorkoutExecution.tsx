import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutProgramWithExercises, ExerciseLog } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WorkoutExecutionProps {
  workout: WorkoutProgramWithExercises;
  workoutLogId: number;
}

interface SetStatus {
  completed: boolean;
  reps: number;
}

const WorkoutExecution = ({ workout, workoutLogId }: WorkoutExecutionProps) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<number, SetStatus[]>>({});
  
  const currentExercise = workout.exercises?.[currentExerciseIndex];
  
  // Load existing exercise logs
  const { data: exerciseLogs, isLoading: isLoadingLogs } = useQuery<(ExerciseLog & { exercise: any })[]>({
    queryKey: [`/api/workout-logs/${workoutLogId}/exercise-logs`],
  });
  
  // Create exercise log mutation
  const createExerciseLogMutation = useMutation({
    mutationFn: async (data: { workoutLogId: number; exerciseId: number; setNumber: number; reps: number; completed: boolean }) => {
      return await apiRequest("POST", "/api/exercise-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workout-logs/${workoutLogId}/exercise-logs`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить результаты упражнения",
        variant: "destructive",
      });
    }
  });
  
  // Update exercise log mutation
  const updateExerciseLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExerciseLog> }) => {
      return await apiRequest("PUT", `/api/exercise-logs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workout-logs/${workoutLogId}/exercise-logs`] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить результаты упражнения",
        variant: "destructive",
      });
    }
  });
  
  // Complete workout mutation
  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/workout-logs/${workoutLogId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-logs"] });
      toast({
        title: "Тренировка завершена",
        description: "Поздравляем с завершением тренировки!",
      });
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось завершить тренировку",
        variant: "destructive",
      });
    }
  });
  
  // Initialize exercise sets from logs
  useEffect(() => {
    if (exerciseLogs && workout.exercises) {
      const initialSets: Record<number, SetStatus[]> = {};
      
      workout.exercises.forEach(exercise => {
        const exerciseId = exercise.exerciseId;
        const logs = exerciseLogs.filter(log => log.exerciseId === exerciseId);
        
        if (logs.length > 0) {
          // Sort logs by set number
          logs.sort((a, b) => a.setNumber - b.setNumber);
          
          initialSets[exerciseId] = Array.from({ length: exercise.sets || 0 }, (_, index) => {
            const log = logs.find(l => l.setNumber === index + 1);
            return {
              completed: log?.completed || false,
              reps: log?.reps || 0
            };
          });
        } else {
          // Initialize with empty sets
          initialSets[exerciseId] = Array.from({ length: exercise.sets || 0 }, () => ({
            completed: false,
            reps: 0
          }));
        }
      });
      
      setExerciseSets(initialSets);
    }
  }, [exerciseLogs, workout.exercises]);
  
  // Start/pause timer
  const toggleTimer = (duration?: number) => {
    if (timerInterval) {
      // Pause timer
      clearInterval(timerInterval);
      setTimerInterval(null);
    } else {
      // Start or reset timer
      if (duration) {
        setTimer(duration * 60); // Convert minutes to seconds
      }
      
      const interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer === null || prevTimer <= 0) {
            clearInterval(interval);
            setTimerInterval(null);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
      
      setTimerInterval(interval);
    }
  };
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
  // Format timer display
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle set completion
  const handleSetComplete = (setIndex: number) => {
    if (!currentExercise) return;
    
    const exerciseId = currentExercise.exerciseId;
    const setNumber = setIndex + 1;
    const newSets = [...(exerciseSets[exerciseId] || [])];
    
    // Toggle completion
    newSets[setIndex].completed = !newSets[setIndex].completed;
    
    setExerciseSets({
      ...exerciseSets,
      [exerciseId]: newSets
    });
    
    // Find existing log
    const existingLog = exerciseLogs?.find(
      log => log.exerciseId === exerciseId && log.setNumber === setNumber
    );
    
    if (existingLog) {
      // Update existing log
      updateExerciseLogMutation.mutate({
        id: existingLog.id,
        data: {
          reps: newSets[setIndex].reps,
          completed: newSets[setIndex].completed
        }
      });
    } else {
      // Create new log
      createExerciseLogMutation.mutate({
        workoutLogId,
        exerciseId,
        setNumber,
        reps: newSets[setIndex].reps,
        completed: newSets[setIndex].completed
      });
    }
    
    // Start rest timer if completed
    if (newSets[setIndex].completed) {
      toggleTimer(2); // Default 2 minutes rest
    }
  };
  
  // Handle reps change
  const handleRepsChange = (setIndex: number, reps: string) => {
    if (!currentExercise) return;
    
    const exerciseId = currentExercise.exerciseId;
    const newSets = [...(exerciseSets[exerciseId] || [])];
    newSets[setIndex].reps = parseInt(reps) || 0;
    
    setExerciseSets({
      ...exerciseSets,
      [exerciseId]: newSets
    });
  };
  
  // Go to next exercise
  const goToNextExercise = () => {
    if (currentExerciseIndex < (workout.exercises?.length || 0) - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Complete workout
      completeWorkoutMutation.mutate();
    }
  };
  
  // Go to previous exercise
  const goToPrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };
  
  // Save current set on blur
  const saveCurrentSet = (setIndex: number) => {
    if (!currentExercise) return;
    
    const exerciseId = currentExercise.exerciseId;
    const setNumber = setIndex + 1;
    const set = exerciseSets[exerciseId]?.[setIndex];
    
    if (!set) return;
    
    // Find existing log
    const existingLog = exerciseLogs?.find(
      log => log.exerciseId === exerciseId && log.setNumber === setNumber
    );
    
    if (existingLog) {
      // Update existing log
      updateExerciseLogMutation.mutate({
        id: existingLog.id,
        data: {
          reps: set.reps,
          completed: set.completed
        }
      });
    } else {
      // Create new log
      createExerciseLogMutation.mutate({
        workoutLogId,
        exerciseId,
        setNumber,
        reps: set.reps,
        completed: set.completed
      });
    }
  };
  
  if (!currentExercise) {
    return (
      <div className="p-4">
        <div className="text-center p-6">
          <p>В этой тренировке нет упражнений.</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate("/")}
          >
            Вернуться на главную
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{workout.name}</h2>
        <Button 
          variant="destructive" 
          size="sm"
          className="flex items-center"
          onClick={() => setShowExitDialog(true)}
        >
          <span className="material-icons mr-1">close</span> 
          Выйти
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">{currentExercise.exercise.name}</h3>
          <span className="text-sm bg-primary-light px-2 py-0.5 rounded-full">
            {currentExerciseIndex + 1} из {workout.exercises?.length || 0}
          </span>
        </div>
        
        <p className="text-sm text-neutral-medium mb-4">
          {currentExercise.sets} подхода x {currentExercise.reps || ''} {currentExercise.reps ? 'повторений' : ''}
          {currentExercise.duration ? currentExercise.duration : ''}
        </p>
        
        <div className="space-y-3">
          {isLoadingLogs ? (
            // Skeleton loading
            Array.from({ length: currentExercise.sets || 0 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-neutral-lightest rounded-lg">
                <Skeleton className="h-5 w-20" />
                <div className="flex items-center">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8 ml-2" />
                </div>
              </div>
            ))
          ) : (
            // Sets display
            Array.from({ length: currentExercise.sets || 0 }).map((_, index) => {
              const setStatus = exerciseSets[currentExercise.exerciseId]?.[index] || { completed: false, reps: 0 };
              
              return (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-neutral-lightest rounded-lg">
                  <span className="font-medium">Подход {index + 1}</span>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      min="0"
                      className="w-12 p-1 text-center"
                      value={setStatus.reps || ''}
                      onChange={(e) => handleRepsChange(index, e.target.value)}
                      onBlur={() => saveCurrentSet(index)}
                    />
                    <span className="ml-1">повт.</span>
                    <button 
                      className="ml-2"
                      onClick={() => handleSetComplete(index)}
                    >
                      {setStatus.completed ? (
                        <span className="text-success material-icons">check_circle</span>
                      ) : (
                        <span className="text-primary material-icons">fitness_center</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="mt-4 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={goToPrevExercise}
            disabled={currentExerciseIndex === 0}
          >
            Предыдущее
          </Button>
          <Button 
            variant="default" 
            className="flex-1"
            onClick={goToNextExercise}
          >
            {currentExerciseIndex === (workout.exercises?.length || 0) - 1
              ? "Завершить тренировку"
              : "Следующее"
            }
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-medium mb-2">Таймер отдыха</h3>
        <div className="text-center py-3">
          <span className="text-3xl font-bold">{formatTime(timer)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <Button 
            variant="outline" 
            className="flex-1 text-sm"
            onClick={() => toggleTimer(1)}
          >
            1 мин
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 text-sm"
            onClick={() => toggleTimer(2)}
          >
            2 мин
          </Button>
          <Button 
            variant="default" 
            className="flex-1 text-sm"
            onClick={() => toggleTimer(3)}
          >
            3 мин
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 text-sm"
            onClick={() => {
              if (timerInterval) {
                toggleTimer(); // Pause
              } else {
                setTimer(null); // Reset
              }
            }}
          >
            {timerInterval ? "Пауза" : (timer ? "Продолжить" : "Сброс")}
          </Button>
        </div>
      </div>
      
      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выйти из тренировки</DialogTitle>
          </DialogHeader>
          <p>
            Вы уверены, что хотите выйти? Текущий прогресс будет сохранен, но тренировка не будет отмечена как завершенная.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => navigate("/")}
            >
              Выйти
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutExecution;
