import { Markup } from 'telegraf';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../utils/keyboard';
import { deleteMessageSafe, getCallbackData } from '../../utils/helpers';
import { scheduleService } from '../../feature/schedule/schedule.service';

/**
 * Шаг выбора предмета
 * Возвращает:
 *  - 'next'  → если предмет выбран
 *  - 'leave' → если ошибка или отмена
 *  - undefined → если просто показали клавиатуру и ждём выбора
 */
export async function selectSubjectStep(ctx: any, state: any): Promise<'next' | 'leave' | void> {
    const data = getCallbackData(ctx);

    if (data === 'cancel_subject') {
        await replyMessage(ctx, '❌ Выбор предмета отменён.');
        return 'leave';
    }

    const match = data.match(/subject_(\d+)/);
    if (match) {
        const data = getCallbackData(ctx);
        await deleteMessageSafe(ctx);

        const subjectId = Number(match[1]);
        state.subjectId = subjectId;

        await clearLastKeyboard(ctx);

        const subject = await scheduleService.getSubjectWithTeachers(subjectId);
        if (!subject) {
            await replyMessage(ctx, '⚠️ Предмет не найден.');
            return 'leave';
        }

        await replyMessage(ctx, `📘 Вы выбрали предмет: *${subject.name}*`, {
            parse_mode: 'Markdown',
        });
        return 'next';
    }

    // ✅ Первый вызов шага — показать список предметов
    // await clearLastKeyboard(ctx);

    const subjects = await scheduleService.getSubjects();
    if (!subjects.length) {
        await replyMessage(ctx, '❌ Нет доступных предметов.');
        return 'leave';
    }

    const buttons = subjects.map((s) => [Markup.button.callback(s.name, `subject_${s.id}`)]);
    buttons.push([Markup.button.callback('❌ Отмена', 'cancel_subject')]);

    await replyWithKeyboard(ctx, '📚 Выберите предмет:', Markup.inlineKeyboard(buttons));

    return;
}
