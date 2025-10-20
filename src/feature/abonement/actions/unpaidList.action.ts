import { Markup } from 'telegraf';
import { abonementService } from '../abonement.service';
import { replyMessage, replyWithKeyboard } from '../../../utils/keyboard';

/**
 * Форматирует текст одного неоплаченного абонемента
 */
function formatAbonementText(a: any): string {
    const studentName = `${a.student.firstName} ${a.student.lastName ?? ''}`.trim();
    const teacherName = a.teacher?.name ?? '—';
    const subjectName = a.Subject?.name ?? a.template?.subject?.name ?? '—';
    const price = a.template?.price ?? 0;
    const start = a.startDate.toLocaleDateString('ru-RU');
    const end = a.endDate.toLocaleDateString('ru-RU');

    return (
        `👨‍🎓 *${studentName}*\n` +
        `📘 ${subjectName}\n` +
        `👨‍🏫 ${teacherName}\n` +
        `💰 ${price} ₽\n` +
        `📅 ${start} — ${end}\n` +
        `Оплатить: /payment${a.id}\n\n`
    );
}

/**
 * Показывает список всех неоплаченных абонементов (status = UNPAIND)
 */
export async function showUnpaidAbonementsAction(ctx: any) {
    try {
        // --- 1️⃣ Подтверждаем callback ---
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery().catch(() => {});
        }

        // --- 2️⃣ Получаем данные из сервиса ---
        const abonements = await abonementService.getUnpaidAbonements();

        // --- 3️⃣ Проверка на пустой список ---
        if (!abonements.length) {
            return replyWithKeyboard(
                ctx,
                '✅ Все абонементы оплачены!',
                Markup.inlineKeyboard([Markup.button.callback('⬅ Назад', 'main_menu')]),
            );
        }

        // --- 4️⃣ Формируем сообщение ---
        const text =
            '💸 *Неоплаченные абонементы:*\n\n' + abonements.map(formatAbonementText).join('');

        // --- 5️⃣ Клавиатура ---
        const keyboard = Markup.inlineKeyboard([Markup.button.callback('⬅ Назад', 'main_menu')]);

        // --- 6️⃣ Отправляем пользователю ---
        await replyMessage(ctx, text, {
            parse_mode: 'Markdown',
            ...keyboard,
        });
    } catch (err: any) {
        console.error('Ошибка showUnpaidAbonementsAction:', err);
        await replyMessage(
            ctx,
            `⚠️ Ошибка при загрузке неоплаченных абонементов:\n\`${err.message}\``,
            { parse_mode: 'Markdown' },
        );
    }
}
