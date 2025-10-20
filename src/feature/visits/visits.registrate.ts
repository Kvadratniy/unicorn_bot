import { Telegraf } from 'telegraf';
import { visitsAction } from './actions/list.action';

export function registerVisitsHandlers(bot: Telegraf<any>) {
    bot.action('visits_list', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage(); // удаляем старое меню
        await visitsAction(ctx);
    });

    bot.action(/visits_page_\d+/, visitsAction);
}
