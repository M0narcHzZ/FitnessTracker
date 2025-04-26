import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutProgramCard from "@/components/WorkoutProgramCard";
import AddWorkoutForm from "@/components/AddWorkoutForm";
import WorkoutCalendar from "@/components/WorkoutCalendar";
import WorkoutHistory from "@/components/WorkoutHistory";
import { WorkoutProgramWithExercises, WorkoutLog } from "@shared/schema";

const Workouts = () => {
  const [activeTab, setActiveTab] = useState("programs");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editWorkout, setEditWorkout] = useState<WorkoutProgramWithExercises | undefined>(undefined);
  
  // Fetch all workout programs
  const { data: workoutPrograms, isLoading } = useQuery<WorkoutProgramWithExercises[]>({
    queryKey: ["/api/workout-programs"],
  });
  
  // Fetch workout logs
  const { data: workoutLogs = [], isLoading: isWorkoutLogsLoading } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/workout-logs"],
  });
  
  // Add event listener for opening the dialog from mobile button
  useEffect(() => {
    const handleOpenAddDialog = () => setShowAddDialog(true);
    window.addEventListener('open-add-workout-dialog', handleOpenAddDialog);
    
    return () => {
      window.removeEventListener('open-add-workout-dialog', handleOpenAddDialog);
    };
  }, []);
  
  const handleEditWorkout = (workout: WorkoutProgramWithExercises) => {
    setEditWorkout(workout);
    setShowAddDialog(true);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-heading font-bold mb-4">Тренировки</h2>
      
      {/* Workout Tabs */}
      <div className="border-b mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-0 bg-transparent border-0">
            <TabsTrigger value="programs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Мои программы
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Календарь
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              История
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="programs" className="mt-4">
            {/* Add Workout Button */}
            <Button 
              className="flex items-center bg-primary text-white px-4 py-2 rounded-lg mb-6"
              onClick={() => {
                setEditWorkout(undefined);
                setShowAddDialog(true);
              }}
            >
              <span className="material-icons mr-1">add</span> Создать программу
            </Button>
            
            {/* Workout Programs Grid */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full" />
                ))}
              </div>
            ) : !workoutPrograms || workoutPrograms.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-lg shadow-md">
                <span className="material-icons text-4xl text-neutral-medium mb-2">
                  fitness_center
                </span>
                <p className="text-neutral-medium">
                  У вас нет созданных программ тренировок.
                </p>
                <Button 
                  variant="default" 
                  className="mt-4"
                  onClick={() => {
                    setEditWorkout(undefined);
                    setShowAddDialog(true);
                  }}
                >
                  Создать программу
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {workoutPrograms.map((program) => (
                  <WorkoutProgramCard 
                    key={program.id} 
                    program={program} 
                    onEdit={handleEditWorkout}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-4">
            {isWorkoutLogsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <WorkoutCalendar workoutLogs={workoutLogs} />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            {isWorkoutLogsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <WorkoutHistory workoutLogs={workoutLogs} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add/Edit Workout Dialog */}
      <AddWorkoutForm 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        editWorkout={editWorkout}
      />
    </div>
  );
};

export default Workouts;
