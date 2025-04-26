import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MeasurementWithChange, 
  WorkoutLog
} from "@shared/schema";
import StatCard from "@/components/StatCard";
import TodaysWorkout from "@/components/TodaysWorkout";
import ProgressPhotoGrid from "@/components/ProgressPhotoGrid";
import WorkoutStats from "@/components/WorkoutStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const Dashboard = () => {
  const [keyMeasurements, setKeyMeasurements] = useState<{
    [key: string]: MeasurementWithChange | undefined;
  }>({
    bicep: undefined,
    weight: undefined,
    pullups: undefined,
    pushups: undefined,
    squats: undefined,
  });

  // Fetch all measurements
  const { data: measurements, isLoading: isMeasurementsLoading } = useQuery<MeasurementWithChange[]>({
    queryKey: ["/api/measurements"],
  });
  
  // Fetch workout logs
  const { data: workoutLogs = [], isLoading: isWorkoutLogsLoading } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/workout-logs"],
  });

  // Extract the latest measurements for key metrics
  useEffect(() => {
    if (measurements) {
      const latestMeasurements: { [key: string]: MeasurementWithChange | undefined } = {
        bicep: undefined,
        weight: undefined,
        pullups: undefined,
        pushups: undefined,
        squats: undefined,
      };

      // Find latest measurement for each metric
      for (const measurement of measurements) {
        if (measurement.type === "Бицепс" && (!latestMeasurements.bicep || new Date(measurement.date) > new Date(latestMeasurements.bicep.date))) {
          latestMeasurements.bicep = measurement;
        } else if (measurement.type === "Вес" && (!latestMeasurements.weight || new Date(measurement.date) > new Date(latestMeasurements.weight.date))) {
          latestMeasurements.weight = measurement;
        } else if (measurement.type === "Подтягивания" && (!latestMeasurements.pullups || new Date(measurement.date) > new Date(latestMeasurements.pullups.date))) {
          latestMeasurements.pullups = measurement;
        } else if (measurement.type === "Отжимания" && (!latestMeasurements.pushups || new Date(measurement.date) > new Date(latestMeasurements.pushups.date))) {
          latestMeasurements.pushups = measurement;
        } else if (measurement.type === "Приседания" && (!latestMeasurements.squats || new Date(measurement.date) > new Date(latestMeasurements.squats.date))) {
          latestMeasurements.squats = measurement;
        }
      }

      setKeyMeasurements(latestMeasurements);
    }
  }, [measurements]);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold mb-4">Ваш прогресс</h2>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isMeasurementsLoading ? (
            // Skeleton loading for stats
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-16 mt-1" />
              </div>
            ))
          ) : (
            <>
              {keyMeasurements.bicep && (
                <StatCard
                  title="Бицепс"
                  value={`${keyMeasurements.bicep.value} ${keyMeasurements.bicep.unit}`}
                  change={keyMeasurements.bicep.change ? `${keyMeasurements.bicep.change > 0 ? '+' : ''}${keyMeasurements.bicep.change} ${keyMeasurements.bicep.unit}` : undefined}
                  isPositive={keyMeasurements.bicep.change ? keyMeasurements.bicep.change > 0 : true}
                />
              )}

              {keyMeasurements.pullups && (
                <StatCard
                  title="Подтягивания"
                  value={`${keyMeasurements.pullups.value} повт.`}
                  change={keyMeasurements.pullups.change ? `${keyMeasurements.pullups.change > 0 ? '+' : ''}${keyMeasurements.pullups.change} повт.` : undefined}
                  isPositive={keyMeasurements.pullups.change ? keyMeasurements.pullups.change > 0 : true}
                />
              )}

              {keyMeasurements.pushups && (
                <StatCard
                  title="Отжимания"
                  value={`${keyMeasurements.pushups.value} повт.`}
                  change={keyMeasurements.pushups.change ? `${keyMeasurements.pushups.change > 0 ? '+' : ''}${keyMeasurements.pushups.change} повт.` : undefined}
                  isPositive={keyMeasurements.pushups.change ? keyMeasurements.pushups.change > 0 : true}
                />
              )}

              {keyMeasurements.squats && (
                <StatCard
                  title="Приседания"
                  value={`${keyMeasurements.squats.value} повт.`}
                  change={keyMeasurements.squats.change ? `${keyMeasurements.squats.change > 0 ? '+' : ''}${keyMeasurements.squats.change} повт.` : undefined}
                  isPositive={keyMeasurements.squats.change ? keyMeasurements.squats.change > 0 : true}
                />
              )}

              {/* Fill in missing stats */}
              {!keyMeasurements.bicep && !keyMeasurements.weight && !keyMeasurements.pullups && !keyMeasurements.pushups && (
                <div className="bg-white p-4 rounded-lg shadow-md col-span-2 lg:col-span-4">
                  <p className="text-center text-neutral-medium">
                    У вас нет измерений. Добавьте измерения на странице "Измерения".
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Today's Workout */}
      <div>
        <TodaysWorkout />
      </div>
      
      {/* Workout Stats */}
      <div>
        <h3 className="text-xl font-medium mb-4">Статистика тренировок</h3>
        
        {isWorkoutLogsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <WorkoutStats workoutLogs={workoutLogs} />
        )}
      </div>
      
      <Separator />
      
      {/* Recent Progress Photos */}
      <div>
        <h3 className="text-xl font-medium mb-3">Фото прогресса</h3>
        <ProgressPhotoGrid limit={3} />
      </div>
    </div>
  );
};

export default Dashboard;
