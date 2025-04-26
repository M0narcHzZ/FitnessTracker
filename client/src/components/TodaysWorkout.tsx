import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useState } from "react";
import { WorkoutProgramWithExercises } from "@shared/schema";

const TodaysWorkout = () => {
  const [, navigate] = useLocation();

  // In a real application, we might fetch this based on a scheduled workout
  // For demonstration, we'll fetch the first workout program
  const { data: workoutPrograms, isLoading } = useQuery<WorkoutProgramWithExercises[]>({
    queryKey: ["/api/workout-programs"],
  });

  const todayWorkout = workoutPrograms?.[0];

  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);

  const handleExerciseStart = (index: number) => {
    setActiveExerciseIndex(index);
  };

  const handleStartWorkout = () => {
    if (todayWorkout) {
      navigate(`/workout/${todayWorkout.id}/execute`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b">
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
          <Skeleton className="h-10 w-full mt-3" />
        </div>
      </div>
    );
  }

  if (!todayWorkout) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-center items-center flex-col py-6">
          <span className="material-icons text-4xl text-neutral-medium mb-2">
            fitness_center
          </span>
          <p className="text-neutral-medium text-center">
            У вас нет запланированных тренировок на сегодня.
          </p>
          <Button 
            variant="default" 
            className="mt-4"
            onClick={() => navigate("/workouts")}
          >
            Запланировать тренировку
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">Сегодняшняя тренировка</h3>
        <span className="bg-primary px-3 py-1 text-white text-sm rounded-full">
          {todayWorkout.name}
        </span>
      </div>

      <div className="space-y-3">
        {todayWorkout.exercises?.map((workoutExercise, index) => (
          <div key={workoutExercise.id} className="flex items-center justify-between py-2 border-b">
            <div>
              <h4 className="font-medium">{workoutExercise.exercise.name}</h4>
              <p className="text-sm text-neutral-medium">
                {workoutExercise.sets} подхода x {workoutExercise.reps} повторений
              </p>
            </div>
            <Button
              onClick={() => handleExerciseStart(index)}
              variant={activeExerciseIndex === index ? "default" : "secondary"}
              className={activeExerciseIndex === index ? "bg-primary text-white" : "bg-neutral-light text-neutral-dark"}
              size="sm"
            >
              Начать
            </Button>
          </div>
        ))}

        <Button 
          className="w-full mt-3"
          variant="default"
          onClick={handleStartWorkout}
        >
          Выполнить всю тренировку
        </Button>
      </div>
    </div>
  );
};

export default TodaysWorkout;
