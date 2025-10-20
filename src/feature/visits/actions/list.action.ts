import { Markup } from 'telegraf';
import { toMSKfromUTC } from '../../../utils/time';
import { replyMessage } from '../../../utils/keyboard';
import { visitService, VisitWithRelations } from '../visit.service';

const PAGE_SIZE = 5;

// === Форматирование одной записи ===
function formatVisit(v: VisitWithRelations): string {
    const date = toMSKfromUTC(v.date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

    const subject = v.schedule?.subject?.name ?? 'Без предмета';
    const teacherName = v.schedule?.teacher?.name ?? '—';
    const studentName = `${v.student.firstName}${v.student.lastName ? ' ' + v.student.lastName : ''}`;
    const abonementName = v.abonement?.template?.name ?? '—';
    const paymentStatus = v.payment?.status ?? '—';
    const lessonType = v.schedule?.type ?? 'ONETIME';

    return [
        `📅 *${date}*`,
        `📘 ${subject}`,
        `👨‍🏫 ${teacherName}`,
        `👤 ${studentName}`,
        `🧾 Тип: ${lessonType}`,
        `💰 Оплата: ${paymentStatus}`,
        `🎟️ Абонемент: ${abonementName}`,
        '',
    ].join('\n');
}

// === Форматирование списка визитов ===
function formatVisitsList(visits: VisitWithRelations[], page: number, total: number): string {
    const header = `📋 *Визиты* (стр. ${page})\nВсего: ${total}\n\n`;
    const body = visits.map(formatVisit).join('');
    return header + body;
}

// === Построение фильтра для выборки ===
function buildWhereClause(user: any) {
    if (user.role === 'TEACHER' && user.teacherId) {
        return { schedule: { teacherId: user.teacherId } };
    }
    return {};
}

// === Построение клавиатуры ===
function buildKeyboard(page: number, totalCount: number, visitsCount: number) {
    const buttons: any[] = [];

    if (page > 1) buttons.push(Markup.button.callback('⬅️ Назад', `visits_page_${page - 1}`));
    if ((page - 1) * PAGE_SIZE + visitsCount < totalCount)
        buttons.push(Markup.button.callback('⏭ Далее', `visits_page_${page + 1}`));

    return Markup.inlineKeyboard([
        buttons,
        [Markup.button.callback('📍 Главное меню', 'main_menu')],
    ]);
}

// === Основное действие ===
export const visitsAction = async (ctx: any) => {
    try {
        const data = ctx.callbackQuery?.data;
        const match = data?.match(/visits_page_(\d+)/);
        const page = match ? Number(match[1]) : 1;
        const skip = (page - 1) * PAGE_SIZE;

        const user = await visitService.getUserByTelegramId(String(ctx.from.id));
        if (!user) return replyMessage(ctx, '⚠️ Вы не зарегистрированы в системе.');

        const whereClause = buildWhereClause(user);
        const totalCount = await visitService.getVisitsCount(whereClause);

        const visits = await visitService.getVisits(whereClause, skip, PAGE_SIZE);
        if (!visits.length) return replyMessage(ctx, '😕 Визитов пока нет.');

        const keyboard = buildKeyboard(page, totalCount, visits.length);
        const messageText = formatVisitsList(visits, page, totalCount);
        const messageOptions = { parse_mode: 'Markdown', ...keyboard };

        if (ctx.callbackQuery?.message) {
            try {
                await ctx.editMessageText(messageText, {
                    chat_id: ctx.chat.id,
                    message_id: ctx.callbackQuery.message.message_id,
                    ...messageOptions,
                });
            } catch (e: any) {
                console.warn('⚠️ Не удалось отредактировать сообщение:', e.message);
                await replyMessage(ctx, messageText, messageOptions);
            }
        } else {
            await replyMessage(ctx, messageText, messageOptions);
        }
    } catch (err) {
        console.error('Ошибка при получении визитов:', err);
        await replyMessage(ctx, '❌ Произошла ошибка при загрузке списка визитов.');
    }
};
