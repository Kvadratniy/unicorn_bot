import { Scenes } from 'telegraf';
import { getCallbackData } from '../../../utils/helpers';
import { toUTCfromMSK } from '../../../utils/time';
import { showAvailabilityForDay } from '../action/showAvailabilityForDay.action';
import { teacherService } from '../teacher.service';
import { replyMessage } from '../../../utils/keyboard';

interface State {
    date?: string;
}

type Ctx = Scenes.WizardContext & { wizard: Scenes.WizardContextWizard<Ctx> & { state: State } };

export const addAvailabilityScene = new Scenes.WizardScene<Ctx>(
    'add-availability',

    async (ctx) => {
        const data = getCallbackData(ctx);
        const match = data?.match(/availability_add_(\d{4}-\d{2}-\d{2})/);
        if (!match) return ctx.scene.leave();

        ctx.wizard.state.date = match[1];
        await replyMessage(ctx, 'Введите время в формате: `HH:MM–HH:MM`', {
            parse_mode: 'Markdown',
        });
        return ctx.wizard.next();
    },

    async (ctx: any) => {
        if (!('text' in ctx.message!)) return;

        const text = ctx.message.text.trim();
        const match = text.match(/^(\d{2}):(\d{2})[–-](\d{2}):(\d{2})$/);
        if (!match) {
            await replyMessage(ctx, '❌ Неверный формат. Пример: `10:00–14:30`', {
                parse_mode: 'Markdown',
            });
            return;
        }

        const [, h1, m1, h2, m2] = match;
        const teacherId = ctx.user.teacherId;
        if (!teacherId) return ctx.reply('⚠️ Только преподаватель может добавлять время.');

        const date = ctx.wizard.state.date!;
        const startLocal = new Date(`${date}T${h1}:${m1}:00`);
        const endLocal = new Date(`${date}T${h2}:${m2}:00`);
        const startDate = toUTCfromMSK(startLocal);
        const endDate = toUTCfromMSK(endLocal);

        await teacherService.createAvailability(teacherId, startDate, endDate);
        await replyMessage(ctx, '✅ Время успешно добавлено!');
        await ctx.scene.leave();
        await showAvailabilityForDay(ctx, date);
    },
);
