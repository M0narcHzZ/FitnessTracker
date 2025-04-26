import { db } from "./db";
import {
  User, InsertUser,
  Measurement, InsertMeasurement, MeasurementWithChange,
  Exercise, InsertExercise,
  WorkoutProgram, InsertWorkoutProgram, WorkoutProgramWithExercises,
  WorkoutExercise, InsertWorkoutExercise,
  WorkoutLog, InsertWorkoutLog,
  ExerciseLog, InsertExerciseLog,
  ProgressPhoto, InsertProgressPhoto
} from "@shared/schema";
import { IStorage } from "./storage";

export class SQLiteStorage implements IStorage {
  // Пользователи
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      return result as User || undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
      return result as User || undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?) RETURNING *");
      const result = stmt.get(insertUser.username, insertUser.password) as User;
      
      if (!result) {
        throw new Error("Failed to create user");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Измерения
  async getMeasurements(userId: number, type?: string): Promise<Measurement[]> {
    try {
      let query = "SELECT * FROM measurements WHERE user_id = ?";
      let params: any[] = [userId];
      
      if (type) {
        query += " AND type = ?";
        params.push(type);
      }
      
      query += " ORDER BY date DESC";
      
      return db.prepare(query).all(...params) as Measurement[];
    } catch (error) {
      console.error("Error getting measurements:", error);
      throw error;
    }
  }

  async getMeasurement(id: number): Promise<Measurement | undefined> {
    try {
      const result = db.prepare("SELECT * FROM measurements WHERE id = ?").get(id);
      return result as Measurement || undefined;
    } catch (error) {
      console.error("Error getting measurement:", error);
      throw error;
    }
  }

  async getMeasurementsWithChange(userId: number, type?: string): Promise<MeasurementWithChange[]> {
    try {
      const measurements = await this.getMeasurements(userId, type);
      const measurementsByType: Record<string, Measurement[]> = {};
      
      // Группировка по типу измерения
      measurements.forEach(m => {
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
      let query = "INSERT INTO measurements (user_id, type, value, unit";
      let placeholders = "?, ?, ?, ?";
      let params: any[] = [
        insertMeasurement.userId,
        insertMeasurement.type,
        insertMeasurement.value,
        insertMeasurement.unit
      ];
      
      if (insertMeasurement.date) {
        query += ", date";
        placeholders += ", ?";
        params.push(insertMeasurement.date);
      }
      
      query += `) VALUES (${placeholders}) RETURNING *`;
      
      const result = db.prepare(query).get(...params) as Measurement;
      
      if (!result) {
        throw new Error("Failed to create measurement");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating measurement:", error);
      throw error;
    }
  }

  async updateMeasurement(id: number, measurementUpdate: Partial<Measurement>): Promise<Measurement | undefined> {
    try {
      const currentMeasurement = await this.getMeasurement(id);
      if (!currentMeasurement) {
        return undefined;
      }
      
      const updateParts: string[] = [];
      const params: any[] = [];
      
      Object.entries(measurementUpdate).forEach(([key, value]) => {
        if (key !== 'id') { // Не обновляем id
          updateParts.push(`${this.toSnakeCase(key)} = ?`);
          params.push(value);
        }
      });
      
      if (updateParts.length === 0) {
        return currentMeasurement;
      }
      
      params.push(id);
      
      const query = `UPDATE measurements SET ${updateParts.join(', ')} WHERE id = ? RETURNING *`;
      const result = db.prepare(query).get(...params) as Measurement;
      
      return result || undefined;
    } catch (error) {
      console.error("Error updating measurement:", error);
      throw error;
    }
  }

  async deleteMeasurement(id: number): Promise<boolean> {
    try {
      const result = db.prepare("DELETE FROM measurements WHERE id = ? RETURNING id").get(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting measurement:", error);
      throw error;
    }
  }

  // Упражнения
  async getExercises(): Promise<Exercise[]> {
    try {
      return db.prepare("SELECT * FROM exercises ORDER BY name").all() as Exercise[];
    } catch (error) {
      console.error("Error getting exercises:", error);
      throw error;
    }
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    try {
      const result = db.prepare("SELECT * FROM exercises WHERE id = ?").get(id);
      return result as Exercise || undefined;
    } catch (error) {
      console.error("Error getting exercise:", error);
      throw error;
    }
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    try {
      const stmt = db.prepare(
        "INSERT INTO exercises (name, category, description) VALUES (?, ?, ?) RETURNING *"
      );
      
      const result = stmt.get(
        insertExercise.name,
        insertExercise.category || null,
        insertExercise.description || null
      ) as Exercise;
      
      if (!result) {
        throw new Error("Failed to create exercise");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating exercise:", error);
      throw error;
    }
  }

  // Программы тренировок
  async getWorkoutPrograms(userId: number): Promise<WorkoutProgram[]> {
    try {
      return db.prepare("SELECT * FROM workout_programs WHERE user_id = ? ORDER BY name").all(userId) as WorkoutProgram[];
    } catch (error) {
      console.error("Error getting workout programs:", error);
      throw error;
    }
  }

  async getWorkoutProgram(id: number): Promise<WorkoutProgram | undefined> {
    try {
      const result = db.prepare("SELECT * FROM workout_programs WHERE id = ?").get(id);
      return result as WorkoutProgram || undefined;
    } catch (error) {
      console.error("Error getting workout program:", error);
      throw error;
    }
  }

  async getWorkoutProgramWithExercises(id: number): Promise<WorkoutProgramWithExercises | undefined> {
    try {
      const program = await this.getWorkoutProgram(id);
      if (!program) return undefined;
      
      const exercises = await this.getWorkoutExercises(id);
      
      return {
        ...program,
        exercises
      };
    } catch (error) {
      console.error("Error getting workout program with exercises:", error);
      throw error;
    }
  }

  async createWorkoutProgram(insertProgram: InsertWorkoutProgram): Promise<WorkoutProgram> {
    try {
      const stmt = db.prepare(`
        INSERT INTO workout_programs (
          user_id, name, description, color_scheme, estimated_duration
        ) VALUES (?, ?, ?, ?, ?) RETURNING *
      `);
      
      const result = stmt.get(
        insertProgram.userId,
        insertProgram.name,
        insertProgram.description || null,
        insertProgram.colorScheme || "primary",
        insertProgram.estimatedDuration || null
      ) as WorkoutProgram;
      
      if (!result) {
        throw new Error("Failed to create workout program");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating workout program:", error);
      throw error;
    }
  }

  async updateWorkoutProgram(id: number, programUpdate: Partial<WorkoutProgram>): Promise<WorkoutProgram | undefined> {
    try {
      const currentProgram = await this.getWorkoutProgram(id);
      if (!currentProgram) {
        return undefined;
      }
      
      const updateParts: string[] = [];
      const params: any[] = [];
      
      Object.entries(programUpdate).forEach(([key, value]) => {
        if (key !== 'id') { // Не обновляем id
          updateParts.push(`${this.toSnakeCase(key)} = ?`);
          params.push(value);
        }
      });
      
      if (updateParts.length === 0) {
        return currentProgram;
      }
      
      params.push(id);
      
      const query = `UPDATE workout_programs SET ${updateParts.join(', ')} WHERE id = ? RETURNING *`;
      const result = db.prepare(query).get(...params) as WorkoutProgram;
      
      return result || undefined;
    } catch (error) {
      console.error("Error updating workout program:", error);
      throw error;
    }
  }

  async deleteWorkoutProgram(id: number): Promise<boolean> {
    try {
      // Удаляем связанные упражнения в тренировке
      db.prepare("DELETE FROM workout_exercises WHERE workout_program_id = ?").run(id);
      
      // Удаляем программу
      const result = db.prepare("DELETE FROM workout_programs WHERE id = ? RETURNING id").get(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting workout program:", error);
      throw error;
    }
  }

  // Упражнения в программе тренировок
  async getWorkoutExercises(workoutProgramId: number): Promise<(WorkoutExercise & { exercise: Exercise })[]> {
    try {
      const query = `
        SELECT 
          we.*, 
          e.id as e_id, 
          e.name as e_name, 
          e.category as e_category, 
          e.description as e_description 
        FROM workout_exercises we
        JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_program_id = ?
        ORDER BY we."order"
      `;
      
      const results = db.prepare(query).all(workoutProgramId) as any[];
      
      return results.map(row => {
        return {
          id: row.id,
          workoutProgramId: row.workout_program_id,
          exerciseId: row.exercise_id,
          sets: row.sets,
          reps: row.reps,
          duration: row.duration,
          order: row.order,
          exercise: {
            id: row.e_id,
            name: row.e_name,
            category: row.e_category,
            description: row.e_description
          }
        };
      });
    } catch (error) {
      console.error("Error getting workout exercises:", error);
      throw error;
    }
  }

  async addExerciseToWorkout(insertWorkoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise> {
    try {
      console.log("Добавление упражнения в программу, данные:", JSON.stringify(insertWorkoutExercise));
      
      if (!insertWorkoutExercise.workoutProgramId) {
        throw new Error("workoutProgramId is required and cannot be null");
      }
      
      // Используем захардкоженный SQL запрос с явно указанными полями
      // Для поля "order" используем кавычки
      const stmt = db.prepare(`
        INSERT INTO workout_exercises (
          workout_program_id, 
          exercise_id, 
          "order", 
          sets, 
          reps, 
          duration
        ) VALUES (?, ?, ?, ?, ?, ?) 
        RETURNING *
      `);
      
      // Подготавливаем значения для вставки
      const values = [
        insertWorkoutExercise.workoutProgramId,
        insertWorkoutExercise.exerciseId,
        insertWorkoutExercise.order || 1,  // Если порядок не задан, используем 1
        insertWorkoutExercise.sets !== undefined ? insertWorkoutExercise.sets : null,
        insertWorkoutExercise.reps !== undefined ? insertWorkoutExercise.reps : null,
        insertWorkoutExercise.duration !== undefined ? insertWorkoutExercise.duration : null
      ];
      
      console.log("SQL: INSERT INTO workout_exercises (workout_program_id, exercise_id, \"order\", sets, reps, duration) VALUES (?, ?, ?, ?, ?, ?) RETURNING *");
      console.log("Значения:", values);
      
      const result = stmt.get(...values) as WorkoutExercise;
      
      if (!result) {
        throw new Error("Failed to add exercise to workout");
      }
      
      console.log("Результат добавления упражнения:", JSON.stringify(result));
      
      return result;
    } catch (error) {
      console.error("Error adding exercise to workout:", error);
      throw error;
    }
  }

  async updateWorkoutExercise(id: number, update: Partial<WorkoutExercise>): Promise<WorkoutExercise | undefined> {
    try {
      const current = db.prepare("SELECT * FROM workout_exercises WHERE id = ?").get(id) as WorkoutExercise;
      if (!current) {
        return undefined;
      }
      
      const updateParts: string[] = [];
      const params: any[] = [];
      
      Object.entries(update).forEach(([key, value]) => {
        if (key !== 'id') {
          // Специальное условие для "order", так как это зарезервированное слово в SQL
          if (key === 'order') {
            updateParts.push(`"order" = ?`);
          } else {
            updateParts.push(`${this.toSnakeCase(key)} = ?`);
          }
          params.push(value);
        }
      });
      
      if (updateParts.length === 0) {
        return current;
      }
      
      params.push(id);
      
      const query = `UPDATE workout_exercises SET ${updateParts.join(', ')} WHERE id = ? RETURNING *`;
      const result = db.prepare(query).get(...params) as WorkoutExercise;
      
      return result || undefined;
    } catch (error) {
      console.error("Error updating workout exercise:", error);
      throw error;
    }
  }

  async removeExerciseFromWorkout(id: number): Promise<boolean> {
    try {
      const result = db.prepare("DELETE FROM workout_exercises WHERE id = ? RETURNING id").get(id);
      return !!result;
    } catch (error) {
      console.error("Error removing exercise from workout:", error);
      throw error;
    }
  }

  // Логи выполнения тренировок
  async getWorkoutLogs(userId: number): Promise<WorkoutLog[]> {
    try {
      return db.prepare("SELECT * FROM workout_logs WHERE user_id = ? ORDER BY date DESC").all(userId) as WorkoutLog[];
    } catch (error) {
      console.error("Error getting workout logs:", error);
      throw error;
    }
  }

  async getWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
    try {
      const result = db.prepare("SELECT * FROM workout_logs WHERE id = ?").get(id);
      return result as WorkoutLog || undefined;
    } catch (error) {
      console.error("Error getting workout log:", error);
      throw error;
    }
  }

  async createWorkoutLog(insertLog: InsertWorkoutLog): Promise<WorkoutLog> {
    try {
      let query = "INSERT INTO workout_logs (user_id, workout_program_id";
      let placeholders = "?, ?";
      let params: any[] = [
        insertLog.userId,
        insertLog.workoutProgramId
      ];
      
      if (insertLog.date) {
        query += ", date";
        placeholders += ", ?";
        params.push(insertLog.date);
      }
      
      if (insertLog.completed !== undefined) {
        query += ", completed";
        placeholders += ", ?";
        params.push(insertLog.completed ? 1 : 0);
      }
      
      query += `) VALUES (${placeholders}) RETURNING *`;
      
      const result = db.prepare(query).get(...params) as WorkoutLog;
      
      if (!result) {
        throw new Error("Failed to create workout log");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating workout log:", error);
      throw error;
    }
  }

  async completeWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
    try {
      const result = db.prepare("UPDATE workout_logs SET completed = 1 WHERE id = ? RETURNING *").get(id) as WorkoutLog;
      return result || undefined;
    } catch (error) {
      console.error("Error completing workout log:", error);
      throw error;
    }
  }

  // Логи упражнений
  async getExerciseLogs(workoutLogId: number): Promise<(ExerciseLog & { exercise: Exercise })[]> {
    try {
      const query = `
        SELECT 
          el.*, 
          e.id as e_id, 
          e.name as e_name, 
          e.category as e_category, 
          e.description as e_description 
        FROM exercise_logs el
        JOIN exercises e ON el.exercise_id = e.id
        WHERE el.workout_log_id = ?
        ORDER BY el.set_number
      `;
      
      const results = db.prepare(query).all(workoutLogId) as any[];
      
      return results.map(row => {
        return {
          id: row.id,
          workoutLogId: row.workout_log_id,
          exerciseId: row.exercise_id,
          setNumber: row.set_number,
          reps: row.reps,
          weight: row.weight,
          duration: row.duration,
          completed: !!row.completed,
          exercise: {
            id: row.e_id,
            name: row.e_name,
            category: row.e_category,
            description: row.e_description
          }
        };
      });
    } catch (error) {
      console.error("Error getting exercise logs:", error);
      throw error;
    }
  }

  async createExerciseLog(insertLog: InsertExerciseLog): Promise<ExerciseLog> {
    try {
      const stmt = db.prepare(`
        INSERT INTO exercise_logs (
          workout_log_id, exercise_id, set_number, reps, weight, duration, completed
        ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
      `);
      
      const result = stmt.get(
        insertLog.workoutLogId,
        insertLog.exerciseId,
        insertLog.setNumber,
        insertLog.reps || null,
        insertLog.weight || null,
        insertLog.duration || null,
        insertLog.completed ? 1 : 0
      ) as ExerciseLog;
      
      if (!result) {
        throw new Error("Failed to create exercise log");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating exercise log:", error);
      throw error;
    }
  }

  async updateExerciseLog(id: number, update: Partial<ExerciseLog>): Promise<ExerciseLog | undefined> {
    try {
      const current = db.prepare("SELECT * FROM exercise_logs WHERE id = ?").get(id) as ExerciseLog;
      if (!current) {
        return undefined;
      }
      
      const updateParts: string[] = [];
      const params: any[] = [];
      
      Object.entries(update).forEach(([key, value]) => {
        if (key !== 'id') {
          // Преобразуем boolean в 0/1 для SQLite
          if (key === 'completed' && typeof value === 'boolean') {
            updateParts.push(`${this.toSnakeCase(key)} = ?`);
            params.push(value ? 1 : 0);
          } else {
            updateParts.push(`${this.toSnakeCase(key)} = ?`);
            params.push(value);
          }
        }
      });
      
      if (updateParts.length === 0) {
        return current;
      }
      
      params.push(id);
      
      const query = `UPDATE exercise_logs SET ${updateParts.join(', ')} WHERE id = ? RETURNING *`;
      const result = db.prepare(query).get(...params) as ExerciseLog;
      
      return result || undefined;
    } catch (error) {
      console.error("Error updating exercise log:", error);
      throw error;
    }
  }

  // Фотографии прогресса
  async getProgressPhotos(userId: number, category?: string): Promise<ProgressPhoto[]> {
    try {
      let query = "SELECT * FROM progress_photos WHERE user_id = ?";
      let params: any[] = [userId];
      
      if (category) {
        query += " AND category = ?";
        params.push(category);
      }
      
      query += " ORDER BY date DESC";
      
      return db.prepare(query).all(...params) as ProgressPhoto[];
    } catch (error) {
      console.error("Error getting progress photos:", error);
      throw error;
    }
  }

  async getProgressPhoto(id: number): Promise<ProgressPhoto | undefined> {
    try {
      const result = db.prepare("SELECT * FROM progress_photos WHERE id = ?").get(id);
      return result as ProgressPhoto || undefined;
    } catch (error) {
      console.error("Error getting progress photo:", error);
      throw error;
    }
  }

  async createProgressPhoto(insertPhoto: InsertProgressPhoto): Promise<ProgressPhoto> {
    try {
      let columns = ["user_id", "photo_url"];
      let placeholders = ["?", "?"];
      let params = [insertPhoto.userId, insertPhoto.photoUrl];
      
      if (insertPhoto.category !== undefined) {
        columns.push("category");
        placeholders.push("?");
        params.push(insertPhoto.category);
      }
      
      if (insertPhoto.date !== undefined) {
        columns.push("date");
        placeholders.push("?");
        params.push(insertPhoto.date);
      }
      
      if (insertPhoto.notes !== undefined) {
        columns.push("notes");
        placeholders.push("?");
        params.push(insertPhoto.notes);
      }
      
      if (insertPhoto.relatedMeasurementId !== undefined) {
        columns.push("related_measurement_id");
        placeholders.push("?");
        params.push(insertPhoto.relatedMeasurementId);
      }
      
      const query = `
        INSERT INTO progress_photos (${columns.join(", ")}) 
        VALUES (${placeholders.join(", ")}) 
        RETURNING *
      `;
      
      const result = db.prepare(query).get(...params) as ProgressPhoto;
      
      if (!result) {
        throw new Error("Failed to create progress photo");
      }
      
      return result;
    } catch (error) {
      console.error("Error creating progress photo:", error);
      throw error;
    }
  }

  async deleteProgressPhoto(id: number): Promise<boolean> {
    try {
      const result = db.prepare("DELETE FROM progress_photos WHERE id = ? RETURNING id").get(id);
      return !!result;
    } catch (error) {
      console.error("Error deleting progress photo:", error);
      throw error;
    }
  }

  // Вспомогательные методы
  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, "_$1").toLowerCase();
  }
}