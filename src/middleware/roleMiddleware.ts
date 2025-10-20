import { Context } from 'telegraf';
import prisma, { Role } from '../core/prisma';

export async function roleMiddleware(ctx: Context, next: () => Promise<any>) {
    if (!ctx.from) return next();

    let user = (ctx as any).user; // если уже есть — используем

    if (!user) {
        const telegramId = ctx.from.id.toString();

        user = await prisma.user.findUnique({ where: { telegramId } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    telegramId,
                    username: ctx.from?.username ?? null,
                    role: ['440005074', '248543646'].includes(telegramId) ? Role.ADMIN : Role.GUEST,
                },
            });
            console.log(`👤 Создан новый пользователь: ${telegramId}`);
        }

        (ctx as any).user = user; // сохраняем в контекст
    }

    if (user.role === 'GUEST') {
        await ctx.reply('🔒 Доступ ограничен. Свяжитесь с администратором для полного доступа.');
        return;
    }

    return next();
}
