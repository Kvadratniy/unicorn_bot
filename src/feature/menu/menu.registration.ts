import { Telegraf } from 'telegraf';
import { showMainMenu } from './menus';

export function registerMenuHandlers(bot: Telegraf<UnicornWizardContext>) {
    bot.hears('Главное меню', (ctx) => showMainMenu(ctx));

    // Главное меню
    bot.action('main_menu', async (ctx) => {
        await ctx.answerCbQuery();
        await showMainMenu(ctx);
    });
}
