import { Telegraf } from 'telegraf';

export function registerPaymentsHandlers(bot: Telegraf<any>) {
    bot.hears(/payment(\d+)/, async (ctx) => {
        await ctx.scene.enter('add-payment-wizard', { abonementId: parseInt(ctx.match[1]) });
    });

    bot.action(/payment(\d+)/, async (ctx) => {
        await ctx.scene.enter('add-payment-wizard', { abonementId: parseInt(ctx.match[1]) });
    });
}
