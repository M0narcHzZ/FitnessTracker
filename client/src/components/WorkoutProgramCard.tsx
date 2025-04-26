import { Button } from "@/components/ui/button";
import { WorkoutProgramWithExercises } from "@shared/schema";
import { useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Trash2, Copy, Edit, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WorkoutProgramCardProps {
  program: WorkoutProgramWithExercises;
  onEdit: (program: WorkoutProgramWithExercises) => void;
}

const WorkoutProgramCard = ({ program, onEdit }: WorkoutProgramCardProps) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const getBgColor = () => {
    switch (program.colorScheme) {
      case "primary": return "bg-primary";
      case "secondary": return "bg-secondary";
      case "accent": return "bg-accent";
      default: return "bg-primary";
    }
  };
  
  // Delete workout program mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/workout-programs/${program.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({
        title: "Успешно удалено",
        description: `Программа "${program.name}" была удалена`,
      });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить программу тренировки",
        variant: "destructive",
      });
    }
  });
  
  // Duplicate workout program mutation
  const duplicateWorkoutMutation = useMutation({
    mutationFn: async () => {
      // 1. Create a new workout program
      const newProgram = await apiRequest("POST", "/api/workout-programs", {
        name: `${program.name} (Копия)`,
        colorScheme: program.colorScheme,
        estimatedDuration: program.estimatedDuration,
        description: program.description,
      });
      
      // 2. Copy all exercises
      if (program.exercises) {
        for (const exercise of program.exercises) {
          await apiRequest("POST", "/api/workout-exercises", {
            workoutProgramId: newProgram.id,
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            duration: exercise.duration,
            order: exercise.sequence,  // Важно: использовать 'order' но со значением из 'sequence'
          });
        }
      }
      
      return newProgram;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({
        title: "Успешно скопировано",
        description: `Программа "${program.name}" была дублирована`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось дублировать программу тренировки",
        variant: "destructive",
      });
    }
  });
  
  // Calculate estimated duration text
  const getDurationText = () => {
    if (program.estimatedDuration) {
      return program.estimatedDuration;
    }
    
    if (program.exercises) {
      return `${program.exercises.length} упражнений`;
    }
    
    return "Нет упражнений";
  };
  
  const handleStartWorkout = () => {
    navigate(`/workout/${program.id}/execute`);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`${getBgColor()} text-white px-4 py-3 flex justify-between items-center`}>
        <h3 className="font-medium">{program.name}</h3>
        <div className="flex gap-2">
          <button 
            className="p-1"
            onClick={() => onEdit(program)}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="p-1"
            onClick={() => duplicateWorkoutMutation.mutate()}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button 
            className="p-1"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-neutral-medium mb-3">
          {program.exercises?.length || 0} упражнений • {getDurationText()}
        </p>
        
        <div className="space-y-2 max-h-48 overflow-y-auto exercise-list">
          {program.exercises?.map((exercise) => (
            <div key={exercise.id} className="flex justify-between text-sm">
              <span>{exercise.exercise.name}</span>
              <span>
                {exercise.sets} x {exercise.reps || exercise.duration || "-"}
              </span>
            </div>
          ))}
          
          {(!program.exercises || program.exercises.length === 0) && (
            <p className="text-sm text-neutral-medium text-center py-4">
              Нет упражнений в программе
            </p>
          )}
        </div>
        
        <Button
          className="w-full mt-4"
          variant="default"
          onClick={handleStartWorkout}
          disabled={!program.exercises || program.exercises.length === 0}
        >
          <Play className="w-4 h-4 mr-2" />
          Начать тренировку
        </Button>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить программу тренировки</DialogTitle>
          </DialogHeader>
          <p>
            Вы уверены, что хотите удалить программу "{program.name}"? Это действие нельзя отменить.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteWorkoutMutation.mutate()}
              disabled={deleteWorkoutMutation.isPending}
            >
              {deleteWorkoutMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutProgramCard;
