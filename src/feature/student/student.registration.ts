import { showStudentsListAction } from './actions/list.action';
import { showStudentDetailsAction } from './actions/details.action';
import { Telegraf } from 'telegraf';
import { removeInlineKeyboard } from '../../utils/helpers';
import { deleteSavedMessages } from '../../utils/keyboard';

export function studentRegistration(bot: Telegraf<any>) {
    bot.action('menu_students', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage(); // удаляем старое меню
        await showStudentsListAction(ctx, 1);
    });

    bot.action(/^students_page_(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[1]);
        await showStudentsListAction(ctx, page);
    });

    // создание / поиск
    bot.action('student_add', (ctx) =>
        removeInlineKeyboard(ctx).then(() => ctx.scene.enter('add-student-wizard')),
    );
    bot.action('student_search', (ctx) =>
        removeInlineKeyboard(ctx).then(() => ctx.scene.enter('student-search-wizard')),
    );

    // 🔹 просмотр по команде /student123
    bot.hears(/^\/student(\d+)$/, async (ctx) => {
        await deleteSavedMessages(ctx);
        const id = parseInt(ctx.match[1]);
        await showStudentDetailsAction(ctx, id);
    });
}
