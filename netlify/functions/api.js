const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { SQLiteStorage } = require('../../server/sqlite-storage');

// Инициализация хранилища
const storage = new SQLiteStorage();

// Создание Express приложения
const app = express();
const apiPrefix = '/api';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join('/tmp/uploads');
      
      // Создание директории, если не существует
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

// Хелпер для преобразования snake_case в camelCase
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

// Хелпер для преобразования объекта с snake_case в camelCase
const transformToCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  
  const newObj = {};
  
  Object.keys(obj).forEach(key => {
    const camelKey = toCamelCase(key);
    const value = obj[key];
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      newObj[camelKey] = transformToCamelCase(value);
    } else if (Array.isArray(value)) {
      newObj[camelKey] = value.map(item => {
        if (item && typeof item === 'object') {
          return transformToCamelCase(item);
        }
        return item;
      });
    } else {
      newObj[camelKey] = value;
    }
  });
  
  return newObj;
};

// Регистрация маршрутов API

// Измерения
app.get(`${apiPrefix}/measurements`, async (req, res) => {
  try {
    const { type } = req.query;
    const userId = 1; // Hard-coded для одного пользователя
    
    const measurements = await storage.getMeasurementsWithChange(userId, type);
    res.json(measurements.map(transformToCamelCase));
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({ error: 'Не удалось получить измерения' });
  }
});

app.post(`${apiPrefix}/measurements`, async (req, res) => {
  try {
    const userId = 1; // Hard-coded для одного пользователя
    const measurementData = { ...req.body, userId };
    
    const measurement = await storage.createMeasurement(measurementData);
    res.status(201).json(transformToCamelCase(measurement));
  } catch (error) {
    console.error('Error creating measurement:', error);
    res.status(500).json({ error: 'Не удалось создать измерение' });
  }
});

app.put(`${apiPrefix}/measurements/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const measurementData = req.body;
    
    const measurement = await storage.updateMeasurement(parseInt(id), measurementData);
    if (!measurement) {
      return res.status(404).json({ error: 'Измерение не найдено' });
    }
    
    res.json(transformToCamelCase(measurement));
  } catch (error) {
    console.error('Error updating measurement:', error);
    res.status(500).json({ error: 'Не удалось обновить измерение' });
  }
});

app.delete(`${apiPrefix}/measurements/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteMeasurement(parseInt(id));
    if (!success) {
      return res.status(404).json({ error: 'Измерение не найдено' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting measurement:', error);
    res.status(500).json({ error: 'Не удалось удалить измерение' });
  }
});

// Упражнения
app.get(`${apiPrefix}/exercises`, async (req, res) => {
  try {
    const exercises = await storage.getExercises();
    res.json(exercises.map(transformToCamelCase));
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Не удалось получить упражнения' });
  }
});

app.post(`${apiPrefix}/exercises`, async (req, res) => {
  try {
    const exerciseData = req.body;
    
    const exercise = await storage.createExercise(exerciseData);
    res.status(201).json(transformToCamelCase(exercise));
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Не удалось создать упражнение' });
  }
});

app.put(`${apiPrefix}/exercises/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const exerciseData = req.body;
    
    const exercise = await storage.updateExercise(parseInt(id), exerciseData);
    if (!exercise) {
      return res.status(404).json({ error: 'Упражнение не найдено' });
    }
    
    res.json(transformToCamelCase(exercise));
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Не удалось обновить упражнение' });
  }
});

// Программы тренировок
app.get(`${apiPrefix}/workout-programs`, async (req, res) => {
  try {
    const userId = 1; // Hard-coded для одного пользователя
    
    const programs = await storage.getWorkoutPrograms(userId);
    res.json(programs.map(transformToCamelCase));
  } catch (error) {
    console.error('Error fetching workout programs:', error);
    res.status(500).json({ error: 'Не удалось получить программы тренировок' });
  }
});

app.get(`${apiPrefix}/workout-programs/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    
    const program = await storage.getWorkoutProgramWithExercises(parseInt(id));
    if (!program) {
      return res.status(404).json({ error: 'Программа тренировки не найдена' });
    }
    
    res.json(transformToCamelCase(program));
  } catch (error) {
    console.error('Error fetching workout program:', error);
    res.status(500).json({ error: 'Не удалось получить программу тренировки' });
  }
});

