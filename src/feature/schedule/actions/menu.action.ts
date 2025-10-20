import { Markup } from 'telegraf';
import { clearLastKeyboard, replyWithKeyboard } from '../../../utils/keyboard';
import { deleteMessageSafe } from '../../../utils/helpers';
import { buildDateButtons } from '../../../utils/date-buttons';

export async function showScheduleMenuAction(ctx: any, offsetDays = 0) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        await clearLastKeyboard(ctx);
        await deleteMessageSafe(ctx);

        // 🔹 генерируем кнопки дат через универсальную функцию
        const keyboard = buildDateButtons(offsetDays, 'schedule_day_');

        // 🔹 берём массив кнопок, чтобы можно было добавить свои
        const buttons = keyboard.reply_markup.inline_keyboard;

        // 🔹 добавляем дополнительные кнопки внизу
        buttons.push([Markup.button.callback('⬅ Назад', 'main_menu')]);

        await replyWithKeyboard(
            ctx,
            '📅 Выберите день для просмотра расписания:',
            Markup.inlineKeyboard(buttons),
        );
    } catch (err) {
        console.error('Ошибка showScheduleMenuAction:', err);
        await ctx.reply('⚠️ Ошибка при открытии меню расписания.');
    }
}
