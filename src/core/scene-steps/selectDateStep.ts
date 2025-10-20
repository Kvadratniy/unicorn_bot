import { buildDateButtons } from '../../utils/date-buttons';
import { getCallbackData } from '../../utils/helpers';
import { getScheduleTextByDate } from '../../feature/schedule/utils/schedule-day-list';
import { replyMessage } from '../../utils/keyboard';

export async function selectDateStep(ctx: any, state: any) {
    const data = getCallbackData(ctx);
    console.log('data: ', data);

    // 🔹 Проверяем навигацию (⬅ / ➡)
    const offsetMatch = data?.match(/date_(prev|next)_(\-?\d+)/);
    if (offsetMatch) {
        const offset = parseInt(offsetMatch[2], 10);
        console.log('offsetMatch offset:', offset);
        await ctx.editMessageReplyMarkup(buildDateButtons(offset, 'date_').reply_markup);
        return; // остаёмся на этом шаге
    }

    // 🔹 Проверяем выбор конкретной даты
    const match = data?.match(/date_(\d{4}-\d{2}-\d{2})/);
    if (match) {
        const dateIso = match[1];
        state.date = dateIso;
        const schedule = await getScheduleTextByDate(dateIso);
        await replyMessage(ctx, schedule, { parse_mode: 'Markdown' });
        return 'next';
    }

    // 🔹 Первый вызов — показываем текущую неделю
    await replyMessage(ctx, '📅 Выберите дату:', buildDateButtons(0, 'date_'));
}
