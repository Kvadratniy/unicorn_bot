import { Markup } from 'telegraf';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../utils/keyboard';
import {deleteMessageSafe, getCallbackData, removeInlineKeyboard, subtractBusyIntervals} from '../../utils/helpers';
import { scheduleService } from '../../feature/schedule/schedule.service';

export async function selectTrialTeacherStep(
    ctx: any,
    state: any,
): Promise<'next' | 'leave' | void> {
    const data = getCallbackData(ctx);

    // === ⬅️ Обработка кнопки Назад ===
    if (data === 'back_to_date') {
        await deleteMessageSafe(ctx);
        await clearLastKeyboard(ctx);
        await replyMessage(ctx, '🔙 Возврат к выбору даты...');
        ctx.wizard.back();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }

    // === 🧩 Пользователь выбрал преподавателя ===
    if (data === 'cancel_teacher') {
        await replyMessage(ctx, '❌ Выбор преподавателя отменён.');
        return 'leave';
    }

    const match = data.match(/teacher_(\d+)/);

    if (match) {
        const teacherId = Number(match[1]);
        await removeInlineKeyboard(ctx);
        state.teacherId = teacherId;
        await clearLastKeyboard(ctx);

        const date = new Date(state.date!);
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        // Получаем занятость и доступность
        const allSchedules = await scheduleService.getTeacherSchedulesForDate(
            teacherId,
            startOfDay,
            endOfDay,
        );
        const busy = allSchedules.map((s: any) => ({ start: s.startDate, end: s.endDate }));

        const availability = await scheduleService.getTeacherAvailability(
            teacherId,
            startOfDay,
            endOfDay,
        );
        if (!availability.length) {
            await replyMessage(ctx, '❌ У преподавателя нет доступности в этот день.');
            return 'leave';
        }

        // Рассчитываем свободные интервалы
        const rawFree: { start: string; end: string }[] = [];
        for (const slot of availability) {
            const freed = subtractBusyIntervals({ start: slot.startDate, end: slot.endDate }, busy);
            rawFree.push(...freed);
        }

        const freeSlots = mergeSlots(rawFree);
        if (!freeSlots.length) {
            await replyMessage(ctx, '😔 У преподавателя нет свободного времени в этот день.');
            return 'leave';
        }

        await replyMessage(ctx, `👨‍🏫 Преподаватель выбран.`, { parse_mode: 'Markdown' });

        return 'next';
    }

    // === 🧭 Первый запуск — показать только свободных преподавателей ===
    await clearLastKeyboard(ctx);
    const subject = await scheduleService.getSubjectWithTeachers(state.subjectId!);

    if (!subject?.teachers?.length) {
        await replyMessage(ctx, '❌ Нет преподавателей для этого предмета.');
        return 'leave';
    }

    const date = new Date(state.date);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const freeTeachers = [];

    for (const teacher of subject.teachers) {
        const schedules = await scheduleService.getTeacherSchedulesForDate(
            teacher.id,
            startOfDay,
            endOfDay,
        );
        const busy = schedules.map((s: any) => ({ start: s.startDate, end: s.endDate }));

        const availability = await scheduleService.getTeacherAvailability(
            teacher.id,
            startOfDay,
            endOfDay,
        );

        if (!availability.length) continue;

        const rawFree: { start: string; end: string }[] = [];
        for (const slot of availability) {
            const freed = subtractBusyIntervals({ start: slot.startDate, end: slot.endDate }, busy);
            rawFree.push(...freed);
        }

        const freeSlots = mergeSlots(rawFree);
        if (freeSlots.length) {
            freeTeachers.push({ teacher, freeSlots });
        }
    }

    if (!freeTeachers.length) {
        await replyMessage(ctx, '😕 В этот день нет свободных преподавателей.');
        return 'leave';
    }

    state.freeTeachers = freeTeachers;

    const formatted = new Date(state.date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        weekday: 'long',
    });

    // === 💬 Формируем текст с именами и временем ===
    let messageText = `📅 Дата: *${formatted}*\n\n👨‍🏫 Доступные преподаватели:\n`;

    for (const { teacher, freeSlots } of freeTeachers) {
        const slotsText = freeSlots.map((s) => `    • ${s.start}–${s.end}`).join('\n');
        messageText += `\n*${teacher.name}*\n${slotsText}\n`;
    }

    messageText += `\nВыберите преподавателя или вернитесь назад:`;

    // === 🧱 Кнопки ===
    const buttons = freeTeachers.map((t) => [
        Markup.button.callback(t.teacher.name, `teacher_${t.teacher.id}`),
    ]);

    // добавляем "⬅️ Назад" и "❌ Отмена"
    buttons.push([
        Markup.button.callback('⬅️ Назад', 'back_to_date'),
        Markup.button.callback('❌ Отмена', 'cancel_teacher'),
    ]);

    await replyWithKeyboard(ctx, messageText, Markup.inlineKeyboard(buttons), {
        parse_mode: 'Markdown',
    });

    return;
}

// === ⏱️ Объединение интервалов ===
function mergeSlots(slots: { start: string; end: string }[]) {
    if (!slots.length) return [];
    const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const fromMin = (x: number) =>
        `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
    const arr = slots
        .map((s) => ({ s: toMin(s.start), e: toMin(s.end) }))
        .sort((a, b) => a.s - b.s);
    const merged: { s: number; e: number }[] = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
        const last = merged[merged.length - 1];
        const cur = arr[i];
        if (cur.s <= last.e) last.e = Math.max(last.e, cur.e);
        else merged.push(cur);
    }
    return merged.map((x) => ({ start: fromMin(x.s), end: fromMin(x.e) }));
}
