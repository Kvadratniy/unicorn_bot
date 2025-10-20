import { Markup } from 'telegraf';
import { scheduleService } from '../schedule.service';
import { clearLastKeyboard, replyWithKeyboard } from '../../../utils/keyboard';
import { toMSKfromUTC } from '../../../utils/time'; // ✅ преобразование времени
import { getCallbackData } from '../../../utils/helpers'; // 🔧 безопасный парсинг данных

export async function showScheduleDetailsAction(ctx: any) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        await clearLastKeyboard(ctx);

        // --- 1️⃣ Извлекаем ID занятия ---
        const data = getCallbackData(ctx) || ctx.message?.text || '';
        const match = data.match(/details(\d+)/);
        const scheduleId = match ? parseInt(match[1], 10) : NaN;

        if (isNaN(scheduleId)) {
            return ctx.reply('⚠️ Неверная команда или ID занятия.');
        }

        // --- 2️⃣ Загружаем занятие ---
        const schedule = await scheduleService.getScheduleDetails(scheduleId);
        if (!schedule) {
            return ctx.reply('❌ Занятие не найдено.');
        }

        // --- 3️⃣ Преобразуем дату и время ---
        const mskDate = toMSKfromUTC(schedule.startDate);

        // --- 4️⃣ Формируем список учеников ---
        const studentsList = schedule.visits?.length
            ? schedule.visits.map((v) =>
                  `${v.student.firstName} ${v.student.lastName ?? ''}`.trim(),
              )
            : schedule.students?.map((s) => `${s.firstName} ${s.lastName ?? ''}`.trim()) || [];

        const students = studentsList.length ? studentsList.join(', ') : '—';

        // --- 5️⃣ Формируем сообщение ---
        const message =
            `🕒 *Детали занятия:*\n\n` +
            `📅 *Дата:* ${mskDate.toLocaleDateString('ru-RU')}\n` +
            `⏰ *Время:* ${mskDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
            })}\n\n` +
            `👨‍🏫 *Преподаватель:* ${schedule.teacher.name}\n` +
            `👨‍🎓 *Ученик(и):* ${students}\n` +
            `📘 *Предмет:* ${schedule.subject.name}`;

        // --- 6️⃣ Формируем клавиатуру ---
        const keyBack = mskDate.toISOString().split('T')[0];
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('❌ Отменить', `cancel_schedule_${schedule.id}`)],
            [Markup.button.callback('⬅ Назад', `schedule_day_${keyBack}`)],
        ]);

        // --- 7️⃣ Отправляем пользователю ---
        await replyWithKeyboard(ctx, message, keyboard, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Ошибка при показе деталей занятия:', err);
        await ctx.reply('⚠️ Произошла ошибка при получении информации о занятии.');
    }
}
