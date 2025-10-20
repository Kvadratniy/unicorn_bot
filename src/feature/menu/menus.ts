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
        `👋 Привет, ${name}!\n\n` +
        `Я помогу тебе управлять учителями, студентами, абонементами и расписанием.\n` +
        `Выбери нужный пункт в меню ниже.`;

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
                ['📋 Визиты|visits_list', '💸 Неоплаченные абонементы|unpaid_abonements'],
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
