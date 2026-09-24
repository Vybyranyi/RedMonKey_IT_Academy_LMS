import { describe, expect, it } from "vitest";
import { UserRole } from "@redmonkey/shared";
import { accessPolicy } from "./access.policy.js";
import { TokenPayload } from "../utils/jwt.js";

// Тільки гілки, що не читають БД (admin / self / синхронні перевірки) —
// не мокаємо репозиторії, бо ці шляхи в них взагалі не заходять.
describe("accessPolicy", () => {
  describe("canViewUser", () => {
    it("дозволяє адміну бачити будь-якого користувача", async () => {
      const admin: TokenPayload = { userId: "admin-1", role: UserRole.ADMIN };

      const result = await accessPolicy.canViewUser(admin, {
        id: "someone-else",
        role: UserRole.STUDENT,
        groupId: null,
      });

      expect(result).toBe(true);
    });

    it("дозволяє користувачу бачити самого себе", async () => {
      const student: TokenPayload = { userId: "student-1", role: UserRole.STUDENT };

      const result = await accessPolicy.canViewUser(student, {
        id: "student-1",
        role: UserRole.STUDENT,
        groupId: "group-1",
      });

      expect(result).toBe(true);
    });

    it("забороняє студенту бачити чужий профіль", async () => {
      const student: TokenPayload = { userId: "student-1", role: UserRole.STUDENT };

      const result = await accessPolicy.canViewUser(student, {
        id: "student-2",
        role: UserRole.STUDENT,
        groupId: "group-1",
      });

      expect(result).toBe(false);
    });
  });

  describe("canViewGroup", () => {
    it("дозволяє викладачу бачити лише свої групи", async () => {
      const teacher: TokenPayload = { userId: "teacher-1", role: UserRole.TEACHER };

      await expect(
        accessPolicy.canViewGroup(teacher, { teacherIds: ["teacher-1"], studentIds: [] })
      ).resolves.toBe(true);
      await expect(
        accessPolicy.canViewGroup(teacher, { teacherIds: ["teacher-2"], studentIds: [] })
      ).resolves.toBe(false);
    });

    it("дозволяє студенту бачити лише групу, де він числиться", async () => {
      const student: TokenPayload = { userId: "student-1", role: UserRole.STUDENT };

      await expect(
        accessPolicy.canViewGroup(student, { teacherIds: [], studentIds: ["student-1"] })
      ).resolves.toBe(true);
      await expect(
        accessPolicy.canViewGroup(student, { teacherIds: [], studentIds: ["student-2"] })
      ).resolves.toBe(false);
    });
  });

  describe("canManageLesson / canManageGrade", () => {
    it("дозволяє редагувати заняття лише адміну або викладачу-власнику", () => {
      const owner: TokenPayload = { userId: "teacher-1", role: UserRole.TEACHER };
      const other: TokenPayload = { userId: "teacher-2", role: UserRole.TEACHER };
      const target = { teacherId: "teacher-1", groupId: "group-1" };

      expect(accessPolicy.canManageLesson(owner, target)).toBe(true);
      expect(accessPolicy.canManageLesson(other, target)).toBe(false);
    });

    it("дозволяє редагувати оцінку лише адміну або викладачу, який її виставив", () => {
      const admin: TokenPayload = { userId: "admin-1", role: UserRole.ADMIN };
      const wrongTeacher: TokenPayload = { userId: "teacher-2", role: UserRole.TEACHER };
      const target = { teacherId: "teacher-1" };

      expect(accessPolicy.canManageGrade(admin, target)).toBe(true);
      expect(accessPolicy.canManageGrade(wrongTeacher, target)).toBe(false);
    });
  });
});
