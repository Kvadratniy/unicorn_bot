import { Markup } from 'telegraf';
import prisma from '../../../core/prisma';

/**
 * Action для показа баланса преподавателя
 */
export async function showTeacherBalanceAction(ctx: any) {
    try {
        await ctx.answerCbQuery();

        const telegramId = String(ctx.from.id);

        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: { teacher: true },
        });

        if (!user || !user.teacher) {
            return ctx.editMessageText('❌ Вы не являетесь преподавателем.', {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('⬅ Назад', 'main_menu')],
                ]).reply_markup,
            });
        }

        const balance = user.teacher.balance.toFixed(2);

        const text = `💰 *Ваш текущий баланс:* ${balance} ₽`;

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅ Назад', 'main_menu')]])
                .reply_markup,
        });
    } catch (err) {
        console.error('Ошибка при получении баланса преподавателя:', err);

        await ctx.editMessageText('⚠️ Произошла ошибка при получении баланса.', {
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅ Назад', 'main_menu')]])
                .reply_markup,
        });
    }
}
