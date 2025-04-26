import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressPhoto } from "@shared/schema";
import { format } from "date-fns";

const ProgressPhotoGrid = ({ limit = 3 }: { limit?: number }) => {
  const { data: photos, isLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ["/api/progress-photos"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[...Array(limit)].map((_, index) => (
          <div key={index} className="relative aspect-square bg-neutral-light rounded-lg overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-md mb-8">
        <span className="material-icons text-4xl text-neutral-medium mb-2">
          photo_library
        </span>
        <p className="text-neutral-medium">
          У вас пока нет загруженных фото прогресса.
        </p>
      </div>
    );
  }

  // Take only the first 'limit' photos
  const limitedPhotos = photos.slice(0, limit);

  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {limitedPhotos.map((photo) => (
        <div key={photo.id} className="relative aspect-square bg-neutral-light rounded-lg overflow-hidden">
          <img 
            src={photo.photoUrl} 
            alt={`Фото прогресса от ${format(new Date(photo.date), 'dd.MM.yyyy')}`} 
            className="object-cover h-full w-full"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
            {format(new Date(photo.date), 'dd.MM.yyyy')}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressPhotoGrid;
