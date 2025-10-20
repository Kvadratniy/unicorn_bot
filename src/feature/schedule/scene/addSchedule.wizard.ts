import { Scenes } from 'telegraf';
import { selectSubjectStep } from '../../../core/scene-steps/selectSubjectStep';
import { saveScheduleStep } from './steps/saveSchedule';
import { selectTrialDateStep } from '../../../core/scene-steps/selectTrialDate';
import { selectTrialTeacherStep } from '../../../core/scene-steps/selectTrialTeacher';
import { selectTimeStep } from '../../../core/scene-steps/selectTimeStep';

export const addFullSchedule = new Scenes.WizardScene<any>(
    'add-full-schedule-wizard',
    async (ctx) => {
        const result = await selectSubjectStep(ctx, ctx.wizard.state);
        if (result === 'next') {
            ctx.wizard.next();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }
        if (result === 'leave') return ctx.scene.leave();
    },
    async (ctx) => {
        const result = await selectTrialDateStep(ctx, ctx.wizard.state);
        if (result === 'next') {
            ctx.wizard.next();
            return ctx.wizard.steps[ctx.wizard.cursor](ctx);
        }
        if (result === 'leave') return ctx.scene.leave();
    },
    async (ctx) => {
        const result = await selectTrialTeacherStep(ctx, ctx.wizard.state);
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
