import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ProgressPhotoCard from "@/components/ProgressPhotoCard";
import AddPhotoForm from "@/components/AddPhotoForm";
import { ProgressPhoto, Measurement } from "@shared/schema";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const Progress = () => {
  const [activeTab, setActiveTab] = useState("photos");
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Fetch progress photos
  const { data: photos, isLoading: isPhotosLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ["/api/progress-photos"],
  });
  
  // Fetch measurements for charts
  const { data: measurements, isLoading: isMeasurementsLoading } = useQuery<Measurement[]>({
    queryKey: ["/api/measurements"],
  });
  
  // Add event listener for opening the dialog from mobile button
  useEffect(() => {
    const handleOpenAddDialog = () => setShowAddDialog(true);
    window.addEventListener('open-add-photo-dialog', handleOpenAddDialog);
    
    return () => {
      window.removeEventListener('open-add-photo-dialog', handleOpenAddDialog);
    };
  }, []);
  
  // Prepare chart data
  const getChartData = (type: string) => {
    if (!measurements) return [];
    
    const filteredMeasurements = measurements
      .filter(m => m.type === type)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return filteredMeasurements.map(m => ({
      date: format(new Date(m.date), 'dd.MM.yy'),
      value: m.value
    }));
  };
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-heading font-bold mb-4">Прогресс</h2>
      
      {/* Progress Tabs */}
      <div className="border-b mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-0 bg-transparent border-0">
            <TabsTrigger value="photos" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Фото
            </TabsTrigger>
            <TabsTrigger value="charts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Графики
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Достижения
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="photos" className="mt-4">
            {/* Add Photo Button */}
            <Button 
              className="flex items-center bg-primary text-white px-4 py-2 rounded-lg mb-6"
              onClick={() => setShowAddDialog(true)}
            >
              <span className="material-icons mr-1">add_a_photo</span> Загрузить новое фото
            </Button>
            
            {/* Photo Grid */}
            {isPhotosLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : !photos || photos.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-lg shadow-md">
                <span className="material-icons text-4xl text-neutral-medium mb-2">
                  photo_library
                </span>
                <p className="text-neutral-medium">
                  У вас пока нет загруженных фото прогресса.
                </p>
                <Button 
                  variant="default" 
                  className="mt-4"
                  onClick={() => setShowAddDialog(true)}
                >
                  Загрузить фото
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => {
                  const relatedMeasurement = photo.relatedMeasurementId && measurements ? 
                    measurements.find(m => m.id === photo.relatedMeasurementId) : undefined;
                  
                  return (
                    <ProgressPhotoCard 
                      key={photo.id} 
                      photo={photo}
                      measurement={relatedMeasurement ? {
                        type: relatedMeasurement.type,
                        value: relatedMeasurement.value,
                        unit: relatedMeasurement.unit
                      } : undefined}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="charts" className="mt-4">
            {isMeasurementsLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full" />
                ))}
              </div>
            ) : !measurements || measurements.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-lg shadow-md">
                <span className="material-icons text-4xl text-neutral-medium mb-2">
                  show_chart
                </span>
                <p className="text-neutral-medium">
                  У вас нет данных для построения графиков.
                </p>
                <Button 
                  variant="default" 
                  className="mt-4"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-add-measurement-dialog'))}
                >
                  Добавить измерение
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bicep Measurement Chart */}
                {getChartData("Бицепс").length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="font-medium mb-4">Прогресс бицепса</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData("Бицепс")}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                          <Tooltip formatter={(value) => [`${value} см`, "Бицепс"]} />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Weight Measurement Chart */}
                {getChartData("Вес").length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="font-medium mb-4">Динамика веса</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData("Вес")}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                          <Tooltip formatter={(value) => [`${value} кг`, "Вес"]} />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Strength Metrics Chart */}
                {getChartData("Подтягивания").length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="font-medium mb-4">Прогресс в подтягиваниях</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData("Подтягивания")}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 'dataMax + 5']} />
                          <Tooltip formatter={(value) => [`${value} повторений`, "Подтягивания"]} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {getChartData("Отжимания").length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="font-medium mb-4">Прогресс в отжиманиях</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData("Отжимания")}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 'dataMax + 5']} />
                          <Tooltip formatter={(value) => [`${value} повторений`, "Отжимания"]} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="achievements" className="mt-4">
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <span className="material-icons text-4xl text-neutral-medium mb-2">
                emoji_events
              </span>
              <p className="text-neutral-medium">
                Раздел достижений будет доступен в следующей версии приложения.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Photo Dialog */}
      <AddPhotoForm 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />
    </div>
  );
};

export default Progress;
