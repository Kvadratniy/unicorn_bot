import { Markup } from 'telegraf';
import { studentService } from '../student.service';
import { replyWithKeyboard } from '../../../utils/keyboard';

export async function showStudentsListAction(ctx: any, page = 1) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

        const user = ctx.user;
        const isAdmin = user?.role === 'ADMIN';
        const isTeacher = user?.role === 'TEACHER' && user.teacher?.id;

        // --- 1️⃣ Получаем учеников ---
        let students: any[] = [];
        let totalPages = 1;

        if (isTeacher) {
            students = await studentService.getStudentsForTeacher(user.teacher.id);
            totalPages = Math.max(1, Math.ceil(students.length / 5));
            const start = (page - 1) * 5;
            students = students.slice(start, start + 5);

            if (!students.length) {
                return replyWithKeyboard(
                    ctx,
                    '📭 У вас пока нет учеников с абонементами.',
                    Markup.inlineKeyboard([[Markup.button.callback('⬅ Назад', 'main_menu')]]),
                );
            }
        } else {
            const result = await studentService.getStudentsPaginated(page);
            students = result.students;
            totalPages = result.totalPages;
        }

        // --- 2️⃣ Проверка на пустой список ---
        if (!students.length) {
            const buttons = [
                ...(isAdmin ? [[Markup.button.callback('➕ Добавить', 'student_add')]] : []),
                [Markup.button.callback('⬅ Назад', 'main_menu')],
            ];

            return replyWithKeyboard(
                ctx,
                '📭 Список учеников пуст.',
                Markup.inlineKeyboard(buttons),
            );
        }

        // --- 3️⃣ Формируем текст ---
        const studentsText = students
            .map((s) => {
                const fullName = `${s.firstName} ${s.lastName ?? ''}`.trim();

                const abonements = s.abonements.length
                    ? s.abonements
                          .map((a: any) => {
                              const total = a.template?.lessons ?? 0;
                              const used = a.visits?.length ?? 0;
                              const name = a.template?.name ?? 'Без названия';
                              return `${name} (${used}/${total})`;
                          })
                          .join(', ')
                    : 'нет';

                return `👤 *${fullName}*\n🎫 ${abonements}\nПодробнее: /student${s.id}\n`;
            })
            .join('\n');

        const text = `📋 *Клиенты (стр. ${page}/${totalPages}):*\n\n${studentsText}`;

        // --- 4️⃣ Навигация ---
        const navButtons = [];
        if (page > 1)
            navButtons.push(Markup.button.callback('⬅ Предыдущая', `students_page_${page - 1}`));
        if (page < totalPages)
            navButtons.push(Markup.button.callback('Следующая ➡', `students_page_${page + 1}`));

        const keyboard = [
            ...(navButtons.length ? [navButtons] : []),
            [Markup.button.callback('🔍 Поиск по телефону', 'student_search')],
            ...(isAdmin ? [[Markup.button.callback('➕ Добавить нового', 'student_add')]] : []),
            [Markup.button.callback('⬅ Назад', 'main_menu')],
        ];

        // --- 5️⃣ Ответ пользователю ---
        await replyWithKeyboard(ctx, text, Markup.inlineKeyboard(keyboard), {
            parse_mode: 'Markdown',
        });
    } catch (err) {
        console.error('Ошибка showStudentsListAction:', err);
        await ctx.reply('⚠️ Ошибка при получении списка учеников.');
    }
}
