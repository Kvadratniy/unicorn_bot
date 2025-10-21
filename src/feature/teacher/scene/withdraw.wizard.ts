import { Scenes, Markup } from 'telegraf';
import { teacherService } from '../teacher.service';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../../utils/keyboard';
import { getCallbackData } from '../../../utils/helpers';
import { showMainMenu } from '../../menu/menus'; // ⚙️ убедись, что путь правильный

/**
 * Wizard для создания выплаты преподавателю
 */
export const withdrawTeacherWizard = new Scenes.WizardScene<any>(
    'withdraw-teacher-wizard',

    // 1️⃣ Шаг выбора преподавателя
    async (ctx) => {
        await clearLastKeyboard(ctx);
        const teachers = await teacherService.getAllTeachers();

        if (!teachers.length) {
            await replyMessage(ctx, '❌ Нет преподавателей.');
            return ctx.scene.leave();
        }

        const buttons = teachers.map((t) => [
            Markup.button.callback(`${t.name} — 💰 ${t.balance.toFixed(2)}₽`, `withdraw_${t.id}`),
        ]);

        // ⬅ Добавляем кнопку "Назад"
        buttons.push([Markup.button.callback('⬅ Назад в меню', 'withdraw_cancel')]);

        await replyWithKeyboard(
            ctx,
            '💰 Выберите преподавателя, которому хотите сделать выплату:',
            Markup.inlineKeyboard(buttons)
        );
        ctx.wizard.next();
    },

    // 2️⃣ Шаг ввода суммы
    async (ctx) => {
        const data = getCallbackData(ctx);

        // 🔙 Отмена
        if (data === 'withdraw_cancel') {
            await replyMessage(ctx, '↩ Возврат в главное меню.');
            await showMainMenu(ctx);
            return ctx.scene.leave();
        }

        if (!data?.startsWith('withdraw_')) return;

        const teacherId = Number(data.split('_')[1]);
        const teacher = await teacherService.getTeacherById(teacherId);
        if (!teacher) {
            await replyMessage(ctx, '⚠️ Преподаватель не найден.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.teacherId = teacherId;
        ctx.wizard.state.teacherName = teacher.name;

        await ctx.answerCbQuery().catch(() => {});
        await replyMessage(
            ctx,
            `Введите сумму выплаты для *${teacher.name}* (баланс: ${teacher.balance.toFixed(2)}₽):\n\n`,
            Markup.inlineKeyboard([
                [Markup.button.callback('⬅ Назад в меню', 'withdraw_cancel')],
            ])
        );

        ctx.wizard.next();
    },

    // 3️⃣ Подтверждение и выполнение выплаты
    async (ctx) => {
        const data = getCallbackData(ctx);
        if (data === 'withdraw_cancel') {
            await replyMessage(ctx, '↩ Возврат в главное меню.');
            await showMainMenu(ctx);
            return ctx.scene.leave();
        }

        const amountText = ctx.message?.text?.trim();
        const amount = Number(amountText);

        if (isNaN(amount) || amount <= 0) {
            await replyMessage(ctx, '⚠️ Введите корректную сумму (например, 1500).');
            return;
        }

        const { teacherId, teacherName } = ctx.wizard.state;
        try {
            const updatedTeacher = await teacherService.withdraw(
                teacherId,
                amount,
                'Выплата администратором через Telegram'
            );

            await replyMessage(
                ctx,
                `✅ Выплата *${amount}₽* преподавателю *${teacherName}* успешно оформлена.\n\n` +
                `Новый баланс: *${updatedTeacher?.balance.toFixed(2)}₽*`,
                { parse_mode: 'Markdown' }
            );

            await showMainMenu(ctx);
            return ctx.scene.leave();
        } catch (err: any) {
            console.error('Ошибка выплаты:', err);
            await replyMessage(ctx, `❌ Ошибка: ${err.message || 'не удалось оформить выплату.'}`);
            await showMainMenu(ctx);
            return ctx.scene.leave();
        }
    }
);
