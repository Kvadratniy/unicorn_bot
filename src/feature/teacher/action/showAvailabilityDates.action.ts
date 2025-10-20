import { Markup } from 'telegraf';
import { replyWithKeyboard } from '../../../utils/keyboard';
import { buildDateButtons } from '../../../utils/date-buttons';
import { deleteMessageSafe } from '../../../utils/helpers';

export async function showAvailabilityDates(ctx: any, offsetDays = 0) {
    await deleteMessageSafe(ctx);
    const keyboard = buildDateButtons(offsetDays, 'availability_day_');

    const buttons = keyboard.reply_markup.inline_keyboard;
    buttons.push([Markup.button.callback('⬅ Назад', 'main_menu')]);

    await replyWithKeyboard(
        ctx,
        '📅 Выберите день для редактирования рабочего времени:',
        Markup.inlineKeyboard(buttons),
    );
}
