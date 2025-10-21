import { Scenes } from 'telegraf';
import { saveScheduleStep } from './steps/saveSchedule';
import { selectDateStep } from '../../../core/scene-steps/selectDateStep';
import { selectTimeStep } from '../../../core/scene-steps/selectTimeStep';
import { selectAbonementStep } from '../../../core/scene-steps/selectAbonementStep';

export const addAbonementSchedule = new Scenes.WizardScene<any>(
    'add-abonement-schedule-wizard',
    async (ctx) => {
        const result = await selectAbonementStep(ctx, ctx.wizard.state);
        if (result === 'next') {
            ctx.wizard.next();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }
        if (result === 'leave') return ctx.scene.leave();
    },
    async (ctx) => {
        const result = await selectDateStep(ctx, ctx.wizard.state);
        if (result === 'next') {
            ctx.wizard.next();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }
        if (result === 'leave') return ctx.scene.leave();
    },
    async (ctx) => {
        const result = await selectTimeStep(ctx, ctx.wizard.state);
        if (result === 'next') {
            ctx.wizard.next();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }
        if (result === 'leave') return ctx.scene.leave();
    },
    async (ctx) => {
        const result = await saveScheduleStep(ctx, ctx.wizard.state);
        if (result === 'leave') return ctx.scene.leave();
    },
);
