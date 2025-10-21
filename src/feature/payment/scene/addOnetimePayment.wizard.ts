import { Scenes, Markup } from 'telegraf';
import { getCallbackData, deleteMessageSafe, getMessageText } from '../../../utils/helpers';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../../utils/keyboard';
import { PaymentMethod } from '@prisma/client';
import { paymentService } from '../payment.service';

interface PaymentState {
    paymentId?: number;
    amount?: number;
    method?: PaymentMethod;
    comment?: string;
}

type PaymentContext = Scenes.WizardContext & {
    wizard: Scenes.WizardContextWizard<PaymentContext> & { state: PaymentState };
};

export const addOnetimePaymentWizard = new Scenes.WizardScene<PaymentContext>(
    'add-onetime-payment-wizard',

    /* -------------------------------------------------------------------------- */
    /* 1️⃣ Получаем ID платежа                                                   */
    /* -------------------------------------------------------------------------- */
    async (ctx) => {
        const state = ctx.scene.state as PaymentState;

        // Получаем ID из state или callback
        const paymentId =
            state?.paymentId ||
            (() => {
                const data = getCallbackData(ctx);
                const match = data?.match(/payment_onetime(\d+)/);
                return match ? parseInt(match[1], 10) : NaN;
            })();

        if (isNaN(paymentId)) {
            await replyMessage(ctx, '⚠️ Не удалось определить оплату.');
            return ctx.scene.leave();
        }

        const payment = await paymentService.getPaymentById(paymentId);
        if (!payment) {
            await replyMessage(ctx, '❌ Платёж не найден.');
            return ctx.scene.leave();
        }

        if (payment.status === 'PAID') {
            await replyMessage(ctx, '✅ Этот платёж уже подтверждён.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.paymentId = paymentId;

        await replyMessage(
            ctx,
            `💰 Введите сумму оплаты для ученика *${payment.student.firstName}*`,
            { parse_mode: 'Markdown' },
        );

        return ctx.wizard.next();
    },

    /* -------------------------------------------------------------------------- */
    /* 2️⃣ Ввод суммы                                                             */
    /* -------------------------------------------------------------------------- */
    async (ctx) => {
        const amountStr = getMessageText(ctx);
        const amount = parseFloat(amountStr || '0');

        if (isNaN(amount) || amount <= 0) {
            await replyMessage(ctx, '⚠️ Введите корректную сумму (например: 2500)');
            return;
        }

        ctx.wizard.state.amount = amount;

        await replyWithKeyboard(
            ctx,
            '💳 Выберите метод оплаты:',
            Markup.inlineKeyboard([
                [Markup.button.callback('💵 Наличные', 'method_CASH')],
                [Markup.button.callback('💳 Карта', 'method_CARD')],
                [Markup.button.callback('🏦 Перевод', 'method_TRANSFER')],
                [Markup.button.callback('🌐 Онлайн', 'method_ONLINE')],
                [Markup.button.callback('❌ Отмена', 'payment_cancel')],
            ]),
        );

        return ctx.wizard.next();
    },

    /* -------------------------------------------------------------------------- */
    /* 3️⃣ Выбор метода оплаты                                                   */
    /* -------------------------------------------------------------------------- */
    async (ctx) => {
        const data = getCallbackData(ctx);
        await deleteMessageSafe(ctx);

        if (data === 'payment_cancel') {
            await replyMessage(ctx, '❌ Редактирование оплаты отменено.');
            return ctx.scene.leave();
        }

        const match = data.match(/method_(\w+)/);
        if (!match) return;

        const method = match[1] as PaymentMethod;
        ctx.wizard.state.method = method;

        await clearLastKeyboard(ctx);
        await replyMessage(ctx, '📝 Введите комментарий (или "-" если не нужно).');
        return ctx.wizard.next();
    },

    /* -------------------------------------------------------------------------- */
    /* 4️⃣ Ввод комментария и обновление оплаты                                   */
    /* -------------------------------------------------------------------------- */
    async (ctx) => {
        const comment = getMessageText(ctx) || '';
        if (!comment) {
            await replyMessage(ctx, '⚠️ Введите комментарий (или "-" если не нужно).');
            return;
        }

        ctx.wizard.state.comment = comment === '-' ? undefined : comment;
        const { paymentId, amount, method } = ctx.wizard.state;

        if (!paymentId || !amount || !method) {
            await replyMessage(ctx, '⚠️ Недостаточно данных для обновления оплаты.');
            return ctx.scene.leave();
        }

        const payment = await paymentService.getPaymentById(paymentId);
        if (!payment) {
            await replyMessage(ctx, '❌ Платёж не найден.');
            return ctx.scene.leave();
        }

        await paymentService.updatePayment(paymentId, {
            amount,
            method,
            comment: ctx.wizard.state.comment,
            status: 'PAID',
        });

        await replyMessage(
            ctx,
            `✅ Оплата успешно подтверждена!\n\n` +
            `💰 *${amount} ₽*\n` +
            `💳 ${method}\n` +
            (comment && comment !== '-' ? `📝 ${comment}\n` : '') +
            `📅 ${new Date().toLocaleDateString('ru-RU')}`,
            { parse_mode: 'Markdown' },
        );

        return ctx.scene.leave();
    },
);
