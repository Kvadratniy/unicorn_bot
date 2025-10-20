import prisma from '../core/prisma';

export async function userContextMiddleware(ctx: any, next: any) {
    try {
        // 🔹 Пропускаем системные апдейты (например, от CRON)
        if (!ctx.from?.id) return next();

        // 🔹 Гарантируем, что сессия существует
        if (!ctx.session) ctx.session = {};

        // ⚡️ Если в сессии нет user — грузим из базы
        if (!ctx.session.user) {
            const telegramId = ctx.from.id.toString();
            const user = await prisma.user.findUnique({
                where: { telegramId },
                include: {
                    teacher: {
                        include: {
                            subjects: true,
                            students: true,
                        },
                    },
                },
            });

            if (user) {
                ctx.session.user = user;
            } else {
                console.warn(`⚠️ Пользователь ${telegramId} не найден`);
            }
        }

        // 📦 Кладём в контекст для быстрого доступа
        ctx.user = ctx.session.user;

        return next();
    } catch (err) {
        console.error('❌ Ошибка userContextMiddleware:', err);
        return next();
    }
}
