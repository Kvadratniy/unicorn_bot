import { Markup } from 'telegraf';
import { clearLastKeyboard, deleteSavedMessages, replyWithKeyboard } from '../../utils/keyboard';

/* -------------------------------------------------------------------------- */
/* ⚙️ Хелперы                                                                 */
/* -------------------------------------------------------------------------- */

/** Создаёт inline-клавиатуру на основе массива строковых кнопок */
function createMenuButtons(buttonGroups: string[][]) {
    return Markup.inlineKeyboard(
        buttonGroups.map((row) =>
            row.map((btn) => {
                const [label, action] = btn.split('|');
                return Markup.button.callback(label, action);
            }),
        ),
    );
}

/** Отправляет сообщение с меню */
async function sendMenu(ctx: UnicornWizardContext, text: string, buttonGroups: string[][]) {
    await replyWithKeyboard(ctx, text, createMenuButtons(buttonGroups));
}

/* -------------------------------------------------------------------------- */
/* 📋 Приветственное меню                                                     */
/* -------------------------------------------------------------------------- */

export async function showBaseMenu(ctx: UnicornWizardContext) {
    await clearLastKeyboard(ctx);

    const name = ctx.from?.first_name || 'друг';
    const greeting =
        `✨ Привет, ${name}!\n\n` +
        `Я — *Unicorn Assistant*, твой личный помощник для управления занятиями и учениками 🧠\n\n` +
        `Вот что я умею:\n` +
        `• 📅 Создавать и редактировать расписание\n` +
        `• 🧑‍🏫 Работать с преподавателями\n` +
        `• 🧾 Управлять абонементами и платежами\n\n` +
        `Готов начать? Выбери раздел ниже 👇`;

    await ctx.reply(greeting, Markup.keyboard([['Главное меню']]).resize());
    await showMainMenu(ctx);
}

/* -------------------------------------------------------------------------- */
/* 🏠 Главное меню                                                            */
/* -------------------------------------------------------------------------- */

export async function showMainMenu(ctx: UnicornWizardContext) {
    await deleteSavedMessages(ctx);

    const user = ctx.user;
    if (!user) {
        return ctx.reply('❌ Не удалось определить пользователя. Попробуй /start');
    }

    let buttonGroups: string[][] = [];

    switch (user.role) {
        case 'ADMIN':
            buttonGroups = [
                ['🧑‍🎓 Ученики|menu_students', '📅 Расписание|schedule_menu'],
                ['📋 Неоплаченные визиты|payments_pending', '💸 Неоплаченные абонементы|unpaid_abonements'],
                ['💵 Выплата преподавателю|teacher_withdrawal'],
            ];
            break;

        case 'TEACHER':
            buttonGroups = [
                ['🧑‍🎓 Мои ученики|menu_students', '📅 Расписание|schedule_menu'],
                ['🕓 Рабочее время|availability_menu', '💰 Баланс|teacher_balance'],
            ];
            break;

        default:
            buttonGroups = [['🏠 Главное меню|main_menu']];
            break;
    }

    await sendMenu(ctx, '📍 Главное меню:', buttonGroups);
}
