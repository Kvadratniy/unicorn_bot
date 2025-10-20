import { Markup, Telegraf } from 'telegraf';
import { showAbonementTemplatesAction } from './actions/list.action';
import { showUnpaidAbonementsAction } from './actions/unpaidList.action';

export function abonementRegistration(bot: Telegraf<UnicornWizardContext>) {
    bot.action('menu_abonement_templates', async (ctx) => {
        await ctx.answerCbQuery();
        return ctx.editMessageText('🎫 *Меню типов абонементов:*', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Список типов', 'abonement_template_list')],
                [Markup.button.callback('➕ Добавить тип', 'abonement_template_add')],
                [Markup.button.callback('⬅ Назад', 'main_menu')],
            ]),
        });
    });

    bot.action('abonement_template_list', showAbonementTemplatesAction);
    bot.action(/abonement_add_\d+/, (ctx) => ctx.scene.enter('add-abonement-wizard'));
    bot.action('abonement_template_add', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.scene.enter('add-abonement-template-wizard');
    });

    bot.action('unpaid_abonements', showUnpaidAbonementsAction);
}
