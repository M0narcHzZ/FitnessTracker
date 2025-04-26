import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Measurement } from "@shared/schema";

const formSchema = z.object({
  category: z.string().optional(),
  notes: z.string().optional(),
  relatedMeasurementId: z.coerce.number().optional()
});

interface AddPhotoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddPhotoForm = ({ open, onOpenChange }: AddPhotoFormProps) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      notes: "",
      relatedMeasurementId: undefined
    }
  });
  
  const { data: measurements } = useQuery<Measurement[]>({
    queryKey: ["/api/measurements"],
    enabled: open // Only fetch when dialog is open
  });
  
  const resetForm = () => {
    form.reset();
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Выбранный файл:", file.name, "размер:", file.size, "тип:", file.type);
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Отправка данных формы:", Object.fromEntries(data.entries()));
      return await apiRequest("POST", "/api/progress-photos", data);
    },
    onSuccess: () => {
      toast({
        title: "Фото загружено",
        description: "Новое фото прогресса успешно загружено",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить фото",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedFile) {
      toast({
        title: "Выберите фото",
        description: "Необходимо выбрать фото для загрузки",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("photo", selectedFile);
    
    if (data.category) {
      formData.append("category", data.category);
    }
    
    if (data.notes) {
      formData.append("notes", data.notes);
    }
    
    // Проверяем, что relatedMeasurementId существует и не равно "none"
    if (data.relatedMeasurementId && data.relatedMeasurementId.toString() !== "none") {
      formData.append("relatedMeasurementId", data.relatedMeasurementId.toString());
    }
    
    uploadPhotoMutation.mutate(formData);
  };
  
  const categoryOptions = [
    { label: "Пресс", value: "Пресс" },
    { label: "Бицепс", value: "Бицепс" },
    { label: "Спина", value: "Спина" },
    { label: "Ноги", value: "Ноги" },
    { label: "Общее", value: "Общее" }
  ];
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Загрузить новое фото</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-neutral-lightest transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="relative mx-auto">
                <img
                  src={previewUrl}
                  alt="Превью фото"
                  className="max-h-48 mx-auto rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  Удалить
                </Button>
              </div>
            ) : (
              <div className="py-4">
                <span className="material-icons text-4xl text-neutral-medium">
                  add_a_photo
                </span>
                <p className="mt-2 text-neutral-medium">
                  Нажмите, чтобы выбрать фото или перетащите файл сюда
                </p>
              </div>
            )}
          </div>
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {categoryOptions.map((category) => (
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
              name="relatedMeasurementId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Связать с измерением</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите измерение (опционально)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Не связывать</SelectItem>
                      {measurements?.filter(m => m.type === form.watch("category") || !form.watch("category"))
                        .slice(0, 10)
                        .map((measurement) => (
                          <SelectItem key={measurement.id} value={measurement.id.toString()}>
                            {measurement.type} ({measurement.value} {measurement.unit}) - {new Date(measurement.date).toLocaleDateString()}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Добавьте заметки к фото (опционально)" {...field} />
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
                disabled={uploadPhotoMutation.isPending || !selectedFile}
              >
                {uploadPhotoMutation.isPending ? "Загрузка..." : "Загрузить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPhotoForm;
