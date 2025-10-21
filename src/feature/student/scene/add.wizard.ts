import { Scenes } from 'telegraf';
import { studentService } from '../student.service';
import { clearLastKeyboard, replyMessage } from '../../../utils/keyboard';
import { showStudentDetailsAction } from '../actions/details.action';

interface AddStudentState {
    firstName?: string;
    lastName?: string;
    phone?: string;
    age?: number;
    source?: string;
    note?: string;
}

type AddStudentContext = Scenes.WizardContext & {
    wizard: Scenes.WizardContextWizard<AddStudentContext> & {
        state: AddStudentState;
    };
};

export const addStudentScene = new Scenes.WizardScene<AddStudentContext>(
    'add-student-wizard',

    // 1️⃣ Имя
    async (ctx) => {
        await clearLastKeyboard(ctx);
        await replyMessage(ctx, 'Введите *имя* ученика:', { parse_mode: 'Markdown' });
        return ctx.wizard.next();
    },

    // 2️⃣ Фамилия
    async (ctx) => {
        if (!('text' in ctx.message!)) return;
        ctx.wizard.state.firstName = ctx.message.text.trim();

        await replyMessage(ctx, "Введите *фамилию* ученика (или пропустите, напишите '-'):", {
            parse_mode: 'Markdown',
        });

        return ctx.wizard.next();
    },

    // 3️⃣ Телефон
    async (ctx) => {
        if (!('text' in ctx.message!)) return;
        const lastName = ctx.message.text.trim();
        ctx.wizard.state.lastName = lastName === '-' ? '' : lastName;
        await replyMessage(ctx, 'Введите *номер телефона* в формате +79991234567:');

        return ctx.wizard.next();
    },

    // 4️⃣ Возраст
    async (ctx) => {
        if (!('text' in ctx.message!)) return;
        const phone = ctx.message.text.trim();

        if (!/^\+?\d{7,15}$/.test(phone)) {
            await replyMessage(ctx, '❌ Некорректный номер. Попробуйте снова:');
            return;
        }

        ctx.wizard.state.phone = phone;
        await replyMessage(ctx, 'Введите *возраст* ученика (числом):');
        return ctx.wizard.next();
    },

    // 5️⃣ Источник
    async (ctx) => {
        if (!('text' in ctx.message!)) return;
        const age = parseInt(ctx.message.text.trim());
        if (isNaN(age)) {
            await replyMessage(ctx, '❌ Возраст должен быть числом. Введите снова:');
            await ctx.reply('❌ Возраст должен быть числом. Введите снова:');
            return;
        }

        ctx.wizard.state.age = age;
        await replyMessage(ctx, 'Откуда пришёл ученик? (например: Instagram, Рекомендация, Сайт)');
        return ctx.wizard.next();
    },

    // 6️⃣ Примечание
    async (ctx) => {
        if (!('text' in ctx.message!)) return;
        ctx.wizard.state.source = ctx.message.text.trim();
        await replyMessage(
            ctx,
            "Введите примечание (любая дополнительная информация) или '-' если нет:",
        );

        return ctx.wizard.next();
    },

    // 7️⃣ Подтверждение и сохранение
    async (ctx) => {
        if (!('text' in ctx.message!)) return;
        const note = ctx.message.text.trim();
        ctx.wizard.state.note = note === '-' ? '' : note;

        const { firstName, lastName, phone, age, source, note: finalNote } = ctx.wizard.state;

        try {
            const student = await studentService.createStudent({
                firstName: firstName!,
                lastName,
                phone: phone!,
                age,
                source,
                note: finalNote,
            });

            const info = `✅ Ученик создан!\n\n`;
            await replyMessage(ctx, info, { parse_mode: 'Markdown' });
            await showStudentDetailsAction(ctx, student.id);
            await ctx.scene.leave();
        } catch (e: any) {
            console.error('❌ Ошибка при создании ученика:', e);
            await ctx.reply(`❌ Ошибка: ${e.message}`);
            return ctx.scene.leave();
        }
    },
);
