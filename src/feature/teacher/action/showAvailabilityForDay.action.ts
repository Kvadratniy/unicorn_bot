import { Markup } from 'telegraf';
import { teacherService } from '../teacher.service';
import { deleteMessageSafe } from '../../../utils/helpers';

export async function showAvailabilityForDay(ctx: any, dateIso?: string) {
    try {
        if (!dateIso) return ctx.reply('⚠️ Не удалось определить дату.');
        await deleteMessageSafe(ctx);

        const teacherId = ctx.user?.teacher?.id;
        if (!teacherId) return ctx.reply('⚠️ Вы не преподаватель.');

        // 1️⃣ Получаем интервалы из сервиса
        const intervals = await teacherService.getTeacherAvailabilityForDay(teacherId, dateIso);

        // 2️⃣ Формируем текст
        const list = intervals.length ? intervals.join('\n') : 'Нет доступных интервалов.';

        // 3️⃣ Подготовка дат для навигации
        const date = new Date(dateIso);
        const prevDate = new Date(date);
        const nextDate = new Date(date);
        prevDate.setDate(date.getDate() - 1);
        nextDate.setDate(date.getDate() + 1);

        const prevIso = prevDate.toISOString().split('T')[0];
        const nextIso = nextDate.toISOString().split('T')[0];

        const dateLabel = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            weekday: 'long',
        });

        // 4️⃣ Отправляем сообщение
        await ctx.reply(`📆 *${dateLabel}*\n\n${list}`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить', `availability_add_${dateIso}`)],
                [
                    Markup.button.callback('⬅ Предыдущий день', `availability_day_${prevIso}`),
                    Markup.button.callback('➡ Следующий день', `availability_day_${nextIso}`),
                ],
                [Markup.button.callback('⬅ Назад', 'availability_menu')],
            ]),
        });
    } catch (err) {
        console.error('Ошибка showAvailabilityForDay:', err);
        await ctx.reply('⚠️ Ошибка при загрузке расписания.');
    }
}
