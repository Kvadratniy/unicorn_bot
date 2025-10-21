import { Telegraf } from 'telegraf';
import {showPendingPaymentsAction} from "./actions/pendingOnetimePayment.action";

export function registerPaymentsHandlers(bot: Telegraf<any>) {
    bot.hears(/payment(\d+)/, async (ctx) => {
        await ctx.scene.enter('add-abonement-payment-wizard', { abonementId: parseInt(ctx.match[1]) });
    });

    bot.action(/payment(\d+)/, async (ctx) => {
        await ctx.scene.enter('add-abonement-payment-wizard', { abonementId: parseInt(ctx.match[1]) });
    });

    bot.hears(/payment_onetime(\d+)/, async (ctx) => {
        await ctx.scene.enter('add-onetime-payment-wizard', { paymentId: parseInt(ctx.match[1]) });
    });


    bot.action('payments_pending', showPendingPaymentsAction);
}
