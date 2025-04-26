import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Exercise, WorkoutProgram, WorkoutProgramWithExercises } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";

const workoutSchema = z.object({
  name: z.string().min(1, { message: "Введите название программы" }),
  colorScheme: z.string().min(1, { message: "Выберите цветовую схему" }),
  estimatedDuration: z.string().optional(),
  description: z.string().optional()
});

interface ExerciseItem {
  id: number; // Temporary ID for UI
  exerciseId: number;
  exerciseName: string;
  sets: number;
  reps: number | null;
  duration: string | null;
}

interface AddWorkoutFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editWorkout?: WorkoutProgramWithExercises;
}

const AddWorkoutForm = ({ open, onOpenChange, editWorkout }: AddWorkoutFormProps) => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("details");
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [nextExerciseId, setNextExerciseId] = useState(1);
  
  const form = useForm<z.infer<typeof workoutSchema>>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      name: editWorkout?.name || "",
      colorScheme: editWorkout?.colorScheme || "primary",
      estimatedDuration: editWorkout?.estimatedDuration || "",
      description: editWorkout?.description || ""
    }
  });
  
  // Fetch available exercises
  const { data: availableExercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    enabled: open
  });
  
  // Initialize form when editing
  useEffect(() => {
    if (editWorkout) {
      form.reset({
        name: editWorkout.name,
        colorScheme: editWorkout.colorScheme,
        estimatedDuration: editWorkout.estimatedDuration || "",
        description: editWorkout.description || ""
      });
      
      // Initialize exercises
      if (editWorkout.exercises) {
        const mappedExercises = editWorkout.exercises.map((ex, index) => ({
          id: index + 1,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exercise.name,
          sets: ex.sets || 3,
          reps: ex.reps || null,
          duration: ex.duration || null
        }));
        
        setExercises(mappedExercises);
        setNextExerciseId(mappedExercises.length + 1);
      } else {
        setExercises([]);
      }
    } else {
      resetForm();
    }
  }, [editWorkout, open]);
  
  const resetForm = () => {
    form.reset({
      name: "",
      colorScheme: "primary",
      estimatedDuration: "",
      description: ""
    });
    setExercises([]);
    setNextExerciseId(1);
    setSelectedTab("details");
  };
  
  // Create workout mutation
  const createWorkoutMutation = useMutation({
    mutationFn: async (data: z.infer<typeof workoutSchema>) => {
      console.log("Submitting workout program data:", data);
      return await apiRequest("POST", "/api/workout-programs", data);
    },
    onSuccess: async (response) => {
      console.log("Программа создана успешно:", response);
      
      // Убедимся, что у нас есть ID программы
      // В зависимости от формата ответа API - может возвращаться как program.id или program.user_id
      let programId: number;
      if (typeof response === 'object' && response !== null) {
        programId = response.id || response.workout_program_id;
      } else {
        throw new Error("Не удалось получить ID созданной программы");
      }
      
      // Add exercises to the program
      if (exercises.length > 0) {
        for (let i = 0; i < exercises.length; i++) {
          const exercise = exercises[i];
          
          // Формируем объект с обязательными полями
          const exerciseData: any = {
            workoutProgramId: programId,
            exerciseId: exercise.exerciseId,
            order: i + 1  // ВАЖНО: используем 'order', но в БД есть обработка и для sequence
          };
          
          // Добавляем необязательные поля только если они определены
          if (exercise.sets !== undefined) exerciseData.sets = exercise.sets;
          if (exercise.reps !== undefined && exercise.reps !== null) exerciseData.reps = exercise.reps;
          if (exercise.duration !== undefined && exercise.duration !== null) exerciseData.duration = exercise.duration;
          
          console.log("Добавление упражнения:", exerciseData);
          
          await apiRequest("POST", "/api/workout-exercises", exerciseData);
        }
      }
      
      toast({
        title: "Программа создана",
        description: "Новая программа тренировок создана успешно",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать программу тренировок",
        variant: "destructive",
      });
    }
  });
  
  // Update workout mutation
  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof workoutSchema> }) => {
      console.log("Updating workout program data:", data);
      return await apiRequest("PUT", `/api/workout-programs/${id}`, data);
    },
    onSuccess: async (response) => {
      if (!editWorkout) return;
      
      console.log("Программа обновлена успешно:", response);
      
      // Remove existing exercises
      if (editWorkout.exercises) {
        for (const exercise of editWorkout.exercises) {
          await apiRequest("DELETE", `/api/workout-exercises/${exercise.id}`);
        }
      }
      
      // Add new exercises
      if (exercises.length > 0) {
        for (let i = 0; i < exercises.length; i++) {
          const exercise = exercises[i];
          // Формируем объект с обязательными полями
          const exerciseData: any = {
            workoutProgramId: editWorkout.id,
            exerciseId: exercise.exerciseId,
            order: i + 1  // ВАЖНО: используем 'order', но в БД есть обработка и для sequence
          };
          
          // Добавляем необязательные поля только если они определены
          if (exercise.sets !== undefined) exerciseData.sets = exercise.sets;
          if (exercise.reps !== undefined && exercise.reps !== null) exerciseData.reps = exercise.reps;
          if (exercise.duration !== undefined && exercise.duration !== null) exerciseData.duration = exercise.duration;
          
          await apiRequest("POST", "/api/workout-exercises", exerciseData);
        }
      }
      
      toast({
        title: "Программа обновлена",
        description: "Программа тренировок обновлена успешно",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/workout-programs/${editWorkout.id}`] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить программу тренировок",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof workoutSchema>) => {
    if (exercises.length === 0) {
      toast({
        title: "Добавьте упражнения",
        description: "Программа тренировок должна содержать хотя бы одно упражнение",
        variant: "destructive",
      });
      setSelectedTab("exercises");
      return;
    }
    
    if (editWorkout) {
      updateWorkoutMutation.mutate({ id: editWorkout.id, data });
    } else {
      createWorkoutMutation.mutate(data);
    }
  };
  
  // Add a new exercise to the list
  const addExercise = (exerciseId: number) => {
    const exercise = availableExercises?.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    setExercises([
      ...exercises,
      {
        id: nextExerciseId,
        exerciseId,
        exerciseName: exercise.name,
        sets: 3,
        reps: exercise.category?.includes("Кардио") ? null : 10,
        duration: exercise.category?.includes("Кардио") ? "30 сек" : null
      }
    ]);
    
    setNextExerciseId(nextExerciseId + 1);
  };
  
  // Remove an exercise from the list
  const removeExercise = (id: number) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };
  
  // Update exercise details
  const updateExercise = (id: number, field: string, value: any) => {
    setExercises(exercises.map(ex => {
      if (ex.id === id) {
        return { ...ex, [field]: value };
      }
      return ex;
    }));
  };
  
  // Move exercise up or down in the list
  const moveExercise = (id: number, direction: "up" | "down") => {
    const index = exercises.findIndex(ex => ex.id === id);
    if (index === -1) return;
    
    if (direction === "up" && index > 0) {
      const newExercises = [...exercises];
      [newExercises[index], newExercises[index - 1]] = [newExercises[index - 1], newExercises[index]];
      setExercises(newExercises);
    } else if (direction === "down" && index < exercises.length - 1) {
      const newExercises = [...exercises];
      [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
      setExercises(newExercises);
    }
  };
  
  const colorSchemeOptions = [
    { label: "Зеленый", value: "primary" },
    { label: "Синий", value: "secondary" },
    { label: "Оранжевый", value: "accent" }
  ];
  
  const exercisesByCategory = availableExercises ? 
    availableExercises.reduce((acc, exercise) => {
      const category = exercise.category || "Другое";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exercise);
      return acc;
    }, {} as Record<string, Exercise[]>) : {};
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && !editWorkout) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editWorkout ? "Редактировать программу" : "Создать программу тренировок"}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Детали программы</TabsTrigger>
            <TabsTrigger value="exercises">Упражнения</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название программы</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: Верхняя часть тела" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="colorScheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цветовая схема</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите цвет" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorSchemeOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              {color.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Примерная длительность</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: 45-60 минут" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" onClick={() => setSelectedTab("exercises")}>
                    Далее: Упражнения
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="exercises">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Добавить упражнение</h3>
                <div className="max-h-40 overflow-y-auto">
                  {Object.entries(exercisesByCategory).map(([category, exercises]) => (
                    <div key={category} className="mb-2">
                      <h4 className="font-medium text-sm">{category}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {exercises.map(exercise => (
                          <Button
                            key={exercise.id}
                            size="sm"
                            variant="outline"
                            onClick={() => addExercise(exercise.id)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {exercise.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Упражнения в программе</h3>
                {exercises.length === 0 ? (
                  <div className="text-center p-4 border border-dashed rounded-lg">
                    <p className="text-neutral-medium">
                      Нет добавленных упражнений. Добавьте упражнения из списка выше.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exercises.map((exercise, index) => (
                      <div key={exercise.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{exercise.exerciseName}</div>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="number"
                              value={exercise.sets}
                              onChange={(e) => updateExercise(exercise.id, "sets", parseInt(e.target.value) || 1)}
                              className="w-16"
                              min="1"
                            />
                            <span className="self-center">x</span>
                            {exercise.reps !== null ? (
                              <Input
                                type="number"
                                value={exercise.reps || ""}
                                onChange={(e) => updateExercise(exercise.id, "reps", parseInt(e.target.value) || 0)}
                                className="w-16"
                                min="0"
                                placeholder="повт."
                              />
                            ) : (
                              <Input
                                type="text"
                                value={exercise.duration || ""}
                                onChange={(e) => updateExercise(exercise.id, "duration", e.target.value)}
                                className="w-24"
                                placeholder="длит."
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateExercise(
                                exercise.id, 
                                exercise.reps !== null ? "reps" : "duration",
                                exercise.reps !== null ? null : 10
                              )}
                              className="w-8 h-8"
                            >
                              <span className="material-icons text-sm">
                                {exercise.reps !== null ? "timer" : "repeat"}
                              </span>
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveExercise(exercise.id, "up")}
                            disabled={index === 0}
                            className="w-8 h-8"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveExercise(exercise.id, "down")}
                            disabled={index === exercises.length - 1}
                            className="w-8 h-8"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercise(exercise.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setSelectedTab("details")}>
                  Назад: Детали
                </Button>
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Отмена</Button>
                  </DialogClose>
                  <Button 
                    type="button" 
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={createWorkoutMutation.isPending || updateWorkoutMutation.isPending}
                  >
                    {createWorkoutMutation.isPending || updateWorkoutMutation.isPending
                      ? "Сохранение..."
                      : editWorkout ? "Обновить" : "Создать"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkoutForm;
