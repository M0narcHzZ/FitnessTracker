import React from "react";
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

const exerciseSchema = z.object({
  name: z.string().min(1, { message: "Введите название упражнения" }),
  category: z.string().min(1, { message: "Выберите категорию" }),
  description: z.string().optional(),
});

const exerciseCategories = [
  { label: "Верх тела", value: "Верх тела" },
  { label: "Нижняя часть тела", value: "Нижняя часть тела" },
  { label: "Кардио", value: "Кардио" },
  { label: "Пресс", value: "Пресс" },
  { label: "Растяжка", value: "Растяжка" },
];

interface AddExerciseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddExerciseForm = ({ open, onOpenChange, onSuccess }: AddExerciseFormProps) => {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof exerciseSchema>>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
    },
  });
  
  const createExerciseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof exerciseSchema>) => {
      return await apiRequest("POST", "/api/exercises", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Упражнение создано",
        description: "Новое упражнение успешно добавлено",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      form.reset();
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать упражнение",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof exerciseSchema>) => {
    createExerciseMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать новое упражнение</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Отжимания" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exerciseCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (необязательно)</FormLabel>
                  <FormControl>
                    <Input placeholder="Описание техники выполнения" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Отмена</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={createExerciseMutation.isPending}
              >
                {createExerciseMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExerciseForm;