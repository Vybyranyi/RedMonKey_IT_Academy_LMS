import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import type {
  ICoinFilters,
  ICoinTransactionDto,
  ILeaderboardFilters,
  ILeaderboardRow,
} from '@redmonkey/shared';
import { academyRepository } from '../repositories/academy.repository.js';
import { coinRepository } from '../repositories/coin.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';
import { accessPolicy } from './access.policy.js';

export const coinService = {
  async getTransactions(filters: ICoinFilters, actor: TokenPayload) {
    const where: Prisma.CoinTransactionWhereInput = {};
    if (filters.category) where.category = filters.category;

    // Звуження за роллю перекриває будь-який фільтр із query
    let groupIds = filters.groupId ? [filters.groupId] : undefined;
    if (actor.role === UserRole.TEACHER) {
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      if (filters.groupId && !ownGroupIds.includes(filters.groupId)) {
        throw new ForbiddenError('У вас немає доступу до цієї групи');
      }
      groupIds = groupIds ?? ownGroupIds;
    }

    if (actor.role === UserRole.STUDENT) {
      where.studentId = actor.userId;
    } else {
      // Групу фільтруємо через id її студентів, а не через зв'язок student.groupId:
      // так Postgres іде індексом coin_transactions(student_id, created_at), а не
      // сканує весь ledger. Заміри — у backend/prisma/QUERY_PLANS.md
      const studentFilter: Prisma.UuidFilter = {};
      if (filters.studentId) studentFilter.equals = filters.studentId;
      if (groupIds) studentFilter.in = await userRepository.findStudentIdsByGroups(groupIds);
      if (filters.studentId || groupIds) where.studentId = studentFilter;
    }

    const page = await coinRepository.findPage(where, filters.limit, filters.cursor);
    if (!page) throw new BadRequestError('Некоректний курсор пагінації');
    return page;
  },

  async createTransaction(data: ICoinTransactionDto, actor: TokenPayload) {
    const student = await userRepository.findById(data.studentId);
    if (!student || !student.isActive || student.role !== UserRole.STUDENT) {
      throw new NotFoundError('Студента не знайдено');
    }

    // Викладач нараховує монети лише студентам своїх груп — так само, як
    // оцінки він ставить лише за свої заняття
    if (actor.role === UserRole.TEACHER) {
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      if (!student.groupId || !ownGroupIds.includes(student.groupId)) {
        throw new ForbiddenError('Нараховувати монети можна лише студентам своїх груп');
      }
    }

    const academyId = await academyRepository.getDefaultId();

    const transaction = await coinRepository.createWithBalance({
      academyId,
      studentId: data.studentId,
      issuedBy: actor.userId,
      amount: data.amount,
      reason: data.reason,
      category: data.category,
      relatedLessonId: data.relatedLessonId ?? null,
    });

    // null означає, що списання завело б баланс у мінус: ledger append-only,
    // тож обрізати суму не можна — сума транзакцій має дорівнювати балансу
    if (!transaction) {
      throw new BadRequestError(
        `Недостатньо монет на балансі студента (зараз ${student.redCoins})`
      );
    }

    return transaction;
  },

  async getLeaderboard(filters: ILeaderboardFilters, actor: TokenPayload): Promise<ILeaderboardRow[]> {
    const where: Prisma.UserWhereInput = { role: UserRole.STUDENT, isActive: true };
    if (filters.groupId) where.groupId = filters.groupId;

    // Студент бачить рейтинг лише своєї групи — чужі бали його не стосуються
    if (actor.role === UserRole.STUDENT) {
      const self = await userRepository.findById(actor.userId);
      if (!self?.groupId) return [];
      where.groupId = self.groupId;
    }

    const students = await coinRepository.findLeaderboard(where, filters.limit);

    return students.map((student, index) => ({
      position: index + 1,
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      avatar: student.avatar,
      groupName: student.group?.name ?? null,
      redCoins: student.redCoins,
    }));
  },

  async getBalance(studentId: string, actor: TokenPayload) {
    const student = await userRepository.findById(studentId);
    if (!student || !student.isActive) {
      throw new NotFoundError('Студента не знайдено');
    }

    const allowed = await accessPolicy.canViewUser(actor, {
      id: student.id,
      role: student.role as UserRole,
      groupId: student.groupId ?? null,
    });
    if (!allowed) {
      throw new ForbiddenError('У вас немає доступу до балансу цього студента');
    }

    const { earned, spent } = await coinRepository.sumByDirection(studentId);

    return { studentId: student.id, balance: student.redCoins, earned, spent };
  },
};
