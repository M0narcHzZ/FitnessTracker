import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const formSchema = z.object({
  type: z.string().min(1, { message: "Выберите тип измерения" }),
  value: z.coerce.number().positive({ message: "Значение должно быть положительным" }),
  unit: z.string().min(1, { message: "Выберите единицу измерения" })
});

interface AddMeasurementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddMeasurementForm = ({ open, onOpenChange }: AddMeasurementFormProps) => {
  const { toast } = useToast();
  const [isCustomType, setIsCustomType] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "",
      value: 0,
      unit: ""
    }
  });
  
  const measurementTypes = [
    { label: "Бицепс", value: "Бицепс", unit: "см" },
    { label: "Грудь", value: "Грудь", unit: "см" },
    { label: "Талия", value: "Талия", unit: "см" },
    { label: "Бедра", value: "Бедра", unit: "см" },
    { label: "Вес", value: "Вес", unit: "кг" },
    { label: "Подтягивания", value: "Подтягивания", unit: "повт." },
    { label: "Отжимания", value: "Отжимания", unit: "повт." },
    { label: "Приседания", value: "Приседания", unit: "повт." },
    { label: "Жим лежа", value: "Жим лежа", unit: "кг" },
    { label: "Другое...", value: "custom", unit: "" }
  ];
  
  const resetForm = () => {
    form.reset();
    setIsCustomType(false);
  };
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);
  
  // Handle type selection to set default unit
  useEffect(() => {
    const type = form.watch("type");
    const selectedType = measurementTypes.find(t => t.value === type);
    
    if (selectedType && selectedType.value !== "custom") {
      form.setValue("unit", selectedType.unit);
      setIsCustomType(false);
    } else if (type === "custom") {
      form.setValue("type", "");
      form.setValue("unit", "");
      setIsCustomType(true);
    }
  }, [form.watch("type")]);
  
  const createMeasurementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/measurements", data);
    },
    onSuccess: () => {
      toast({
        title: "Измерение добавлено",
        description: "Новое измерение успешно записано",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить измерение",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMeasurementMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить измерение</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип измерения</FormLabel>
                  {isCustomType ? (
                    <FormControl>
                      <Input placeholder="Введите свой тип" {...field} />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип измерения" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {measurementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Значение</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Единица измерения</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="кг, см, повт., и т.д." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Отмена</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={createMeasurementMutation.isPending}
              >
                {createMeasurementMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMeasurementForm;
