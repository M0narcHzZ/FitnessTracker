import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User model (kept from existing schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Measurement model
export const measurements = pgTable("measurements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // bicep, weight, chest, etc.
  value: real("value").notNull(),
  unit: text("unit").notNull(), // cm, kg, etc.
  date: timestamp("date").defaultNow().notNull(),
});

export const insertMeasurementSchema = createInsertSchema(measurements).pick({
  userId: true,
  type: true,
  value: true,
  unit: true,
  date: true,
});

// Exercise model
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"), // strength, cardio, etc.
  description: text("description"),
});

export const insertExerciseSchema = createInsertSchema(exercises).pick({
  name: true,
  category: true,
  description: true,
});

// Workout Program model
export const workoutPrograms = pgTable("workout_programs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  colorScheme: text("color_scheme").default("primary"),
  estimatedDuration: text("estimated_duration"),
});

export const insertWorkoutProgramSchema = createInsertSchema(workoutPrograms).pick({
  userId: true,
  name: true,
  description: true,
  colorScheme: true,
  estimatedDuration: true,
});

// Workout Exercise model (junction between workout and exercise)
export const workoutExercises = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutProgramId: integer("workout_program_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  duration: text("duration"),
  sequence: integer("sequence").notNull(), // Переименовали order в sequence
});

export const insertWorkoutExerciseSchema = createInsertSchema(workoutExercises).pick({
  workoutProgramId: true,
  exerciseId: true,
  sets: true,
  reps: true,
  duration: true,
  sequence: true, // Переименовали order в sequence
});

// Workout Log model
export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  workoutProgramId: integer("workout_program_id").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  completed: boolean("completed").default(false),
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).pick({
  userId: true,
  workoutProgramId: true,
  date: true,
  completed: true,
});

// Exercise Log model (individual exercise performance)
export const exerciseLogs = pgTable("exercise_logs", {
  id: serial("id").primaryKey(),
  workoutLogId: integer("workout_log_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weight: real("weight"),
  duration: text("duration"),
  completed: boolean("completed").default(false),
});

export const insertExerciseLogSchema = createInsertSchema(exerciseLogs).pick({
  workoutLogId: true,
  exerciseId: true,
  setNumber: true,
  reps: true,
  weight: true,
  duration: true,
  completed: true,
});

// Progress Photo model
export const progressPhotos = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  category: text("category"), // abs, bicep, etc.
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  relatedMeasurementId: integer("related_measurement_id"),
});

export const insertProgressPhotoSchema = createInsertSchema(progressPhotos).pick({
  userId: true,
  photoUrl: true,
  category: true,
  date: true,
  notes: true,
  relatedMeasurementId: true,
});

// Define relationships

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  measurements: many(measurements),
  workoutPrograms: many(workoutPrograms),
  workoutLogs: many(workoutLogs),
  progressPhotos: many(progressPhotos),
}));

// Measurement relations
export const measurementsRelations = relations(measurements, ({ one, many }) => ({
  user: one(users, {
    fields: [measurements.userId],
    references: [users.id],
  }),
  progressPhotos: many(progressPhotos),
}));

// Exercise relations
export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
  exerciseLogs: many(exerciseLogs),
}));

// Workout Program relations
export const workoutProgramsRelations = relations(workoutPrograms, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutPrograms.userId],
    references: [users.id],
  }),
  workoutExercises: many(workoutExercises),
  workoutLogs: many(workoutLogs),
}));

// Workout Exercise relations
export const workoutExercisesRelations = relations(workoutExercises, ({ one }) => ({
  workoutProgram: one(workoutPrograms, {
    fields: [workoutExercises.workoutProgramId],
    references: [workoutPrograms.id],
  }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
}));

// Workout Log relations
export const workoutLogsRelations = relations(workoutLogs, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutLogs.userId],
    references: [users.id],
  }),
  workoutProgram: one(workoutPrograms, {
    fields: [workoutLogs.workoutProgramId],
    references: [workoutPrograms.id],
  }),
  exerciseLogs: many(exerciseLogs),
}));

// Exercise Log relations
export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
  workoutLog: one(workoutLogs, {
    fields: [exerciseLogs.workoutLogId],
    references: [workoutLogs.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseLogs.exerciseId],
    references: [exercises.id],
  }),
}));

// Progress Photo relations
export const progressPhotosRelations = relations(progressPhotos, ({ one }) => ({
  user: one(users, {
    fields: [progressPhotos.userId],
    references: [users.id],
  }),
  relatedMeasurement: one(measurements, {
    fields: [progressPhotos.relatedMeasurementId],
    references: [measurements.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Measurement = typeof measurements.$inferSelect;
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

export type WorkoutProgram = typeof workoutPrograms.$inferSelect;
export type InsertWorkoutProgram = z.infer<typeof insertWorkoutProgramSchema>;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;

export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;

export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type InsertExerciseLog = z.infer<typeof insertExerciseLogSchema>;

export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;

// Extended types for frontend use
export type WorkoutProgramWithExercises = WorkoutProgram & {
  exercises: (WorkoutExercise & { exercise: Exercise })[];
};

export type MeasurementWithChange = Measurement & {
  change?: number;
};
