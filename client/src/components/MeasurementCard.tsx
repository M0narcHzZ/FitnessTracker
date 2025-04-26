import { useState } from "react";
import { Measurement, MeasurementWithChange } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

interface MeasurementCardProps {
  measurements: MeasurementWithChange[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<Measurement>) => void;
}

const MeasurementCard = ({ measurements, isLoading, onDelete, onUpdate }: MeasurementCardProps) => {
  const { toast } = useToast();
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null);
  
  const updateSchema = z.object({
    value: z.coerce.number().positive({ message: "Значение должно быть положительным" })
  });
  
  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      value: editMeasurement?.value || 0
    }
  });
  
  // Reset form when measurement changes
  if (editMeasurement && editMeasurement.value !== form.getValues().value) {
    form.reset({ value: editMeasurement.value });
  }
  
  const onSubmit = (data: z.infer<typeof updateSchema>) => {
    if (editMeasurement) {
      onUpdate(editMeasurement.id, data);
      setEditMeasurement(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <div className="flex items-center">
            <Skeleton className="h-8 w-8 mr-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        
        <div className="mt-4">
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    );
  }
  
  if (!measurements || measurements.length === 0) {
    return null;
  }
  
  const type = measurements[0].type;
  const unit = measurements[0].unit;
  
  const chartData = measurements
    .slice()
    .reverse()
    .map(measurement => ({
      date: format(new Date(measurement.date), 'dd.MM'),
      value: measurement.value
    }));
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{type}</h3>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="p-1 text-primary"
            size="icon"
            onClick={() => setEditMeasurement(measurements[0])}
          >
            <span className="material-icons text-sm">edit</span>
          </Button>
          <Button 
            variant="ghost" 
            className="p-1 text-destructive"
            size="icon"
            onClick={() => {
              if (measurements.length > 0) {
                onDelete(measurements[0].id);
              }
            }}
          >
            <span className="material-icons text-sm">delete</span>
          </Button>
        </div>
      </div>
      
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-neutral-medium">
              <th className="text-left pb-2">Дата</th>
              <th className="text-right pb-2">Значение</th>
              <th className="text-right pb-2">Изменение</th>
            </tr>
          </thead>
          <tbody>
            {measurements.slice(0, 3).map((measurement) => (
              <tr key={measurement.id}>
                <td className="py-1">{format(new Date(measurement.date), 'dd.MM.yyyy')}</td>
                <td className="text-right">{measurement.value} {unit}</td>
                <td className="text-right">
                  {measurement.change !== undefined ? (
                    <span className={
                      type === 'Вес' 
                        ? measurement.change < 0 ? 'text-success' : 'text-destructive'
                        : measurement.change > 0 ? 'text-success' : 'text-destructive'
                    }>
                      {measurement.change > 0 ? '+' : ''}{measurement.change} {unit}
                    </span>
                  ) : (
                    <span className="text-neutral-medium">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="h-24 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip formatter={(value) => [`${value} ${unit}`, type]} />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={!!editMeasurement} onOpenChange={(open) => !open && setEditMeasurement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить измерение</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Значение ({unit})</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.1" />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Отмена</Button>
                </DialogClose>
                <Button type="submit">Сохранить</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeasurementCard;
