import { Scenes, Markup } from 'telegraf';
import { getCallbackData, deleteMessageSafe, getMessageText } from '../../../utils/helpers';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../../utils/keyboard';
import { PaymentMethod } from '@prisma/client';
import { paymentService } from '../payment.service';

interface PaymentState {
    abonementId?: number;
    amount?: number;
    method?: PaymentMethod;
    comment?: string;
}

type PaymentContext = Scenes.WizardContext & {
    wizard: Scenes.WizardContextWizard<PaymentContext> & { state: PaymentState };
};

export const addAbonementPayment = new Scenes.WizardScene<PaymentContext>(
    'add-abonement-payment-wizard',

    /* -------------------------------------------------------------------------- */
    /* 1️⃣ Получаем ID абонемента                                                 */
    /* -------------------------------------------------------------------------- */
    async (ctx) => {
        const state = ctx.scene.state as PaymentState;

        const abonementId =
            state?.abonementId ||
            (() => {
                const data = getCallbackData(ctx);
                const match = data?.match(/payment_(\d+)/);
                return match ? parseInt(match[1], 10) : NaN;
            })();

        if (isNaN(abonementId)) {
            await replyMessage(ctx, '⚠️ Не удалось определить абонемент.');
            return ctx.scene.leave();
        }

        const abonement = await paymentService.getAbonementById(abonementId);
        if (!abonement) {
            await replyMessage(ctx, '❌ Абонемент не найден.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.abonementId = abonementId;
        await replyMessage(
            ctx,
            `💰 Введите сумму оплаты для ученика *${abonement.student.firstName}*`,
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
            await replyMessage(ctx, '❌ Добавление оплаты отменено.');
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
    /* 4️⃣ Ввод комментария и создание оплаты                                     */
    /* -------------------------------------------------------------------------- */
    async (ctx) => {
        const comment = getMessageText(ctx) || '';
        if (!comment) {
            await replyMessage(ctx, '⚠️ Введите комментарий (или "-" если не нужно).');
            return;
        }

        ctx.wizard.state.comment = comment === '-' ? undefined : comment;
        const { abonementId, amount, method } = ctx.wizard.state;

        if (!abonementId || !amount || !method) {
            await replyMessage(ctx, '⚠️ Недостаточно данных для создания оплаты.');
            return ctx.scene.leave();
        }

        const abonement = await paymentService.getAbonementById(abonementId);
        if (!abonement) {
            await replyMessage(ctx, '❌ Абонемент не найден.');
            return ctx.scene.leave();
        }

        await paymentService.createPayment({
            studentId: abonement.studentId,
            abonementId,
            amount,
            method,
            comment: ctx.wizard.state.comment,
        });

        await paymentService.activateAbonementIfUnpaid(abonementId);

        await replyMessage(
            ctx,
            `✅ Оплата успешно добавлена!\n\n` +
                `💰 *${amount} ₽*\n` +
                `💳 ${method}\n` +
                (comment && comment !== '-' ? `📝 ${comment}\n` : '') +
                `📅 ${new Date().toLocaleDateString('ru-RU')}`,
            { parse_mode: 'Markdown' },
        );

        return ctx.scene.leave();
    },
);
