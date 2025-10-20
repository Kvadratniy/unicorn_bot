import { Scenes } from 'telegraf';
import { subjectService } from '../subject.service';
import { Markup } from 'telegraf';

interface AddSubjectState {
    name?: string;
}

type AddSubjectContext = Scenes.WizardContext & {
    wizard: Scenes.WizardContextWizard<AddSubjectContext> & {
        state: AddSubjectState;
    };
};

const addSubjectScene = new Scenes.WizardScene<AddSubjectContext>(
    'add-subject-wizard',

    // Шаг 1: спрашиваем название
    async (ctx) => {
        await ctx.reply('📘 Введите название предмета:');
        return ctx.wizard.next();
    },

    // Шаг 2: сохраняем название
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Пожалуйста, введите текстом.');
            return;
        }

        ctx.wizard.state.name = ctx.message.text;
        await ctx.reply('⏱ Введите длительность урока (в минутах):');
        return ctx.wizard.next();
    },

    // Шаг 3: сохраняем длительность и создаём предмет
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Введите число.');
            return;
        }

        const duration = parseInt(ctx.message.text, 10);
        const name = ctx.wizard.state.name!;

        try {
            const subject = await subjectService.createSubject(name, duration);
            await ctx.reply(
                `✅ Предмет добавлен!\n\n📘 *${subject.name}*\n⏱ ${subject.duration} мин.`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('⬅ Назад', 'menu_subjects')],
                    ]),
                },
            );
        } catch (err: any) {
            await ctx.reply(`❌ Ошибка: ${err.message}`);
        }

        return ctx.scene.leave();
    },
);

export default addSubjectScene;
