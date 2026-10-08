-- RLS без жодної політики = «нікому, крім власника таблиць».
--
-- Застосунок підключається як власник таблиць (той, хто накотив міграції), а власник
-- RLS не підпорядковується — для backend нічого не змінюється. Закриваються ролі
-- anon/authenticated, через які Supabase Data API (PostgREST) читав би таблиці
-- публічним anon-ключем, якщо Data API колись увімкнуть. Основний захист — Data API
-- вимкнено в налаштуваннях проєкту (docs/DEPLOY.md); це друга лінія.
--
-- Справжні політики за access.policy.ts — окрема задача (див. CLAUDE.md, «RLS»).

ALTER TABLE "academies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coin_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
