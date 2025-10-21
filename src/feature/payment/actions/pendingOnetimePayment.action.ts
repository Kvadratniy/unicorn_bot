import { Markup } from 'telegraf';
import { paymentService } from '../payment.service';
import { replyMessage, replyWithKeyboard } from '../../../utils/keyboard';

/**
 * Форматирует текст одного платежа со статусом PENDING
 */
function formatPendingPaymentText(p: any): string {
    const studentName = `${p.student.firstName} ${p.student.lastName ?? ''}`.trim();
    const teacherName = p.visit?.schedule?.teacher?.name ?? '—';
    const subjectName = p.visit?.schedule?.subject?.name ?? '—';
    const amount = p.amount.toFixed(2);
    const date = p.date.toLocaleDateString('ru-RU');
    const comment = p.comment ? `💬 ${p.comment}\n` : '';

    return (
        `👨‍🎓 ${studentName}\n` +
        `📘 ${subjectName}\n` +
        `👨‍🏫 ${teacherName}\n` +
        `💵 ${amount} ₽\n` +
        `📅 ${date}\n` +
        `Оплатить: /payment_onetime${p.id}\n\n`
    );
}

/**
 * Показывает список всех платежей со статусом PENDING
 */
export async function showPendingPaymentsAction(ctx: any) {
    try {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        const payments = await paymentService.getPendingPayments();

        if (!payments.length) {
            return replyWithKeyboard(
                ctx,
                '✅ Нет ожидающих подтверждения платежей.',
                Markup.inlineKeyboard([[Markup.button.callback('⬅ Назад', 'main_menu')]]),
            );
        }

        const text =
            '⏳ Ожидающие платежи (PENDING):\n\n' +
            payments.map(formatPendingPaymentText).join('');

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('⬅ Назад', 'main_menu')],
        ]);

        // 👇 без parse_mode — Telegram не парсит Markdown, безопасно
        await replyMessage(ctx, text, keyboard);
    } catch (err: any) {
        console.error('Ошибка showPendingPaymentsAction:', err);
        await replyMessage(
            ctx,
            `⚠️ Ошибка при загрузке ожидающих платежей:\n${err.message}`,
        );
    }
}
