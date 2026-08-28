import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { LessonType, UserRole } from '@redmonkey/shared';
import { prisma } from '../lib/prisma.js';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Password123!';

const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[seed]: відмова запускатись у production — seed стирає базу.');
  }

  console.log('[seed]: Starting database seeding...');

  // Очищення у порядку FK (діти → батьки).
  await prisma.coinTransaction.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.lessonMaterial.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.groupTeacher.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.academy.deleteMany();
  console.log('[seed]: Existing data cleared.');

  const academy = await prisma.academy.create({ data: { name: 'RedMonKey IT Academy' } });
  const academyId = academy.id;

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  await prisma.user.create({
    data: {
      academyId,
      firstName: 'Іван',
      lastName: 'Адмінко',
      email: 'admin@academy.com',
      passwordHash,
      role: UserRole.ADMIN,
      phone: '+380671111111',
    },
  });
  console.log('[seed]: Admin user created.');

  const teacher1 = await prisma.user.create({
    data: {
      academyId,
      firstName: 'Олександр',
      lastName: 'Програмістченко',
      email: 'teacher1@academy.com',
      passwordHash,
      role: UserRole.TEACHER,
      phone: '+380672222222',
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      academyId,
      firstName: 'Марія',
      lastName: 'Дизайненко',
      email: 'teacher2@academy.com',
      passwordHash,
      role: UserRole.TEACHER,
      phone: '+380673333333',
    },
  });
  console.log('[seed]: Teacher users created.');

  const group1 = await prisma.group.create({
    data: {
      academyId,
      name: 'JS-2026-Fullstack',
      description: 'Група вивчення повного стеку Javascript (React + Express)',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-01'),
      teachers: { create: [{ teacherId: teacher1.id, academyId }] },
    },
  });

  const group2 = await prisma.group.create({
    data: {
      academyId,
      name: 'UXUI-2026-Design',
      description: 'Група вивчення проектування інтерфейсів та дизайну',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-10-15'),
      teachers: { create: [{ teacherId: teacher2.id, academyId }] },
    },
  });
  console.log('[seed]: Groups created.');

  const studentsData = [
    { firstName: 'Максим', lastName: 'Шевченко', email: 'student1@academy.com', groupId: group1.id },
    { firstName: 'Анна', lastName: 'Коваленко', email: 'student2@academy.com', groupId: group1.id },
    { firstName: 'Дмитро', lastName: 'Бойко', email: 'student3@academy.com', groupId: group1.id },
    { firstName: 'Олена', lastName: 'Кравченко', email: 'student4@academy.com', groupId: group2.id },
    { firstName: 'Владислав', lastName: 'Олійник', email: 'student5@academy.com', groupId: group2.id },
  ];

  await prisma.user.createMany({
    data: studentsData.map((s) => ({
      academyId,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      passwordHash,
      role: UserRole.STUDENT,
      phone: '+380670000000',
      redCoins: Math.floor(Math.random() * 100),
      groupId: s.groupId,
    })),
  });
  console.log('[seed]: Student users created and assigned to groups.');

  // Дати рахуються від дня запуску сіда, а не зашиті константами: інакше вже
  // через два тижні календар відкривався б порожнім.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const lessonAt = (dayOffset: number, hours: number) => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hours, 0, 0, 0);
    return date;
  };

  const lessonsData = [
    { title: 'React: компоненти та props', type: LessonType.LECTURE, date: lessonAt(0, 10), duration: 80, group: group1, teacherId: teacher1.id },
    { title: 'Практика: верстка картки товару', type: LessonType.PRACTICE, date: lessonAt(2, 14), duration: 120, group: group1, teacherId: teacher1.id },
    { title: 'Консультація перед модулем', type: LessonType.CONSULTATION, date: lessonAt(5, 18), duration: 45, group: group1, teacherId: teacher1.id },
    { title: 'Модульний іспит: основи JavaScript', type: LessonType.EXAM, date: lessonAt(9, 9), duration: 180, group: group1, teacherId: teacher1.id },
    { title: 'Принципи візуальної ієрархії', type: LessonType.LECTURE, date: lessonAt(1, 11), duration: 80, group: group2, teacherId: teacher2.id },
    { title: 'Практика: прототип у Figma', type: LessonType.PRACTICE, date: lessonAt(4, 16), duration: 120, group: group2, teacherId: teacher2.id },
    { title: 'Розбір домашніх робіт', type: LessonType.CONSULTATION, date: lessonAt(8, 19), duration: 60, group: group2, teacherId: teacher2.id },
    { title: 'Захист навчального проєкту', type: LessonType.EXAM, date: lessonAt(12, 13), duration: 180, group: group2, teacherId: teacher2.id },
  ];

  await prisma.lesson.createMany({
    data: lessonsData.map((lesson) => ({
      academyId,
      groupId: lesson.group.id,
      teacherId: lesson.teacherId,
      title: lesson.title,
      description: `${lesson.title} — заняття групи ${lesson.group.name}`,
      date: lesson.date,
      duration: lesson.duration,
      type: lesson.type,
    })),
  });
  console.log(`[seed]: ${lessonsData.length} lessons created for the next two weeks.`);

  console.log('[seed]: Seeding completed successfully!');
};

seedDatabase()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[seed]: Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
