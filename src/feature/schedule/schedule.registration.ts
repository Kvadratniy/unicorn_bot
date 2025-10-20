import { Telegraf } from 'telegraf';
import { showScheduleByDayAction } from './actions/byDay.action';
import { showScheduleDetailsAction } from './actions/details.action';
import { showScheduleMenuAction } from './actions/menu.action';
import { cancelScheduleAction } from './actions/cancel.action';
import { getCallbackData } from '../../utils/helpers';
import { deleteSavedMessages } from '../../utils/keyboard';
import { scheduleService } from './schedule.service';

export function registerScheduleHandlers(bot: Telegraf<UnicornWizardContext>) {
    bot.action('schedule_menu', async (ctx) => {
        await deleteSavedMessages(ctx);
        await showScheduleMenuAction(ctx, 0);
    });

    // следующие 7 дней
    bot.action(/^schedule_day_next_(\d+)$/, async (ctx) => {
        await deleteSavedMessages(ctx);
        const offset = parseInt(ctx.match[1]);
        await showScheduleMenuAction(ctx, offset);
    });

    // предыдущие 7 дней
    bot.action(/^schedule_day_prev_(\d+)$/, async (ctx) => {
        await deleteSavedMessages(ctx);
        const offset = parseInt(ctx.match[1]);
        await showScheduleMenuAction(ctx, offset);
    });

    bot.hears(/^\/details\d+$/, async (ctx) => {
        await deleteSavedMessages(ctx);
        await showScheduleDetailsAction(ctx);
    });
    bot.action(/^schedule_day_(\d{4}-\d{2}-\d{2})$/, showScheduleByDayAction);

    // Пробное занятие
    bot.action(/^add_trial_student_lesson_(\d+)/, async (ctx) => {
        const data = getCallbackData(ctx);
        const match = data?.match(/add_trial_student_lesson_(\d+)/);
        if (!match) return;
        const studentId = Number(match[1]);
        await ctx.scene.enter('add-full-schedule-wizard', { studentId, type: 'TRIAL' });
    });

    // По абонементу
    bot.action(/^add_abonement_student_lesson_(\d+)/, async (ctx: any) => {
        const data = getCallbackData(ctx);
        const match = data?.match(/add_abonement_student_lesson_(\d+)/);
        if (!match) return;

        const teacher = await scheduleService.getTeacher(ctx.user.teacherId);

        console.log('teacher: ', teacher);
        if (!teacher) return;

        await ctx.scene.enter('add-teacher-schedule-wizard', {
            studentId: Number(match[1]),
            type: 'ABONEMENT',
            teacher: teacher,
            teacherId: ctx.user.teacherId,
        });
    });

    // Разовое
    bot.action(/^add_onetime_student_lesson_(\d+)/, async (ctx: any) => {
        const data = getCallbackData(ctx);
        const match = data?.match(/add_onetime_student_lesson_(\d+)/);
        if (!match) return;

        const teacher = await scheduleService.getTeacher(ctx.user.teacherId);

        console.log('teacher: ', teacher);
        if (!teacher) return;

        await ctx.scene.enter('add-teacher-schedule-wizard', {
            studentId: Number(match[1]),
            type: 'ONETIME',
            teacherId: teacher.id,
            teacher: teacher,
            subjectId: teacher.subjects[0],
        });
    });

    bot.action(/^cancel_schedule_\d+$/, cancelScheduleAction);
}
