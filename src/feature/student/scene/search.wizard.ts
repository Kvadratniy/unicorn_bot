import { Scenes, Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import { studentService } from '../student.service';
import {clearLastKeyboard, replyMessage, replyWithKeyboard} from '../../../utils/keyboard';

/**
 * 🔍 Сцена поиска ученика по телефону
 */
export const searchStudentScene = new Scenes.WizardScene<UnicornWizardContext>(
    'student-search-wizard',

    // 1️⃣ Запрашиваем телефон
    async (ctx) => {
        await clearLastKeyboard(ctx);
        await replyMessage(ctx, '📞 Введите номер телефона (или часть):');
        return ctx.wizard.next();
    },

    // 2️⃣ Поиск
    async (ctx: any) => {
        const msg = ctx.message as Message.TextMessage | undefined;
        if (!msg?.text) return;

        const query = msg.text.trim();
        ctx.scene.session.query = query;

        const students = await studentService.searchByPhone(query);

        // 🧾 Если ничего не найдено
        if (!students.length) {
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('⬅ Назад', 'menu_students')],
            ]);

            await replyWithKeyboard(
                ctx,
                `❌ Ничего не найдено по запросу *"${query}"*.\nПопробуйте снова или отмените поиск.`,
                keyboard,
                { parse_mode: 'Markdown' },
            );

            return ctx.scene.leave();
        }

        // ✅ Формируем список результатов
        let text = `📞 *Результаты поиска по "${query}":*\n\n`;

        for (const s of students) {
            const fullName = `${s.firstName} ${s.lastName ?? ''}`.trim();

            // 🧠 Если teacherId через абонементы
            const teacherNames =
                s.abonements
                    .map((a: any) => a.teacher?.name)
                    .filter(Boolean)
                    .join(', ') || '—';

            const abonements =
                s.abonements.length > 0
                    ? s.abonements.map((a: any) => a.template?.name ?? 'Без названия').join(', ')
                    : 'нет';

            text +=
                `👤 *${fullName}*\n` +
                `📞 ${s.phone || '—'}\n` +
                `👨‍🏫 ${teacherNames}\n` +
                `🎫 ${abonements}\n` +
                `Подробнее: /student${s.id}\n\n`;
        }

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('⬅ Назад', 'menu_students')],
        ]);

        await replyWithKeyboard(ctx, text, keyboard, { parse_mode: 'Markdown' });
        return ctx.scene.leave();
    },
);