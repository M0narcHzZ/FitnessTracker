import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as z from "zod";
import {
  insertMeasurementSchema,
  insertWorkoutProgramSchema,
  insertWorkoutExerciseSchema,
  insertProgressPhotoSchema,
  insertWorkoutLogSchema,
  insertExerciseLogSchema,
  insertExerciseSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup file upload storage
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `progress-photo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage2 });

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  // We're using express.static in index.ts instead

  // API Routes prefix
  const apiPrefix = '/api';

  // Measurements routes
  app.get(`${apiPrefix}/measurements`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      const type = req.query.type as string | undefined;
      const measurements = await storage.getMeasurementsWithChange(userId, type);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch measurements' });
    }
  });

  app.post(`${apiPrefix}/measurements`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      const validatedData = insertMeasurementSchema.parse({ ...req.body, userId });
      const measurement = await storage.createMeasurement(validatedData);
      res.status(201).json(measurement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid measurement data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create measurement' });
      }
    }
  });

  app.put(`${apiPrefix}/measurements/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const measurement = await storage.getMeasurement(id);
      
      if (!measurement) {
        return res.status(404).json({ message: 'Measurement not found' });
      }
      
      const validatedData = insertMeasurementSchema.partial().parse(req.body);
      const updatedMeasurement = await storage.updateMeasurement(id, validatedData);
      res.json(updatedMeasurement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid measurement data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update measurement' });
      }
    }
  });

  app.delete(`${apiPrefix}/measurements/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMeasurement(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Measurement not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete measurement' });
    }
  });

  // Exercises routes
  app.get(`${apiPrefix}/exercises`, async (req: Request, res: Response) => {
    try {
      const exercises = await storage.getExercises();
      res.json(exercises);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch exercises' });
    }
  });
  
  app.post(`${apiPrefix}/exercises`, async (req: Request, res: Response) => {
    try {
      const validatedData = insertExerciseSchema.parse(req.body);
      const exercise = await storage.createExercise(validatedData);
      res.status(201).json(exercise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid exercise data', errors: error.errors });
      } else {
        console.error("Error creating exercise:", error);
        res.status(500).json({ message: 'Failed to create exercise' });
      }
    }
  });
  
  app.put(`${apiPrefix}/exercises/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid exercise ID' });
      }
      
      // Найти упражнение прежде чем обновлять
      const existingExercise = await storage.getExercise(id);
      if (!existingExercise) {
        return res.status(404).json({ message: 'Exercise not found' });
      }
      
      // Обновить только указанные поля
      const updatedExercise = await storage.updateExercise(id, req.body);
      if (updatedExercise) {
        res.status(200).json(updatedExercise);
      } else {
        res.status(404).json({ message: 'Exercise not found or could not be updated' });
      }
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ message: 'Failed to update exercise' });
    }
  });

  // Workout Program routes
  app.get(`${apiPrefix}/workout-programs`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      // Получаем программы с упражнениями вместо простого списка программ
      const programPromises = (await storage.getWorkoutPrograms(userId)).map(async program => {
        return await storage.getWorkoutProgramWithExercises(program.id);
      });
      
      const programs = await Promise.all(programPromises);
      
      // Fix field names: transform snake_case to camelCase for client
      const transformedPrograms = programs.map(program => {
        return {
          id: program.id,
          userId: program.userId || program.user_id,
          name: program.name,
          description: program.description,
          colorScheme: program.colorScheme || program.color_scheme,
          estimatedDuration: program.estimatedDuration || program.estimated_duration,
          exercises: program.exercises
        };
      });
      
      res.json(transformedPrograms);
    } catch (error) {
      console.error("Error getting workout programs with exercises:", error);
      res.status(500).json({ message: 'Failed to fetch workout programs' });
    }
  });

  app.get(`${apiPrefix}/workout-programs/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getWorkoutProgramWithExercises(id);
      
      if (!program) {
        return res.status(404).json({ message: 'Workout program not found' });
      }
      
      // Fix field names: transform snake_case to camelCase for client
      const transformedProgram = {
        id: program.id,
        userId: program.userId || program.user_id,
        name: program.name,
        description: program.description,
        colorScheme: program.colorScheme || program.color_scheme,
        estimatedDuration: program.estimatedDuration || program.estimated_duration,
        exercises: program.exercises
      };
      
      res.json(transformedProgram);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch workout program' });
    }
  });

  app.post(`${apiPrefix}/workout-programs`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      const validatedData = insertWorkoutProgramSchema.parse({ ...req.body, userId });
      const program = await storage.createWorkoutProgram(validatedData);
      
      // Transform to camelCase before returning to client
      const transformedProgram = {
        id: program.id,
        userId: program.userId || program.user_id,
        name: program.name,
        description: program.description,
        colorScheme: program.colorScheme || program.color_scheme,
        estimatedDuration: program.estimatedDuration || program.estimated_duration
      };
      
      res.status(201).json(transformedProgram);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid workout program data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create workout program' });
      }
    }
  });

  app.put(`${apiPrefix}/workout-programs/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getWorkoutProgram(id);
      
      if (!program) {
        return res.status(404).json({ message: 'Workout program not found' });
      }
      
      const validatedData = insertWorkoutProgramSchema.partial().parse(req.body);
      const updatedProgram = await storage.updateWorkoutProgram(id, validatedData);
      
      // Transform to camelCase before returning to client
      const transformedProgram = {
        id: updatedProgram.id,
        userId: updatedProgram.userId || updatedProgram.user_id,
        name: updatedProgram.name,
        description: updatedProgram.description,
        colorScheme: updatedProgram.colorScheme || updatedProgram.color_scheme,
        estimatedDuration: updatedProgram.estimatedDuration || updatedProgram.estimated_duration
      };
      
      res.json(transformedProgram);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid workout program data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update workout program' });
      }
    }
  });

  app.delete(`${apiPrefix}/workout-programs/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWorkoutProgram(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Workout program not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete workout program' });
    }
  });

  // Workout Exercise routes
  app.post(`${apiPrefix}/workout-exercises`, async (req: Request, res: Response) => {
    try {
      console.log("Received workout exercise data:", req.body);
      
      // Проверяем наличие необходимых полей в запросе
      // Клиент может отправлять поля в snake_case (workout_program_id) или в camelCase (workoutProgramId)
      const workoutProgramId = req.body.workout_program_id || req.body.workoutProgramId;
      const exerciseId = req.body.exercise_id || req.body.exerciseId;
      const order = req.body.order;
      
      if (!workoutProgramId) {
        console.error("Missing workout_program_id in request");
        return res.status(400).json({ 
          message: 'Invalid workout exercise data: missing workout_program_id'
        });
      }
      
      if (!exerciseId) {
        console.error("Missing exercise_id in request");
        return res.status(400).json({ 
          message: 'Invalid workout exercise data: missing exercise_id'
        });
      }
      
      // Создаем объект с правильными именами полей для storage
      const exerciseData = {
        workoutProgramId: parseInt(workoutProgramId),
        exerciseId: parseInt(exerciseId),
        sequence: parseInt(order || 0), // Важно: хотя в БД поле называется order, интерфейс IStorage ожидает поле sequence
      };
      
      // Добавляем опциональные поля, если они существуют в запросе
      if (req.body.sets !== undefined) {
        exerciseData['sets'] = parseInt(req.body.sets);
      }
      
      if (req.body.reps !== undefined && req.body.reps !== null) {
        exerciseData['reps'] = parseInt(req.body.reps);
      }
      
      if (req.body.duration !== undefined && req.body.duration !== null) {
        exerciseData['duration'] = req.body.duration;
      }
      
      console.log("Validated data for insertion:", exerciseData);
      
      const workoutExercise = await storage.addExerciseToWorkout(exerciseData);
      console.log("Exercise added successfully:", workoutExercise);
      res.status(201).json(workoutExercise);
    } catch (error) {
      console.error("Error adding exercise to workout:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid workout exercise data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to add exercise to workout' });
      }
    }
  });

  app.put(`${apiPrefix}/workout-exercises/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWorkoutExerciseSchema.partial().parse(req.body);
      const updatedWorkoutExercise = await storage.updateWorkoutExercise(id, validatedData);
      
      if (!updatedWorkoutExercise) {
        return res.status(404).json({ message: 'Workout exercise not found' });
      }
      
      res.json(updatedWorkoutExercise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid workout exercise data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update workout exercise' });
      }
    }
  });

  app.delete(`${apiPrefix}/workout-exercises/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.removeExerciseFromWorkout(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Workout exercise not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove exercise from workout' });
    }
  });

  // Progress Photo routes
  app.get(`${apiPrefix}/progress-photos`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      const category = req.query.category as string | undefined;
      const photos = await storage.getProgressPhotos(userId, category);
      
      // Преобразуем snake_case в camelCase для клиента
      const transformedPhotos = photos.map(photo => ({
        id: photo.id,
        userId: photo.user_id,
        photoUrl: photo.photo_url,
        category: photo.category,
        date: photo.date,
        notes: photo.notes,
        relatedMeasurementId: photo.related_measurement_id
      }));
      
      res.json(transformedPhotos);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch progress photos' });
    }
  });

  app.post(`${apiPrefix}/progress-photos`, upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      
      console.log("Received photo form data:", req.body);
      
      if (!req.file) {
        console.error("No file was uploaded");
        return res.status(400).json({ message: 'No photo provided' });
      }
      
      console.log("Received file:", req.file);
      
      const photoUrl = `/uploads/${req.file.filename}`;
      
      // Правильно обрабатываем relatedMeasurementId
      let formData = { ...req.body };
      if (formData.relatedMeasurementId === "none" || formData.relatedMeasurementId === "") {
        formData.relatedMeasurementId = null;
      }
      
      console.log("Processed form data:", formData);
      
      // Сначала валидируем данные через схему
      const validatedData = insertProgressPhotoSchema.parse({
        ...formData,
        userId,
        photoUrl,
        date: new Date()
      });
      
      console.log("Validated data:", validatedData);
      
      // Создаем объект для вставки в базу данных,
      // преобразуя Date в строку формата ISO для совместимости с SQLite
      const dataForDb = {
        ...validatedData,
        date: validatedData.date.toISOString()
      };
      
      console.log("Data for DB:", dataForDb);
      
      try {
        const photo = await storage.createProgressPhoto(dataForDb);
        console.log("Photo saved successfully:", photo);
        
        // Преобразуем snake_case в camelCase для клиента
        const transformedPhoto = {
          id: photo.id,
          userId: photo.user_id,
          photoUrl: photo.photo_url,
          category: photo.category,
          date: photo.date,
          notes: photo.notes,
          relatedMeasurementId: photo.related_measurement_id
        };
        
        res.status(201).json(transformedPhoto);
      } catch (dbError) {
        console.error("Error creating progress photo:", dbError);
        res.status(500).json({ message: 'Failed to save photo to database' });
      }
    } catch (error) {
      console.error("Error details:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: 'Invalid progress photo data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create progress photo' });
      }
    }
  });

  app.delete(`${apiPrefix}/progress-photos/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const photo = await storage.getProgressPhoto(id);
      
      if (!photo) {
        return res.status(404).json({ message: 'Progress photo not found' });
      }
      
      // Delete the file
      const filePath = path.join(process.cwd(), photo.photo_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      const deleted = await storage.deleteProgressPhoto(id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete progress photo' });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete progress photo' });
    }
  });

  // Workout Log routes
  app.get(`${apiPrefix}/workout-logs`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      const logs = await storage.getWorkoutLogs(userId);
      
      // Преобразуем данные для клиента
      const transformedLogs = logs.map(log => {
        // Если name не указано, добавим "Тренировка" по умолчанию
        return {
          id: log.id,
          userId: log.user_id,
          workoutProgramId: log.workout_program_id,
          date: log.date,
          completed: log.completed,
          name: log.name || "Тренировка"
        };
      });
      
      res.json(transformedLogs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch workout logs' });
    }
  });
  
  // Добавляем маршрут для получения конкретного лога тренировки
  app.get(`${apiPrefix}/workout-logs/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const log = await storage.getWorkoutLog(id);
      
      if (!log) {
        return res.status(404).json({ message: 'Workout log not found' });
      }
      
      // Получаем дополнительную информацию о тренировке
      const program = log.workout_program_id ? 
        await storage.getWorkoutProgram(log.workout_program_id) : null;
      
      // Преобразуем данные для клиента
      const transformedLog = {
        id: log.id,
        userId: log.user_id,
        workoutProgramId: log.workout_program_id,
        date: log.date,
        completed: log.completed,
        name: log.name || (program ? program.name : "Тренировка")
      };
      
      res.json(transformedLog);
    } catch (error) {
      console.error("Error getting workout log:", error);
      res.status(500).json({ message: 'Failed to fetch workout log' });
    }
  });

  app.post(`${apiPrefix}/workout-logs`, async (req: Request, res: Response) => {
    try {
      const userId = 1; // For demo, we'll use the test user
      
      // Для отладки
      console.log("Создание лога тренировки, полученные данные:", req.body);
      
      // Поскольку мы изменили схему, date теперь может быть строкой ISO
      // и она необязательна (может быть undefined)
      const validatedData = insertWorkoutLogSchema.parse({ ...req.body, userId });
      
      console.log("Валидированные данные:", validatedData);
      
      const log = await storage.createWorkoutLog(validatedData);
      console.log("Созданный лог тренировки:", log);
      
      res.status(201).json(log);
    } catch (error) {
      console.error("Ошибка создания лога тренировки:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid workout log data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create workout log' });
      }
    }
  });

  app.put(`${apiPrefix}/workout-logs/:id/complete`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const log = await storage.completeWorkoutLog(id);
      
      if (!log) {
        return res.status(404).json({ message: 'Workout log not found' });
      }
      
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: 'Failed to complete workout log' });
    }
  });

  // Exercise Log routes
  app.get(`${apiPrefix}/workout-logs/:workoutLogId/exercise-logs`, async (req: Request, res: Response) => {
    try {
      const workoutLogId = parseInt(req.params.workoutLogId);
      const logs = await storage.getExerciseLogs(workoutLogId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch exercise logs' });
    }
  });

  app.post(`${apiPrefix}/exercise-logs`, async (req: Request, res: Response) => {
    try {
      const validatedData = insertExerciseLogSchema.parse(req.body);
      const log = await storage.createExerciseLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid exercise log data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create exercise log' });
      }
    }
  });

  app.put(`${apiPrefix}/exercise-logs/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertExerciseLogSchema.partial().parse(req.body);
      const updatedLog = await storage.updateExerciseLog(id, validatedData);
      
      if (!updatedLog) {
        return res.status(404).json({ message: 'Exercise log not found' });
      }
      
      res.json(updatedLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid exercise log data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update exercise log' });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


