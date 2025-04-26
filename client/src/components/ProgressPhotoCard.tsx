import { ProgressPhoto } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, ZoomIn } from "lucide-react";

interface ProgressPhotoCardProps {
  photo: ProgressPhoto;
  measurement?: { type: string; value: number; unit: string };
}

const ProgressPhotoCard = ({ photo, measurement }: ProgressPhotoCardProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/progress-photos/${photo.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
      toast({
        title: "Фото удалено",
        description: "Фото прогресса было успешно удалено",
      });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить фото прогресса",
        variant: "destructive",
      });
    }
  });
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="aspect-square bg-neutral-light relative group">
          <img 
            src={photo.photoUrl} 
            alt={`Фото прогресса от ${format(new Date(photo.date), 'dd.MM.yyyy')}`} 
            className="object-cover h-full w-full"
          />
          
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1">
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 bg-black bg-opacity-50 rounded-full"
              onClick={() => setShowPreviewDialog(true)}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 bg-black bg-opacity-50 rounded-full ml-1"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {format(new Date(photo.date), 'dd.MM.yyyy')}
            </span>
            <span className="text-xs bg-primary-light px-2 py-0.5 rounded-full">
              {photo.category || 'Общее'}
            </span>
          </div>
          {measurement && (
            <p className="text-xs text-neutral-medium mt-1">
              {measurement.type}: {measurement.value} {measurement.unit}
            </p>
          )}
        </div>
      </div>
      
      {/* Photo Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Фото от {format(new Date(photo.date), 'dd.MM.yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center">
            <img 
              src={photo.photoUrl} 
              alt={`Фото прогресса от ${format(new Date(photo.date), 'dd.MM.yyyy')}`} 
              className="max-h-[70vh] object-contain"
            />
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div>
              <span className="text-sm font-medium mr-2">Категория:</span>
              <span className="text-sm bg-primary-light px-2 py-0.5 rounded-full">
                {photo.category || 'Общее'}
              </span>
            </div>
            {measurement && (
              <p className="text-sm">
                {measurement.type}: <strong>{measurement.value} {measurement.unit}</strong>
              </p>
            )}
          </div>
          
          {photo.notes && (
            <div className="mt-2">
              <p className="text-sm text-neutral-medium">{photo.notes}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить фото</DialogTitle>
          </DialogHeader>
          <p>
            Вы уверены, что хотите удалить это фото прогресса? Это действие нельзя отменить.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletePhotoMutation.mutate()}
              disabled={deletePhotoMutation.isPending}
            >
              {deletePhotoMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProgressPhotoCard;
