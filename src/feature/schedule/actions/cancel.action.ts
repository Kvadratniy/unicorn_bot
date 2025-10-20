import { scheduleService } from '../schedule.service';

export async function cancelScheduleAction(ctx: any) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

        const data = ctx.callbackQuery?.data || '';
        const match = data.match(/cancel_schedule_(\d+)/);
        const id = match ? parseInt(match[1], 10) : NaN;

        if (isNaN(id)) {
            return ctx.reply('⚠️ Неверная команда.');
        }

        // 🧾 Отменяем занятие
        const schedule = await scheduleService.cancelSchedule(id);
        if (!schedule) {
            return ctx.reply('❌ Занятие не найдено.');
        }

        // 📬 Уведомляем преподавателя
        await scheduleService.notifyTeacherAboutCancellation(ctx, schedule);

        // ✅ Ответ пользователю
        await ctx.editMessageText('✅ Занятие успешно отменено.');
    } catch (err) {
        console.error('Ошибка при отмене занятия:', err);
        await ctx.reply('⚠️ Произошла ошибка при отмене занятия.');
    }
}
