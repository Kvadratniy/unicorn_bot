import { Markup } from 'telegraf';
import { scheduleService } from '../schedule.service';
import { mergeFreeSlots } from '../../../utils/mergeFreeSlots';
import { formatScheduleText } from '../../../utils/formatScheduleText';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../../utils/keyboard';
import { deleteMessageSafe } from '../../../utils/helpers';
import { toUTCfromMSK } from '../../../utils/time';

export async function showScheduleByDayAction(ctx: any) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        await clearLastKeyboard(ctx);
        await deleteMessageSafe(ctx);

        const match = ctx.match?.[1];
        if (!match) return ctx.reply('⚠️ Не удалось определить дату.');

        // --- вычисляем диапазон дат ---
        const [year, month, day] = match.split('-').map(Number);
        const localDate = new Date(Date.UTC(year, month - 1, day));
        const nextLocalDay = new Date(Date.UTC(year, month - 1, day + 1));
        const startUTC = toUTCfromMSK(localDate);
        const endUTC = toUTCfromMSK(nextLocalDay);
        const currentDay = localDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

        // === Занятия ===
        const schedules = await scheduleService.getSchedulesByDateRange(startUTC, endUTC);
        let text = `📆 *${currentDay}*\n\n` + formatScheduleText(schedules);

        // === Доступности преподавателей ===
        const user = ctx.user;
        if (user?.role === 'ADMIN') {
            const availabilities = await scheduleService.getTeacherAvailabilitiesByDay(
                startUTC,
                endUTC,
            );
            if (availabilities.length) {
                text += `🕓 *Свободное время преподавателей:*\n\n`;
                const freeSlots = mergeFreeSlots(availabilities, schedules);
                for (const tId in freeSlots) text += `${freeSlots[tId]}\n`;
            } else {
                text += `🕓 *Нет данных о доступности преподавателей.*\n`;
            }
        }

        // === Кнопки навигации ===
        const prevDate = new Date(localDate);
        const nextDate = new Date(localDate);
        prevDate.setDate(localDate.getDate() - 1);
        nextDate.setDate(localDate.getDate() + 1);
        const prevIso = prevDate.toISOString().split('T')[0];
        const nextIso = nextDate.toISOString().split('T')[0];

        await replyMessage(ctx, text.trim(), { parse_mode: 'Markdown' });
        await replyWithKeyboard(
            ctx,
            'Выберите действие:',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('⬅ Предыдущий день', `schedule_day_${prevIso}`),
                    Markup.button.callback('➡ Следующий день', `schedule_day_${nextIso}`),
                ],
                [Markup.button.callback('📋 Назад в меню', 'schedule_menu')],
            ]),
        );
    } catch (err) {
        console.error('Ошибка showScheduleByDayAction:', err);
        await ctx.reply('⚠️ Ошибка при загрузке расписания.');
    }
}
