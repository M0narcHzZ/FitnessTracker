import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

// Создаем директорию для базы данных, если её нет
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Путь к файлу базы данных
const DB_PATH = path.join(DATA_DIR, "fitness_tracker.db");

// Создаем соединение с базой данных
const db = new Database(DB_PATH);

// Выполняем миграцию в памяти (без файлов миграции)
// для создания таблиц в базе данных при первом запуске
try {
  console.log("Running database initialization...");

  // Создаем таблицы
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT
    );
    
    CREATE TABLE IF NOT EXISTS workout_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color_scheme TEXT DEFAULT 'primary',
      estimated_duration TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_program_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sets INTEGER,
      reps INTEGER,
      duration TEXT,
      "order" INTEGER NOT NULL,
      FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
    
    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      workout_program_id INTEGER NOT NULL,
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id)
    );
    
    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      duration TEXT,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
    
    CREATE TABLE IF NOT EXISTS progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      category TEXT,
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      related_measurement_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (related_measurement_id) REFERENCES measurements(id)
    );
    
    -- Создаем индексы для улучшения производительности
    CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON measurements(user_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_type ON measurements(type);
    CREATE INDEX IF NOT EXISTS idx_workout_programs_user_id ON workout_programs(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_program_id ON workout_exercises(workout_program_id);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_program_id ON workout_logs(workout_program_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout_log_id ON exercise_logs(workout_log_id);
    CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_photos_category ON progress_photos(category);
  `);

  // Проверяем наличие дефолтных упражнений
  const exerciseCount = db.prepare("SELECT COUNT(*) as count FROM exercises").get() as { count: number };

  // Добавляем базовые упражнения, если их нет
  if (exerciseCount.count === 0) {
    console.log("Adding default exercises...");
    const exercises = [
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

    const insertExerciseStmt = db.prepare("INSERT INTO exercises (name, category, description) VALUES (?, ?, ?)");

    db.transaction(() => {
      for (const exercise of exercises) {
        insertExerciseStmt.run(exercise.name, exercise.category, exercise.description);
      }
    })();
  }

  // Проверяем наличие дефолтного пользователя
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

  // Создаем дефолтного пользователя, если их нет
  if (userCount.count === 0) {
    console.log("Creating default user...");
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("user", "password");
  }

  console.log("Database initialization completed successfully!");
} catch (error) {
  console.error("Error initializing database:", error);
}

export { db };