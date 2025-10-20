import { Markup, Telegraf } from 'telegraf';
import { showSubjectsListAction } from './actions/list.action';

export function subjectRegistration(bot: Telegraf<any>) {
    bot.action('menu_subjects', async (ctx) => {
        await ctx.answerCbQuery();
        return ctx.editMessageText('📘 *Меню предметов:*', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Список', 'subject_list')],
                [Markup.button.callback('➕ Добавить', 'subject_add')],
                [Markup.button.callback('⬅ Назад', 'main_menu')],
            ]),
        });
    });

    bot.action('subject_list', showSubjectsListAction);

    bot.action('subject_add', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.scene.enter('add-subject-wizard');
    });
}
