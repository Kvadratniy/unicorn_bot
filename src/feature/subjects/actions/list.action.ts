import { Markup } from 'telegraf';
import { subjectService } from '../subject.service';

export async function showSubjectsListAction(ctx: any) {
    await ctx.answerCbQuery();

    const subjects = await subjectService.getAllSubjects();

    if (!subjects.length) {
        return ctx.editMessageText('📭 Предметов пока нет.', {
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить', 'subject_add')],
                [Markup.button.callback('⬅ Назад', 'menu_subjects')],
            ]).reply_markup,
        });
    }

    let text = '📋 *Список предметов:*\n\n';

    for (const s of subjects) {
        const teachers = s.teachers.map((t) => t.name).join(', ') || '-';
        text += `📘 *${s.name}*\n⏱ ${s.duration} мин.\n👨‍🏫 Преподаватели: ${teachers}\n\n`;
    }

    await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Обновить', 'subject_list')],
            [Markup.button.callback('⬅ Назад', 'menu_subjects')],
        ]).reply_markup,
    });
}
