import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ru } from "date-fns/locale";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Форматирование даты в русском формате
export function formatDateToRu(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'd MMMM yyyy', { locale: ru });
}

// Форматирование времени в читабельном виде
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} сек`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes} мин ${remainingSeconds} сек` 
      : `${minutes} мин`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0 || remainingSeconds > 0) {
    return `${hours} ч ${remainingMinutes > 0 ? `${remainingMinutes} мин` : ''}`;
  }
  
  return `${hours} ч`;
}

// Функция для генерации цветового класса на основе строки
export function getColorClass(colorScheme: string | null): string {
  if (!colorScheme) return 'bg-primary';
  
  const colorMap: Record<string, string> = {
    'red': 'bg-red-500',
    'blue': 'bg-blue-500',
    'green': 'bg-green-500',
    'purple': 'bg-purple-500',
    'orange': 'bg-orange-500',
    'pink': 'bg-pink-500',
    'teal': 'bg-teal-500',
    'yellow': 'bg-yellow-500',
    'indigo': 'bg-indigo-500',
    'gray': 'bg-gray-500'
  };
  
  return colorMap[colorScheme.toLowerCase()] || 'bg-primary';
}

// Функция для получения текстового класса на основе цветовой схемы
export function getTextClass(colorScheme: string | null): string {
  if (!colorScheme) return 'text-primary';
  
  const textMap: Record<string, string> = {
    'red': 'text-red-500',
    'blue': 'text-blue-500',
    'green': 'text-green-500',
    'purple': 'text-purple-500',
    'orange': 'text-orange-500',
    'pink': 'text-pink-500',
    'teal': 'text-teal-500',
    'yellow': 'text-yellow-500',
    'indigo': 'text-indigo-500',
    'gray': 'text-gray-500'
  };
  
  return textMap[colorScheme.toLowerCase()] || 'text-primary';
}

// Функция для получения фонового класса (светлый тон) на основе цветовой схемы
export function getLightBgClass(colorScheme: string | null): string {
  if (!colorScheme) return 'bg-primary-light';
  
  const bgMap: Record<string, string> = {
    'red': 'bg-red-50',
    'blue': 'bg-blue-50',
    'green': 'bg-green-50',
    'purple': 'bg-purple-50',
    'orange': 'bg-orange-50',
    'pink': 'bg-pink-50',
    'teal': 'bg-teal-50',
    'yellow': 'bg-yellow-50',
    'indigo': 'bg-indigo-50',
    'gray': 'bg-gray-50'
  };
  
  return bgMap[colorScheme.toLowerCase()] || 'bg-primary-light';
}

// Функция для получения бордера на основе цветовой схемы
export function getBorderClass(colorScheme: string | null): string {
  if (!colorScheme) return 'border-primary';
  
  const borderMap: Record<string, string> = {
    'red': 'border-red-500',
    'blue': 'border-blue-500',
    'green': 'border-green-500',
    'purple': 'border-purple-500',
    'orange': 'border-orange-500',
    'pink': 'border-pink-500',
    'teal': 'border-teal-500',
    'yellow': 'border-yellow-500',
    'indigo': 'border-indigo-500',
    'gray': 'border-gray-500'
  };
  
  return borderMap[colorScheme.toLowerCase()] || 'border-primary';
}