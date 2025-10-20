import { scheduleService } from '../../schedule.service';
import { showMainMenu } from '../../../menu/menus';
import { toMSKfromUTC } from '../../../../utils/time';
import { studentService } from '../../../student/student.service';

export async function saveScheduleStep(ctx: any, state: any): Promise<'leave'> {
    const { studentId, teacherId, subjectId, startDate, endDate, type, abonementId } = state;
    console.log('state: ', state);

    // 1️⃣ Создаём занятие
    await scheduleService.createLesson(
        startDate,
        endDate,
        studentId,
        teacherId,
        subjectId,
        type,
        abonementId,
    );

    // 2️⃣ Уведомляем преподавателя о пробном (если нужно)
    try {
        // const teacher = await scheduleService.getTeacher(teacherId);
        // const student = await studentService.getStudent(studentId);
        // const subject = await scheduleService.getSubjectWithTeachers(subjectId);
        // if (type === 'TRIAL' && teacher?.user?.telegramId) {
        //     const msg =
        //         `📅 *Новое пробное занятие!*\n\n` +
        //         `👨‍🎓 Ученик: *${student?.firstName} ${student?.lastName ?? ''}*\n` +
        //         `📘 Предмет: *${subject?.name ?? '-'}*\n` +
        //         `🕒 ${toMSKfromUTC(startDate).toLocaleTimeString('ru-RU', {
        //             hour: '2-digit',
        //             minute: '2-digit',
        //         })}\n` +
        //         `📍 Дата: ${toMSKfromUTC(startDate).toLocaleDateString('ru-RU')}`;
        //
        //     await ctx.telegram
        //         .sendMessage(teacher.user.telegramId, msg, { parse_mode: 'Markdown' })
        //         .catch(() => {});
        // }
    } catch (err) {
        console.warn('⚠️ Ошибка при отправке уведомления:', err);
    }

    // 3️⃣ Возвращаем пользователя в главное меню
    await showMainMenu(ctx);
    return 'leave';
}
