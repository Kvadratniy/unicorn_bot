import { Telegraf } from 'telegraf';
import { showAvailabilityDates } from './action/showAvailabilityDates.action';
import { showAvailabilityForDay } from './action/showAvailabilityForDay.action';
import { showTeacherBalanceAction } from './action/balance.action';

export function registerTeacherHandlers(bot: Telegraf<any>) {
    bot.action('availability_menu', async (ctx) => showAvailabilityDates(ctx, 0));

    // следующие 7 дней
    bot.action(/^availability_day_next_(\d+)$/, async (ctx) => {
        const offset = parseInt(ctx.match[1]);
        await showAvailabilityDates(ctx, offset);
    });

    // предыдущие 7 дней
    bot.action(/^availability_day_prev_(\d+)$/, async (ctx) => {
        const offset = parseInt(ctx.match[1]);
        await showAvailabilityDates(ctx, offset);
    });

    bot.action(/^availability_day_(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
        const match = ctx.match;
        const dateIso = match?.[1];

        if (!dateIso) {
            await ctx.reply('⚠️ Не удалось определить дату.');
            return;
        }
        await showAvailabilityForDay(ctx, dateIso);
    });

    bot.action(/^availability_add_(\d{4}-\d{2}-\d{2})$/, (ctx) =>
        ctx.scene.enter('add-availability'),
    );

    bot.action('teacher_balance', showTeacherBalanceAction);
}
