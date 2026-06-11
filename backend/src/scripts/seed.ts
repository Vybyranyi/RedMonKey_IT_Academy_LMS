import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { UserRole } from '@redmonkey/shared';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('[seed]: Starting database seeding...');
    
    // Підключення до БД
    const mongoUrl = process.env.MONGO_URL!;
    await mongoose.connect(mongoUrl);
    console.log('[seed]: MongoDB connected.');

    // Очищення старих даних
    await User.deleteMany({});
    await Group.deleteMany({});
    console.log('[seed]: Existing users and groups cleared.');

    // Хешування стандартного пароля для всіх тестових користувачів
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Password123!', salt);

    // 1. Створення Адміністратора
    const admin = new User({
      firstName: 'Іван',
      lastName: 'Адмінко',
      email: 'admin@academy.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      phone: '+380671111111',
      redCoins: 0,
      isActive: true,
    });
    await admin.save();
    console.log('[seed]: Admin user created.');

    // 2. Створення Викладачів
    const teacher1 = new User({
      firstName: 'Олександр',
      lastName: 'Програмістченко',
      email: 'teacher1@academy.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.TEACHER,
      phone: '+380672222222',
      redCoins: 0,
      isActive: true,
    });

    const teacher2 = new User({
      firstName: 'Марія',
      lastName: 'Дизайненко',
      email: 'teacher2@academy.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.TEACHER,
      phone: '+380673333333',
      redCoins: 0,
      isActive: true,
    });

    await teacher1.save();
    await teacher2.save();
    console.log('[seed]: Teacher users created.');

    // 3. Створення Груп
    const group1 = new Group({
      name: 'JS-2026-Fullstack',
      description: 'Група вивчення повного стеку Javascript (React + Express)',
      teachers: [teacher1._id],
      students: [],
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-01'),
      isActive: true,
    });

    const group2 = new Group({
      name: 'UXUI-2026-Design',
      description: 'Група вивчення проектування інтерфейсів та дизайну',
      teachers: [teacher2._id],
      students: [],
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-10-15'),
      isActive: true,
    });

    await group1.save();
    await group2.save();
    console.log('[seed]: Groups created.');

    // 4. Створення Студентів
    const studentsData = [
      { firstName: 'Максим', lastName: 'Шевченко', email: 'student1@academy.com', group: group1._id },
      { firstName: 'Анна', lastName: 'Коваленко', email: 'student2@academy.com', group: group1._id },
      { firstName: 'Дмитро', lastName: 'Бойко', email: 'student3@academy.com', group: group1._id },
      { firstName: 'Олена', lastName: 'Кравченко', email: 'student4@academy.com', group: group2._id },
      { firstName: 'Владислав', lastName: 'Олійник', email: 'student5@academy.com', group: group2._id },
    ];

    const createdStudentsIds: mongoose.Types.ObjectId[] = [];

    for (const s of studentsData) {
      const student = new User({
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        passwordHash: defaultPasswordHash,
        role: UserRole.STUDENT,
        phone: '+380670000000',
        redCoins: Math.floor(Math.random() * 100), // Випадковий початковий баланс
        group: s.group,
        isActive: true,
      });
      await student.save();
      createdStudentsIds.push(student._id as mongoose.Types.ObjectId);

      // Додаємо студента до відповідної групи в базі
      if (s.group === group1._id) {
        group1.students.push(student._id as mongoose.Types.ObjectId);
      } else {
        group2.students.push(student._id as mongoose.Types.ObjectId);
      }
    }

    await group1.save();
    await group2.save();
    console.log('[seed]: Student users created and assigned to groups.');
    console.log('[seed]: Seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('[seed]: Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();