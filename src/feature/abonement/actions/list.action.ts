import { Markup } from 'telegraf';
import { abonementService } from '../abonement.service';

export async function showAbonementTemplatesAction(ctx: any) {
    await ctx.answerCbQuery();

    const templates = await abonementService.getAllTemplates();

    if (!templates.length) {
        return ctx.editMessageText('📭 Нет добавленных типов абонементов.', {
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить тип', 'abonement_template_add')],
                [Markup.button.callback('⬅ Назад', 'menu_abonement_templates')],
            ]).reply_markup,
        });
    }

    let text = '🎫 *Список типов абонементов:*\n\n';

    for (const t of templates) {
        text += `• *${t.name}*\n`;
        text += `📘 Предмет: ${t.subject?.name ?? '—'}\n`;
        text += `📚 ${t.lessons} занятий\n`;
        text += `⏱ ${t.duration} дней\n`;
        text += '\n';
    }

    await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Обновить', 'abonement_template_list')],
            [Markup.button.callback('⬅ Назад', 'menu_abonement_templates')],
        ]).reply_markup,
    });
}
