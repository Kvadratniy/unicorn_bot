import { Markup } from 'telegraf';
import { replyWithKeyboard } from '../../../utils/keyboard';
import { studentService } from '../student.service';

/**
 * 📘 Показывает детальную информацию об ученике
 */
export async function showStudentDetailsAction(ctx: any, idParam?: number) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        const user = ctx.user;
        const id = idParam ?? NaN;

        if (isNaN(id)) return ctx.reply('⚠️ Неверная команда.');

        const isTeacher = user?.role === 'TEACHER' && user.teacherId;
        const teacherId = isTeacher ? user.teacherId : undefined;

        // 1️⃣ Загружаем ученика
        const student = await studentService.getStudentById(id);
        if (!student) return ctx.reply('❌ Ученик не найден.');

        // 2️⃣ Обрабатываем абонементы
        const abonements = studentService.filterAbonementsForTeacher(student.abonements, teacherId);
        // ⚙️ Показываем только абонементы, где осталось занятий > 0
        const abonementsWithLessonsLeft = abonements
            .filter((a) => a.status !== 'CLOSED') // 👈 исключаем закрытые
            .filter((a) => {
                const totalLessons = a.template?.lessons ?? 0;
                const usedLessons = student.schedules.filter((s: any) => s.abonementId === a.id).length;
                return totalLessons - usedLessons > 0;
            });

        console.log('abonementsWithLessonsLeft:', abonementsWithLessonsLeft);

        const activeAbonement = studentService.findActiveAbonement(abonementsWithLessonsLeft);
        const abonementsText = studentService.formatAbonements(student, abonementsWithLessonsLeft, !!isTeacher);

        // 3️⃣ Формируем общую информацию
        const teacherNames =
            [...new Set(abonementsWithLessonsLeft.map((a) => a.teacher?.name).filter(Boolean))].join(', ') || '—';
        const fullName = `${student.firstName} ${student.lastName ?? ''}`.trim();

        const text =
            `🧑‍🎓 *${fullName}*\n\n` +
            `📞 *Телефон:* ${student.phone || '—'}\n` +
            `🎂 *Возраст:* ${student.age ?? '—'}\n` +
            `🗒 *Примечание:* ${student.note ?? '—'}\n\n` +
            `👨‍🏫 *Преподаватели:* ${teacherNames}\n\n` +
            `🎫 *Абонементы:*\n${abonementsText}`;

        // 4️⃣ Кнопки
        const buttons: any[][] = [];
        const hasSchedules = student.schedules.length > 0;

        if (user.role === 'ADMIN') {
            const adminButtons = [
                Markup.button.callback('➕ Добавить абонемент', `abonement_add_${student.id}`),
            ];

            if (!hasSchedules) {
                adminButtons.push(
                    Markup.button.callback(
                        '📅 Записать на пробное',
                        `add_trial_student_lesson_${student.id}`,
                    ),
                );
            }
            buttons.push(adminButtons);
        }

        if (isTeacher) {
            const teacherButtons = [
                activeAbonement
                    ? Markup.button.callback(
                          '📅 Записать по абонементу',
                          `add_abonement_student_lesson_${student.id}`,
                      )
                    : Markup.button.callback(
                          '📅 Записать на разовое',
                          `add_onetime_student_lesson_${student.id}`,
                      ),
            ];
            buttons.push(teacherButtons);
        }

        buttons.push([Markup.button.callback('⬅ Назад', 'menu_students')]);

        await replyWithKeyboard(ctx, text, Markup.inlineKeyboard(buttons), {
            parse_mode: 'Markdown',
        });
    } catch (err) {
        console.error('Ошибка showStudentDetailsAction:', err);
        await ctx.reply('⚠️ Ошибка при получении информации об ученике.');
    }
}
