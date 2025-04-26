import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import MeasurementCard from "@/components/MeasurementCard";
import AddMeasurementForm from "@/components/AddMeasurementForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Measurement, MeasurementWithChange } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const Measurements = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("body");
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Add event listener for opening the dialog from mobile button
  useEffect(() => {
    const handleOpenAddDialog = () => setShowAddDialog(true);
    window.addEventListener('open-add-measurement-dialog', handleOpenAddDialog);
    
    return () => {
      window.removeEventListener('open-add-measurement-dialog', handleOpenAddDialog);
    };
  }, []);
  
  // Fetch all measurements
  const { data: allMeasurements, isLoading } = useQuery<MeasurementWithChange[]>({
    queryKey: ["/api/measurements"],
  });
  
  // Delete measurement mutation
  const deleteMeasurementMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/measurements/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Измерение удалено",
        description: "Измерение успешно удалено",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить измерение",
        variant: "destructive",
      });
    }
  });
  
  // Update measurement mutation
  const updateMeasurementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Measurement> }) => {
      await apiRequest("PUT", `/api/measurements/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Измерение обновлено",
        description: "Измерение успешно обновлено",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить измерение",
        variant: "destructive",
      });
    }
  });
  
  // Filter measurements by type based on active tab
  const getFilteredMeasurements = () => {
    if (!allMeasurements) return [];
    
    // Group measurements by type
    const groupedMeasurements: { [key: string]: MeasurementWithChange[] } = {};
    
    allMeasurements.forEach(measurement => {
      if (!groupedMeasurements[measurement.type]) {
        groupedMeasurements[measurement.type] = [];
      }
      groupedMeasurements[measurement.type].push(measurement);
    });
    
    // Filter groups based on active tab
    const bodyTypes = ["Бицепс", "Грудь", "Талия", "Бедра", "Вес"];
    const strengthTypes = ["Жим лежа", "Подтягивания", "Отжимания", "Приседания"];
    const cardioTypes = ["Бег", "Ходьба", "Плавание", "Велосипед"];
    
    let filteredTypes: string[] = [];
    
    if (activeTab === "body") {
      filteredTypes = Object.keys(groupedMeasurements).filter(type => bodyTypes.includes(type));
    } else if (activeTab === "strength") {
      filteredTypes = Object.keys(groupedMeasurements).filter(type => strengthTypes.includes(type));
    } else if (activeTab === "cardio") {
      filteredTypes = Object.keys(groupedMeasurements).filter(type => cardioTypes.includes(type));
    } else {
      filteredTypes = Object.keys(groupedMeasurements).filter(type => 
        !bodyTypes.includes(type) && !strengthTypes.includes(type) && !cardioTypes.includes(type)
      );
    }
    
    return filteredTypes.map(type => groupedMeasurements[type]);
  };
  
  const filteredMeasurementGroups = getFilteredMeasurements();
  
  const handleDeleteMeasurement = (id: number) => {
    deleteMeasurementMutation.mutate(id);
  };
  
  const handleUpdateMeasurement = (id: number, data: Partial<Measurement>) => {
    updateMeasurementMutation.mutate({ id, data });
  };
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-heading font-bold mb-4">Измерения</h2>
      
      {/* Add Measurement Button */}
      <Button 
        className="flex items-center bg-primary text-white px-4 py-2 rounded-lg mb-6"
        onClick={() => setShowAddDialog(true)}
      >
        <span className="material-icons mr-1">add</span> Добавить измерения
      </Button>
      
      {/* Measurements Tabs */}
      <div className="border-b mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-0 bg-transparent border-0">
            <TabsTrigger value="body" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Размеры тела
            </TabsTrigger>
            <TabsTrigger value="strength" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Силовые показатели
            </TabsTrigger>
            <TabsTrigger value="cardio" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Кардио
            </TabsTrigger>
            <TabsTrigger value="other" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Другое
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="body" className="mt-4">
            <div className="space-y-4">
              {isLoading ? (
                // Skeleton loading
                Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full" />
                ))
              ) : filteredMeasurementGroups.length === 0 ? (
                <div className="text-center p-6 bg-white rounded-lg shadow-md">
                  <span className="material-icons text-4xl text-neutral-medium mb-2">
                    straighten
                  </span>
                  <p className="text-neutral-medium">
                    У вас нет измерений в этой категории.
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Добавить измерение
                  </Button>
                </div>
              ) : (
                filteredMeasurementGroups.map((group, index) => (
                  <MeasurementCard 
                    key={index}
                    measurements={group}
                    isLoading={false}
                    onDelete={handleDeleteMeasurement}
                    onUpdate={handleUpdateMeasurement}
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="strength" className="mt-4">
            <div className="space-y-4">
              {isLoading ? (
                // Skeleton loading
                Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full" />
                ))
              ) : filteredMeasurementGroups.length === 0 ? (
                <div className="text-center p-6 bg-white rounded-lg shadow-md">
                  <span className="material-icons text-4xl text-neutral-medium mb-2">
                    fitness_center
                  </span>
                  <p className="text-neutral-medium">
                    У вас нет измерений силовых показателей.
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Добавить показатель
                  </Button>
                </div>
              ) : (
                filteredMeasurementGroups.map((group, index) => (
                  <MeasurementCard 
                    key={index}
                    measurements={group}
                    isLoading={false}
                    onDelete={handleDeleteMeasurement}
                    onUpdate={handleUpdateMeasurement}
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="cardio" className="mt-4">
            <div className="space-y-4">
              {isLoading ? (
                // Skeleton loading
                Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full" />
                ))
              ) : filteredMeasurementGroups.length === 0 ? (
                <div className="text-center p-6 bg-white rounded-lg shadow-md">
                  <span className="material-icons text-4xl text-neutral-medium mb-2">
                    directions_run
                  </span>
                  <p className="text-neutral-medium">
                    У вас нет измерений кардио показателей.
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Добавить показатель
                  </Button>
                </div>
              ) : (
                filteredMeasurementGroups.map((group, index) => (
                  <MeasurementCard 
                    key={index}
                    measurements={group}
                    isLoading={false}
                    onDelete={handleDeleteMeasurement}
                    onUpdate={handleUpdateMeasurement}
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="other" className="mt-4">
            <div className="space-y-4">
              {isLoading ? (
                // Skeleton loading
                Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full" />
                ))
              ) : filteredMeasurementGroups.length === 0 ? (
                <div className="text-center p-6 bg-white rounded-lg shadow-md">
                  <span className="material-icons text-4xl text-neutral-medium mb-2">
                    category
                  </span>
                  <p className="text-neutral-medium">
                    У вас нет других измерений.
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Добавить измерение
                  </Button>
                </div>
              ) : (
                filteredMeasurementGroups.map((group, index) => (
                  <MeasurementCard 
                    key={index}
                    measurements={group}
                    isLoading={false}
                    onDelete={handleDeleteMeasurement}
                    onUpdate={handleUpdateMeasurement}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Measurement Dialog */}
      <AddMeasurementForm 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
    </div>
  );
};

export default Measurements;