app.post(`${apiPrefix}/workout-programs`, async (req, res) => {
  try {
    const userId = 1; // Hard-coded для одного пользователя
    const programData = { ...req.body, userId };
    
    const program = await storage.createWorkoutProgram(programData);
    res.status(201).json(transformToCamelCase(program));
  } catch (error) {
    console.error('Error creating workout program:', error);
    res.status(500).json({ error: 'Не удалось создать программу тренировки' });
  }
});

app.put(`${apiPrefix}/workout-programs/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const programData = req.body;
    
    const program = await storage.updateWorkoutProgram(parseInt(id), programData);
    if (!program) {
      return res.status(404).json({ error: 'Программа тренировки не найдена' });
    }
    
    res.json(transformToCamelCase(program));
  } catch (error) {
    console.error('Error updating workout program:', error);
    res.status(500).json({ error: 'Не удалось обновить программу тренировки' });
  }
});

app.delete(`${apiPrefix}/workout-programs/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteWorkoutProgram(parseInt(id));
    if (!success) {
      return res.status(404).json({ error: 'Программа тренировки не найдена' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workout program:', error);
    res.status(500).json({ error: 'Не удалось удалить программу тренировки' });
  }
});

// Упражнения в программе тренировок
app.post(`${apiPrefix}/workout-exercises`, async (req, res) => {
  try {
    console.log('Received workout exercise data:', req.body);
    
    // Преобразование order в sequence, если требуется
    let workoutExerciseData = { ...req.body };
    if ('order' in workoutExerciseData && !('sequence' in workoutExerciseData)) {
      workoutExerciseData.sequence = workoutExerciseData.order;
    }
    
    console.log('Validated data for insertion:', workoutExerciseData);
    
    const workoutExercise = await storage.addExerciseToWorkout(workoutExerciseData);
    res.status(201).json(transformToCamelCase(workoutExercise));
  } catch (error) {
    console.error('Error adding exercise to workout program:', error);
    res.status(500).json({ error: 'Не удалось добавить упражнение в программу тренировки' });
  }
});

app.put(`${apiPrefix}/workout-exercises/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const exerciseData = req.body;
    
    const workoutExercise = await storage.updateWorkoutExercise(parseInt(id), exerciseData);
    if (!workoutExercise) {
      return res.status(404).json({ error: 'Упражнение в программе тренировки не найдено' });
    }
    
    res.json(transformToCamelCase(workoutExercise));
  } catch (error) {
    console.error('Error updating exercise in workout program:', error);
    res.status(500).json({ error: 'Не удалось обновить упражнение в программе тренировки' });
  }
});

app.delete(`${apiPrefix}/workout-exercises/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.removeExerciseFromWorkout(parseInt(id));
    if (!success) {
      return res.status(404).json({ error: 'Упражнение в программе тренировки не найдено' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing exercise from workout program:', error);
    res.status(500).json({ error: 'Не удалось удалить упражнение из программы тренировки' });
  }
});

// Фотографии прогресса
app.get(`${apiPrefix}/progress-photos`, async (req, res) => {
  try {
    const { category } = req.query;
    const userId = 1; // Hard-coded для одного пользователя
    
    const photos = await storage.getProgressPhotos(userId, category);
    res.json(photos.map(photo => {
      const transformed = transformToCamelCase(photo);
      // Преобразование URL фотографии для фронтенда
      transformed.photoUrl = `${apiPrefix}/uploads/${path.basename(transformed.photoUrl)}`;
      return transformed;
    }));
  } catch (error) {
    console.error('Error fetching progress photos:', error);
    res.status(500).json({ error: 'Не удалось получить фотографии прогресса' });
  }
});

app.post(`${apiPrefix}/progress-photos`, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }
    
    const userId = 1; // Hard-coded для одного пользователя
    const photoData = {
      ...req.body,
      userId,
      photoUrl: req.file.path,
      date: new Date(req.body.date || new Date())
    };
    
    const photo = await storage.createProgressPhoto(photoData);
    const transformedPhoto = transformToCamelCase(photo);
    transformedPhoto.photoUrl = `${apiPrefix}/uploads/${path.basename(transformedPhoto.photoUrl)}`;
    
    res.status(201).json(transformedPhoto);
  } catch (error) {
    console.error('Error uploading progress photo:', error);
    res.status(500).json({ error: 'Не удалось загрузить фотографию прогресса' });
  }
});

