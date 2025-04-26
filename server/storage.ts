import {
  users, User, InsertUser,
  measurements, Measurement, InsertMeasurement,
  exercises, Exercise, InsertExercise,
  workoutPrograms, WorkoutProgram, InsertWorkoutProgram,
  workoutExercises, WorkoutExercise, InsertWorkoutExercise, 
  workoutLogs, WorkoutLog, InsertWorkoutLog,
  exerciseLogs, ExerciseLog, InsertExerciseLog,
  progressPhotos, ProgressPhoto, InsertProgressPhoto,
  WorkoutProgramWithExercises, MeasurementWithChange
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Measurements methods
  getMeasurements(userId: number, type?: string): Promise<Measurement[]>;
  getMeasurement(id: number): Promise<Measurement | undefined>;
  getMeasurementsWithChange(userId: number, type?: string): Promise<MeasurementWithChange[]>;
  createMeasurement(measurement: InsertMeasurement): Promise<Measurement>;
  updateMeasurement(id: number, measurement: Partial<Measurement>): Promise<Measurement | undefined>;
  deleteMeasurement(id: number): Promise<boolean>;
  
  // Exercise methods
  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Workout Program methods
  getWorkoutPrograms(userId: number): Promise<WorkoutProgram[]>;
  getWorkoutProgram(id: number): Promise<WorkoutProgram | undefined>;
  getWorkoutProgramWithExercises(id: number): Promise<WorkoutProgramWithExercises | undefined>;
  createWorkoutProgram(program: InsertWorkoutProgram): Promise<WorkoutProgram>;
  updateWorkoutProgram(id: number, program: Partial<WorkoutProgram>): Promise<WorkoutProgram | undefined>;
  deleteWorkoutProgram(id: number): Promise<boolean>;
  
  // Workout Exercise methods
  getWorkoutExercises(workoutProgramId: number): Promise<(WorkoutExercise & { exercise: Exercise })[]>;
  addExerciseToWorkout(workoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise>;
  updateWorkoutExercise(id: number, workoutExercise: Partial<WorkoutExercise>): Promise<WorkoutExercise | undefined>;
  removeExerciseFromWorkout(id: number): Promise<boolean>;
  
  // Workout Log methods
  getWorkoutLogs(userId: number): Promise<WorkoutLog[]>;
  getWorkoutLog(id: number): Promise<WorkoutLog | undefined>;
  createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog>;
  completeWorkoutLog(id: number): Promise<WorkoutLog | undefined>;
  
  // Exercise Log methods
  getExerciseLogs(workoutLogId: number): Promise<(ExerciseLog & { exercise: Exercise })[]>;
  createExerciseLog(log: InsertExerciseLog): Promise<ExerciseLog>;
  updateExerciseLog(id: number, log: Partial<ExerciseLog>): Promise<ExerciseLog | undefined>;
  
  // Progress Photo methods
  getProgressPhotos(userId: number, category?: string): Promise<ProgressPhoto[]>;
  getProgressPhoto(id: number): Promise<ProgressPhoto | undefined>;
  createProgressPhoto(photo: InsertProgressPhoto): Promise<ProgressPhoto>;
  deleteProgressPhoto(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private measurements: Map<number, Measurement>;
  private exercises: Map<number, Exercise>;
  private workoutPrograms: Map<number, WorkoutProgram>;
  private workoutExercises: Map<number, WorkoutExercise>;
  private workoutLogs: Map<number, WorkoutLog>;
  private exerciseLogs: Map<number, ExerciseLog>;
  private progressPhotos: Map<number, ProgressPhoto>;
  
  private userIdCounter: number;
  private measurementIdCounter: number;
  private exerciseIdCounter: number;
  private workoutProgramIdCounter: number;
  private workoutExerciseIdCounter: number;
  private workoutLogIdCounter: number;
  private exerciseLogIdCounter: number;
  private progressPhotoIdCounter: number;

  constructor() {
    this.users = new Map();
    this.measurements = new Map();
    this.exercises = new Map();
    this.workoutPrograms = new Map();
    this.workoutExercises = new Map();
    this.workoutLogs = new Map();
    this.exerciseLogs = new Map();
    this.progressPhotos = new Map();

    this.userIdCounter = 1;
    this.measurementIdCounter = 1;
    this.exerciseIdCounter = 1;
    this.workoutProgramIdCounter = 1;
    this.workoutExerciseIdCounter = 1;
    this.workoutLogIdCounter = 1;
    this.exerciseLogIdCounter = 1;
    this.progressPhotoIdCounter = 1;
    
    // Initialize with some default exercises
    this.initializeExercises();
    // Create default user without any data
    this.createDefaultUser();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Measurements methods
  async getMeasurements(userId: number, type?: string): Promise<Measurement[]> {
    const userMeasurements = Array.from(this.measurements.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (type) {
      return userMeasurements.filter(m => m.type === type);
    }
    
    return userMeasurements;
  }

  async getMeasurement(id: number): Promise<Measurement | undefined> {
    return this.measurements.get(id);
  }

  async getMeasurementsWithChange(userId: number, type?: string): Promise<MeasurementWithChange[]> {
    const measurements = await this.getMeasurements(userId, type);
    
    return measurements.map((measurement, index) => {
      if (index === measurements.length - 1) {
        return { ...measurement, change: undefined };
      }
      
      const nextMeasurement = measurements[index + 1];
      const change = measurement.value - nextMeasurement.value;
      
      return { ...measurement, change };
    });
  }

  async createMeasurement(insertMeasurement: InsertMeasurement): Promise<Measurement> {
    const id = this.measurementIdCounter++;
    const measurement: Measurement = { ...insertMeasurement, id };
    this.measurements.set(id, measurement);
    return measurement;
  }

  async updateMeasurement(id: number, measurementUpdate: Partial<Measurement>): Promise<Measurement | undefined> {
    const measurement = this.measurements.get(id);
    if (!measurement) {
      return undefined;
    }
    
    const updatedMeasurement = { ...measurement, ...measurementUpdate };
    this.measurements.set(id, updatedMeasurement);
    return updatedMeasurement;
  }

  async deleteMeasurement(id: number): Promise<boolean> {
    return this.measurements.delete(id);
  }

  // Exercise methods
  async getExercises(): Promise<Exercise[]> {
    return Array.from(this.exercises.values());
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }

  async createExercise(insertExercise: InsertExercise): Promise<Exercise> {
    const id = this.exerciseIdCounter++;
    const exercise: Exercise = { ...insertExercise, id };
    this.exercises.set(id, exercise);
    return exercise;
  }

  // Workout Program methods
  async getWorkoutPrograms(userId: number): Promise<WorkoutProgram[]> {
    return Array.from(this.workoutPrograms.values())
      .filter(p => p.userId === userId);
  }

  async getWorkoutProgram(id: number): Promise<WorkoutProgram | undefined> {
    return this.workoutPrograms.get(id);
  }

  async getWorkoutProgramWithExercises(id: number): Promise<WorkoutProgramWithExercises | undefined> {
    const program = this.workoutPrograms.get(id);
    if (!program) {
      return undefined;
    }

    const exercises = await this.getWorkoutExercises(id);
    
    return {
      ...program,
      exercises
    };
  }

  async createWorkoutProgram(insertProgram: InsertWorkoutProgram): Promise<WorkoutProgram> {
    try {
      const id = this.workoutProgramIdCounter++;
      // Make sure all required fields are properly set
      const program: WorkoutProgram = { 
        ...insertProgram, 
        id,
        description: insertProgram.description || null,
        colorScheme: insertProgram.colorScheme || "primary",
        estimatedDuration: insertProgram.estimatedDuration || null
      };
      this.workoutPrograms.set(id, program);
      return program;
    } catch (error) {
      console.error("Error creating workout program:", error);
      throw error;
    }
  }

  async updateWorkoutProgram(id: number, programUpdate: Partial<WorkoutProgram>): Promise<WorkoutProgram | undefined> {
    const program = this.workoutPrograms.get(id);
    if (!program) {
      return undefined;
    }
    
    const updatedProgram = { ...program, ...programUpdate };
    this.workoutPrograms.set(id, updatedProgram);
    return updatedProgram;
  }

  async deleteWorkoutProgram(id: number): Promise<boolean> {
    // Delete associated workout exercises first
    const workoutExercises = Array.from(this.workoutExercises.values())
      .filter(we => we.workoutProgramId === id);
    
    for (const we of workoutExercises) {
      this.workoutExercises.delete(we.id);
    }
    
    return this.workoutPrograms.delete(id);
  }

  // Workout Exercise methods
  async getWorkoutExercises(workoutProgramId: number): Promise<(WorkoutExercise & { exercise: Exercise })[]> {
    const workoutExercises = Array.from(this.workoutExercises.values())
      .filter(we => we.workoutProgramId === workoutProgramId)
      .sort((a, b) => a.order - b.order);
    
    return workoutExercises.map(we => {
      const exercise = this.exercises.get(we.exerciseId);
      if (!exercise) {
        throw new Error(`Exercise with id ${we.exerciseId} not found`);
      }
      
      return {
        ...we,
        exercise
      };
    });
  }

  async addExerciseToWorkout(insertWorkoutExercise: InsertWorkoutExercise): Promise<WorkoutExercise> {
    try {
      const id = this.workoutExerciseIdCounter++;
      // Make sure all required fields are properly set
      const workoutExercise: WorkoutExercise = { 
        ...insertWorkoutExercise, 
        id,
        sets: insertWorkoutExercise.sets || null,
        reps: insertWorkoutExercise.reps || null,
        duration: insertWorkoutExercise.duration || null
      };
      this.workoutExercises.set(id, workoutExercise);
      console.log("Added exercise to workout:", workoutExercise);
      return workoutExercise;
    } catch (error) {
      console.error("Error adding exercise to workout:", error);
      throw error;
    }
  }

  async updateWorkoutExercise(id: number, update: Partial<WorkoutExercise>): Promise<WorkoutExercise | undefined> {
    const workoutExercise = this.workoutExercises.get(id);
    if (!workoutExercise) {
      return undefined;
    }
    
    const updatedWorkoutExercise = { ...workoutExercise, ...update };
    this.workoutExercises.set(id, updatedWorkoutExercise);
    return updatedWorkoutExercise;
  }

  async removeExerciseFromWorkout(id: number): Promise<boolean> {
    return this.workoutExercises.delete(id);
  }

  // Workout Log methods
  async getWorkoutLogs(userId: number): Promise<WorkoutLog[]> {
    return Array.from(this.workoutLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
    return this.workoutLogs.get(id);
  }

  async createWorkoutLog(insertLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const id = this.workoutLogIdCounter++;
    const log: WorkoutLog = { ...insertLog, id };
    this.workoutLogs.set(id, log);
    return log;
  }

  async completeWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
    const log = this.workoutLogs.get(id);
    if (!log) {
      return undefined;
    }
    
    const updatedLog = { ...log, completed: true };
    this.workoutLogs.set(id, updatedLog);
    return updatedLog;
  }

  // Exercise Log methods
  async getExerciseLogs(workoutLogId: number): Promise<(ExerciseLog & { exercise: Exercise })[]> {
    const logs = Array.from(this.exerciseLogs.values())
      .filter(log => log.workoutLogId === workoutLogId)
      .sort((a, b) => a.setNumber - b.setNumber);
    
    return logs.map(log => {
      const exercise = this.exercises.get(log.exerciseId);
      if (!exercise) {
        throw new Error(`Exercise with id ${log.exerciseId} not found`);
      }
      
      return {
        ...log,
        exercise
      };
    });
  }

  async createExerciseLog(insertLog: InsertExerciseLog): Promise<ExerciseLog> {
    const id = this.exerciseLogIdCounter++;
    const log: ExerciseLog = { ...insertLog, id };
    this.exerciseLogs.set(id, log);
    return log;
  }

  async updateExerciseLog(id: number, update: Partial<ExerciseLog>): Promise<ExerciseLog | undefined> {
    const log = this.exerciseLogs.get(id);
    if (!log) {
      return undefined;
    }
    
    const updatedLog = { ...log, ...update };
    this.exerciseLogs.set(id, updatedLog);
    return updatedLog;
  }

  // Progress Photo methods
  async getProgressPhotos(userId: number, category?: string): Promise<ProgressPhoto[]> {
    const photos = Array.from(this.progressPhotos.values())
      .filter(photo => photo.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (category) {
      return photos.filter(photo => photo.category === category);
    }
    
    return photos;
  }

  async getProgressPhoto(id: number): Promise<ProgressPhoto | undefined> {
    return this.progressPhotos.get(id);
  }

  async createProgressPhoto(insertPhoto: InsertProgressPhoto): Promise<ProgressPhoto> {
    const id = this.progressPhotoIdCounter++;
    const photo: ProgressPhoto = { ...insertPhoto, id };
    this.progressPhotos.set(id, photo);
    return photo;
  }

  async deleteProgressPhoto(id: number): Promise<boolean> {
    return this.progressPhotos.delete(id);
  }

  // Initialize helper methods
  private initializeExercises() {
    const exercises: InsertExercise[] = [
      { name: "Жим лежа", category: "Верх тела", description: "Жим штанги лежа на горизонтальной скамье" },
      { name: "Тяга к поясу", category: "Верх тела", description: "Тяга штанги в наклоне к поясу" },
      { name: "Подъем на бицепс", category: "Верх тела", description: "Подъем гантелей на бицепс" },
      { name: "Разгибание трицепса", category: "Верх тела", description: "Разгибание рук на трицепс с гантелями" },
      { name: "Жим плечами", category: "Верх тела", description: "Жим гантелей вверх для развития плеч" },
      { name: "Приседания со штангой", category: "Нижняя часть тела", description: "Классические приседания со штангой на плечах" },
      { name: "Разгибание ног", category: "Нижняя часть тела", description: "Разгибание ног в тренажере" },
      { name: "Сгибание ног", category: "Нижняя часть тела", description: "Сгибание ног в тренажере" },
      { name: "Икры", category: "Нижняя часть тела", description: "Подъем на носки для тренировки икроножных мышц" },
      { name: "Бег", category: "Кардио", description: "Бег на беговой дорожке или на улице" },
      { name: "Скручивания", category: "Пресс", description: "Скручивания на пресс" },
      { name: "Планка", category: "Пресс", description: "Статическое упражнение планка" },
      { name: "Подтягивания", category: "Верх тела", description: "Классические подтягивания на перекладине" },
      { name: "Отжимания", category: "Верх тела", description: "Отжимания от пола" },
      { name: "Приседания", category: "Нижняя часть тела", description: "Приседания без веса" }
    ];

    exercises.forEach(exercise => {
      const id = this.exerciseIdCounter++;
      this.exercises.set(id, { ...exercise, id });
    });
  }

  private createDefaultUser() {
    // Create default user without any pre-loaded data
    const user: User = {
      id: this.userIdCounter++,
      username: "user",
      password: "password"
    };
    
    this.users.set(user.id, user);
    // We don't create any measurements, workout programs or photos
    // All data will be added by the user manually
  }
}

export const storage = new MemStorage();
