import { Markup } from 'telegraf';
import { getCallbackData } from '../../utils/helpers';
import { replyMessage, replyWithKeyboard } from '../../utils/keyboard';
import { teacherService } from '../../feature/teacher/teacher.service';

/**
 * Шаг выбора даты пробного занятия
 */
export async function selectTrialDateStep(ctx: any, state: any) {
    const data = getCallbackData(ctx);

    // ✅ Пользователь выбрал дату
    const match = data?.match(/date_(\d{4}-\d{2}-\d{2})/);
    if (match) {
        const dateIso = match[1];
        state.date = dateIso;
        await replyMessage(ctx, `📅 Вы выбрали дату: *${dateIso}*`, { parse_mode: 'Markdown' });
        return 'next';
    }

    // ⚠️ Проверяем наличие предмета
    const subjectId = state.subjectId;
    if (!subjectId) {
        await replyMessage(ctx, '⚠️ Предмет не выбран.');
        return 'leave';
    }

    // 📅 Получаем список свободных дат из сервиса
    const freeDates = await teacherService.getFreeDaysBySubject(subjectId);

    if (!freeDates.length) {
        await replyMessage(ctx, '😕 Нет свободных дней для этого предмета.');
        return 'leave';
    }

    // 🧱 Формируем клавиатуру
    const buttons = freeDates.map((d) => [
        Markup.button.callback(
            new Date(d).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                weekday: 'short',
            }),
            `date_${d}`,
        ),
    ]);

    await replyWithKeyboard(ctx, '📅 Выберите свободную дату:', Markup.inlineKeyboard(buttons));
}