app.delete(`${apiPrefix}/progress-photos/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Сначала получаем фото, чтобы удалить файл
    const photo = await storage.getProgressPhoto(parseInt(id));
    if (!photo) {
      return res.status(404).json({ error: 'Фотография прогресса не найдена' });
    }
    
    // Удаляем файл
    try {
      fs.unlinkSync(photo.photoUrl);
    } catch (err) {
      console.error('Error deleting photo file:', err);
      // Продолжаем выполнение даже если файл не удалось удалить
    }
    
    // Удаляем запись из БД
    const success = await storage.deleteProgressPhoto(parseInt(id));
    if (!success) {
      return res.status(404).json({ error: 'Фотография прогресса не найдена' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting progress photo:', error);
    res.status(500).json({ error: 'Не удалось удалить фотографию прогресса' });
  }
});

// Статические файлы для загруженных фотографий
app.use(`${apiPrefix}/uploads`, express.static('/tmp/uploads'));

// Логи тренировок
app.get(`${apiPrefix}/workout-logs`, async (req, res) => {
  try {
    const userId = 1; // Hard-coded для одного пользователя
    
    const logs = await storage.getWorkoutLogs(userId);
    res.json(logs.map(transformToCamelCase));
  } catch (error) {
    console.error('Error fetching workout logs:', error);
    res.status(500).json({ error: 'Не удалось получить логи тренировок' });
  }
});

app.get(`${apiPrefix}/workout-logs/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await storage.getWorkoutLog(parseInt(id));
    if (!log) {
      return res.status(404).json({ error: 'Лог тренировки не найден' });
    }
    
    res.json(transformToCamelCase(log));
  } catch (error) {
    console.error('Error fetching workout log:', error);
    res.status(500).json({ error: 'Не удалось получить лог тренировки' });
  }
});

app.post(`${apiPrefix}/workout-logs`, async (req, res) => {
  try {
    const userId = 1; // Hard-coded для одного пользователя
    const logData = { ...req.body, userId };
    
    console.log('Создание лога тренировки, полученные данные:', req.body);
    console.log('Валидированные данные:', logData);
    
    const log = await storage.createWorkoutLog(logData);
    res.status(201).json(transformToCamelCase(log));
  } catch (error) {
    console.error('Error creating workout log:', error);
    res.status(500).json({ error: 'Не удалось создать лог тренировки' });
  }
});

app.put(`${apiPrefix}/workout-logs/:id/complete`, async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await storage.completeWorkoutLog(parseInt(id));
    if (!log) {
      return res.status(404).json({ error: 'Лог тренировки не найден' });
    }
    
    res.json(transformToCamelCase(log));
  } catch (error) {
    console.error('Error completing workout log:', error);
    res.status(500).json({ error: 'Не удалось завершить тренировку' });
  }
});

// Логи упражнений
app.get(`${apiPrefix}/workout-logs/:workoutLogId/exercise-logs`, async (req, res) => {
  try {
    const { workoutLogId } = req.params;
    
    const exerciseLogs = await storage.getExerciseLogs(parseInt(workoutLogId));
    res.json(exerciseLogs.map(transformToCamelCase));
  } catch (error) {
    console.error('Error fetching exercise logs:', error);
    res.status(500).json({ error: 'Не удалось получить логи упражнений' });
  }
});

app.post(`${apiPrefix}/exercise-logs`, async (req, res) => {
  try {
    const logData = req.body;
    
    const log = await storage.createExerciseLog(logData);
    res.status(201).json(transformToCamelCase(log));
  } catch (error) {
    console.error('Error creating exercise log:', error);
    res.status(500).json({ error: 'Не удалось создать лог упражнения' });
  }
});

app.put(`${apiPrefix}/exercise-logs/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const logData = req.body;
    
    const log = await storage.updateExerciseLog(parseInt(id), logData);
    if (!log) {
      return res.status(404).json({ error: 'Лог упражнения не найден' });
    }
    
    res.json(transformToCamelCase(log));
  } catch (error) {
    console.error('Error updating exercise log:', error);
    res.status(500).json({ error: 'Не удалось обновить лог упражнения' });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Экспорт для netlify-lambda
module.exports.handler = serverless(app);