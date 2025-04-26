import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  User, InsertUser,
  Measurement, InsertMeasurement, MeasurementWithChange,
  Exercise, InsertExercise,
  WorkoutProgram, InsertWorkoutProgram, WorkoutProgramWithExercises,
  WorkoutExercise, InsertWorkoutExercise,
  WorkoutLog, InsertWorkoutLog,
  ExerciseLog, InsertExerciseLog,
  ProgressPhoto, InsertProgressPhoto,
  users, measurements, exercises, workoutPrograms, workoutExercises, workoutLogs, exerciseLogs, progressPhotos
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Пользователи
  async getUser(id: number): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.username, username));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const results = await db.insert(users).values(insertUser).returning();
      if (results.length === 0) {
        throw new Error("Failed to create user");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Измерения
  async getMeasurements(userId: number, type?: string): Promise<Measurement[]> {
    try {
      let query = db.select().from(measurements).where(eq(measurements.userId, userId));
      if (type) {
        query = query.where(eq(measurements.type, type));
      }
      return await query.orderBy(desc(measurements.date));
    } catch (error) {
      console.error("Error getting measurements:", error);
      throw error;
    }
  }

  async getMeasurement(id: number): Promise<Measurement | undefined> {
    try {
      const results = await db.select().from(measurements).where(eq(measurements.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting measurement:", error);
      throw error;
    }
  }

  async getMeasurementsWithChange(userId: number, type?: string): Promise<MeasurementWithChange[]> {
    try {
      const allMeasurements = await this.getMeasurements(userId, type);
      const measurementsByType: Record<string, Measurement[]> = {};
      
      // Группировка по типу измерения
      allMeasurements.forEach(m => {
        if (!measurementsByType[m.type]) {
          measurementsByType[m.type] = [];
        }
        measurementsByType[m.type].push(m);
      });
      
      const result: MeasurementWithChange[] = [];
      
      // Расчет изменений для каждого типа измерения
      Object.values(measurementsByType).forEach(measurements => {
        if (measurements.length === 0) return;
        
        // Сортировка по дате (от новых к старым)
        measurements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Расчет изменений
        measurements.forEach((measurement, index) => {
          const measurementWithChange: MeasurementWithChange = { ...measurement, change: undefined };
          
          if (index < measurements.length - 1) {
            const previousMeasurement = measurements[index + 1];
            measurementWithChange.change = measurement.value - previousMeasurement.value;
          }
          
          result.push(measurementWithChange);
        });
      });
      
      // Сортировка по дате (от новых к старым) всех измерений
      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error("Error getting measurements with change:", error);
      throw error;
    }
  }

  async createMeasurement(insertMeasurement: InsertMeasurement): Promise<Measurement> {
    try {
      const results = await db.insert(measurements).values(insertMeasurement).returning();
      if (results.length === 0) {
        throw new Error("Failed to create measurement");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating measurement:", error);
      throw error;
    }
  }

  async updateMeasurement(id: number, measurementUpdate: Partial<Measurement>): Promise<Measurement | undefined> {
    try {
      const results = await db.update(measurements)
        .set(measurementUpdate)
        .where(eq(measurements.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error updating measurement:", error);
      throw error;
    }
  }

  async deleteMeasurement(id: number): Promise<boolean> {
    try {
      const results = await db.delete(measurements)
        .where(eq(measurements.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error("Error deleting measurement:", error);
      throw error;
    }
  }

  // Упражнения
  async getExercises(): Promise<Exercise[]> {
    try {
      return await db.select().from(exercises).orderBy(exercises.name);
    } catch (error) {
      console.error("Error getting exercises:", error);
      throw error;
    }
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    try {
      const results = await db.select().from(exercises).where(eq(exercises.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting exercise:", error);
      throw error;
    }
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    try {
      const results = await db.insert(exercises).values(insertExercise).returning();
      if (results.length === 0) {
        throw new Error("Failed to create exercise");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating exercise:", error);
      throw error;
    }
  }

  // Программы тренировок
  async getWorkoutPrograms(userId: number): Promise<WorkoutProgram[]> {
    try {
      return await db.select().from(workoutPrograms)
        .where(eq(workoutPrograms.userId, userId))
        .orderBy(workoutPrograms.name);
    } catch (error) {
      console.error("Error getting workout programs:", error);
      throw error;
    }
  }

  async getWorkoutProgram(id: number): Promise<WorkoutProgram | undefined> {
    try {
      const results = await db.select().from(workoutPrograms).where(eq(workoutPrograms.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting workout program:", error);
      throw error;
    }
  }

  async getWorkoutProgramWithExercises(id: number): Promise<WorkoutProgramWithExercises | undefined> {
    try {
      const program = await this.getWorkoutProgram(id);
      if (!program) return undefined;
      
      const workoutExercisesData = await this.getWorkoutExercises(id);
      
      return {
        ...program,
        exercises: workoutExercisesData
      };
    } catch (error) {
      console.error("Error getting workout program with exercises:", error);
      throw error;
    }
  }

  async createWorkoutProgram(insertProgram: InsertWorkoutProgram): Promise<WorkoutProgram> {
    try {
      const results = await db.insert(workoutPrograms).values({
        ...insertProgram,
        description: insertProgram.description || null,
        colorScheme: insertProgram.colorScheme || "primary",
        estimatedDuration: insertProgram.estimatedDuration || null
      }).returning();
      
      if (results.length === 0) {
        throw new Error("Failed to create workout program");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating workout program:", error);
      throw error;
    }
  }

  async updateWorkoutProgram(id: number, programUpdate: Partial<WorkoutProgram>): Promise<WorkoutProgram | undefined> {
    try {
      const results = await db.update(workoutPrograms)
        .set(programUpdate)
        .where(eq(workoutPrograms.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error updating workout program:", error);
      throw error;
    }
  }

  async deleteWorkoutProgram(id: number): Promise<boolean> {
    try {
      // Сначала удаляем связанные упражнения
      await db.delete(workoutExercises)
        .where(eq(workoutExercises.workoutProgramId, id));
      
      // Затем удаляем саму программу
      const results = await db.delete(workoutPrograms)
        .where(eq(workoutPrograms.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error("Error deleting workout program:", error);
      throw error;
    }
  }

  // Упражнения в программе тренировок
  async getWorkoutExercises(workoutProgramId: number): Promise<(WorkoutExercise & { exercise: Exercise })[]> {
    try {
      const results = await db.select({
        ...workoutExercises,
        exercise: exercises
      })
        .from(workoutExercises)
        .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
        .where(eq(workoutExercises.workoutProgramId, workoutProgramId))
        .orderBy(asc(workoutExercises.order));
      
      return results;
    } catch (error) {
      console.error("Error getting workout exercises:", error);
      throw error;
    }
  }

  async addExerciseToWorkout(insertWorkoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise> {
    try {
      const results = await db.insert(workoutExercises).values({
        ...insertWorkoutExercise,
        sets: insertWorkoutExercise.sets || null,
        reps: insertWorkoutExercise.reps || null,
        duration: insertWorkoutExercise.duration || null
      }).returning();
      
      if (results.length === 0) {
        throw new Error("Failed to add exercise to workout");
      }
      return results[0];
    } catch (error) {
      console.error("Error adding exercise to workout:", error);
      throw error;
    }
  }

  async updateWorkoutExercise(id: number, update: Partial<WorkoutExercise>): Promise<WorkoutExercise | undefined> {
    try {
      const results = await db.update(workoutExercises)
        .set(update)
        .where(eq(workoutExercises.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error updating workout exercise:", error);
      throw error;
    }
  }

  async removeExerciseFromWorkout(id: number): Promise<boolean> {
    try {
      const results = await db.delete(workoutExercises)
        .where(eq(workoutExercises.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error("Error removing exercise from workout:", error);
      throw error;
    }
  }

  // Логи выполнения тренировок
  async getWorkoutLogs(userId: number): Promise<WorkoutLog[]> {
    try {
      return await db.select().from(workoutLogs)
        .where(eq(workoutLogs.userId, userId))
        .orderBy(desc(workoutLogs.date));
    } catch (error) {
      console.error("Error getting workout logs:", error);
      throw error;
    }
  }

  async getWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
    try {
      const results = await db.select().from(workoutLogs).where(eq(workoutLogs.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting workout log:", error);
      throw error;
    }
  }

  async createWorkoutLog(insertLog: InsertWorkoutLog): Promise<WorkoutLog> {
    try {
      const results = await db.insert(workoutLogs).values(insertLog).returning();
      if (results.length === 0) {
        throw new Error("Failed to create workout log");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating workout log:", error);
      throw error;
    }
  }

  async completeWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
    try {
      const results = await db.update(workoutLogs)
        .set({ completed: true })
        .where(eq(workoutLogs.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error completing workout log:", error);
      throw error;
    }
  }

  // Логи упражнений
  async getExerciseLogs(workoutLogId: number): Promise<(ExerciseLog & { exercise: Exercise })[]> {
    try {
      const results = await db.select({
        ...exerciseLogs,
        exercise: exercises
      })
        .from(exerciseLogs)
        .innerJoin(exercises, eq(exerciseLogs.exerciseId, exercises.id))
        .where(eq(exerciseLogs.workoutLogId, workoutLogId))
        .orderBy(asc(exerciseLogs.setNumber));
      
      return results;
    } catch (error) {
      console.error("Error getting exercise logs:", error);
      throw error;
    }
  }

  async createExerciseLog(insertLog: InsertExerciseLog): Promise<ExerciseLog> {
    try {
      const results = await db.insert(exerciseLogs).values({
        ...insertLog,
        reps: insertLog.reps || null,
        weight: insertLog.weight || null,
        duration: insertLog.duration || null,
        completed: insertLog.completed || false
      }).returning();
      
      if (results.length === 0) {
        throw new Error("Failed to create exercise log");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating exercise log:", error);
      throw error;
    }
  }

  async updateExerciseLog(id: number, update: Partial<ExerciseLog>): Promise<ExerciseLog | undefined> {
    try {
      const results = await db.update(exerciseLogs)
        .set(update)
        .where(eq(exerciseLogs.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error updating exercise log:", error);
      throw error;
    }
  }

  // Фотографии прогресса
  async getProgressPhotos(userId: number, category?: string): Promise<ProgressPhoto[]> {
    try {
      let query = db.select().from(progressPhotos).where(eq(progressPhotos.userId, userId));
      if (category) {
        query = query.where(eq(progressPhotos.category, category));
      }
      return await query.orderBy(desc(progressPhotos.date));
    } catch (error) {
      console.error("Error getting progress photos:", error);
      throw error;
    }
  }

  async getProgressPhoto(id: number): Promise<ProgressPhoto | undefined> {
    try {
      const results = await db.select().from(progressPhotos).where(eq(progressPhotos.id, id));
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error getting progress photo:", error);
      throw error;
    }
  }

  async createProgressPhoto(insertPhoto: InsertProgressPhoto): Promise<ProgressPhoto> {
    try {
      const results = await db.insert(progressPhotos).values({
        ...insertPhoto,
        category: insertPhoto.category || null,
        notes: insertPhoto.notes || null,
        relatedMeasurementId: insertPhoto.relatedMeasurementId || null
      }).returning();
      
      if (results.length === 0) {
        throw new Error("Failed to create progress photo");
      }
      return results[0];
    } catch (error) {
      console.error("Error creating progress photo:", error);
      throw error;
    }
  }

  async deleteProgressPhoto(id: number): Promise<boolean> {
    try {
      const results = await db.delete(progressPhotos)
        .where(eq(progressPhotos.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error("Error deleting progress photo:", error);
      throw error;
    }
  }
}