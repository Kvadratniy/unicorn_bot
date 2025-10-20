import { scheduleService } from '../../feature/schedule/schedule.service';
import { replyMessage } from '../../utils/keyboard';

function hhmm(d: Date) {
    return d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
    });
}

/**
 * Шаг выбора времени занятия
 * Возвращает:
 *  - 'next' → если всё ок (время выбрано и свободно)
 *  - undefined → если ждём ввода
 *  - 'leave' → если ошибка или конфликт
 */
export async function selectTimeStep(ctx: any, state: any): Promise<'next' | 'leave' | void> {
    // === 🕐 Пользователь вводит текст (время) ===
    if (ctx.message && 'text' in ctx.message) {
        const time = ctx.message.text.trim();

        if (!/^\d{2}:\d{2}$/.test(time)) {
            await replyMessage(
                ctx,
                '❌ Некорректный формат. Введите время в виде ЧЧ:ММ (например, 14:30).',
            );
            return;
        }

        const { teacherId, subjectId, date, type } = state;
        const localDate = new Date(`${date}T${time}:00+03:00`);

        const subject = await scheduleService.getSubjectWithTeachers(subjectId!);
        const duration = type === 'TRIAL' ? 40 : subject?.duration || 60;
        const endDate = new Date(localDate.getTime() + duration * 60000);

        const conflict = await scheduleService.hasConflict(teacherId!, localDate, endDate);
        if (conflict) {
            await replyMessage(ctx, '⚠️ В это время уже есть занятие!');
            return;
        }

        state.startDate = localDate;
        state.endDate = endDate;

        await replyMessage(
            ctx,
            `✅ Время выбрано!\n📅 ${localDate.toLocaleDateString('ru-RU')}\n🕒 ${hhmm(localDate)} – ${hhmm(endDate)}`,
            { parse_mode: 'Markdown' },
        );

        return 'next';
    }

    // === 🕓 Первый вызов — просим ввести время ===
    await replyMessage(ctx, `🕓 Укажите время начала занятия в формате *ЧЧ:ММ*`, {
        parse_mode: 'Markdown',
    });

    return; // остаёмся на шаге, ждём текстовый ввод
}
