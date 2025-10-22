import { Scenes, Markup } from 'telegraf';
import { deleteMessageSafe, getCallbackData } from '../../../utils/helpers';
import { clearLastKeyboard, replyMessage, replyWithKeyboard } from '../../../utils/keyboard';
import { abonementService } from '../abonement.service';

type AbonementCtx = UnicornWizardContext & {
    wizard: Scenes.WizardContextWizard<UnicornWizardContext> & { state: AddAbonementWizardState };
};

/* -------------------------------------------------------------------------- */
/* 🧩  Шаг 1. Выбор предмета                                                 */
/* -------------------------------------------------------------------------- */
async function stepSelectSubject(ctx: AbonementCtx) {
    const data = getCallbackData(ctx);
    const match = data.match(/abonement_add_(\d+)/);
    const studentId = match ? parseInt(match[1], 10) : NaN;

    if (isNaN(studentId)) {
        await replyMessage(ctx, '⚠️ Не удалось определить ученика.');
        return ctx.scene.leave();
    }

    ctx.wizard.state.studentId = studentId;

    const subjects = await abonementService.getSubjects();
    if (!subjects.length) {
        await replyMessage(ctx, '⚠️ Нет доступных предметов.');
        return ctx.scene.leave();
    }

    await replyWithKeyboard(
        ctx,
        '📘 Выберите предмет для абонемента:',
        Markup.inlineKeyboard([
            ...subjects.map((s) => [Markup.button.callback(s.name, `abonement_subject_${s.id}`)]),
            [Markup.button.callback('❌ Отменить', 'abonement_cancel')],
        ]),
    );

    return ctx.wizard.next();
}

/* -------------------------------------------------------------------------- */
/* 🧩  Шаг 2. Выбор шаблона абонемента                                       */
/* -------------------------------------------------------------------------- */
async function stepSelectTemplate(ctx: AbonementCtx) {
    const data = getCallbackData(ctx);
    await deleteMessageSafe(ctx);

    if (data === 'abonement_cancel') {
        await replyMessage(ctx, '❌ Добавление абонемента отменено.');
        return ctx.scene.leave();
    }

    const match = data.match(/abonement_subject_(\d+)/);
    if (!match) return;
    const subjectId = parseInt(match[1], 10);
    ctx.wizard.state.subjectId = subjectId;

    const templates = await abonementService.getTemplatesBySubject(subjectId);
    if (!templates.length) {
        await replyMessage(ctx, '⚠️ Нет доступных абонементов для этого предмета.');
        return ctx.scene.leave();
    }

    await clearLastKeyboard(ctx);
    await replyWithKeyboard(
        ctx,
        '🎫 Выберите тип абонемента:',
        Markup.inlineKeyboard([
            ...templates.map((t) => [
                Markup.button.callback(
                    `${t.name}`,
                    `abonement_template_${t.id}`,
                ),
            ]),
            [Markup.button.callback('❌ Отменить', 'abonement_cancel')],
        ]),
    );

    return ctx.wizard.next();
}

/* -------------------------------------------------------------------------- */
/* 🧩  Шаг 3. Выбор преподавателя                                            */
/* -------------------------------------------------------------------------- */
async function stepSelectTeacher(ctx: AbonementCtx) {
    const data = getCallbackData(ctx);
    await deleteMessageSafe(ctx);

    if (data === 'abonement_cancel') {
        await replyMessage(ctx, '❌ Добавление абонемента отменено.');
        return ctx.scene.leave();
    }

    const match = data.match(/abonement_template_(\d+)/);
    if (!match) return;

    const templateId = parseInt(match[1], 10);
    ctx.wizard.state.templateId = templateId;

    const { subjectId } = ctx.wizard.state;
    const teachers = await abonementService.getTeachersBySubject(subjectId!);

    if (!teachers.length) {
        await replyMessage(ctx, '⚠️ Нет доступных преподавателей по этому предмету.');
        return ctx.scene.leave();
    }

    await clearLastKeyboard(ctx);
    await replyWithKeyboard(
        ctx,
        '👨‍🏫 Выберите преподавателя:',
        Markup.inlineKeyboard([
            ...teachers.map((t) => [Markup.button.callback(t.name, `abonement_teacher_${t.id}`)]),
            [Markup.button.callback('❌ Отменить', 'abonement_cancel')],
        ]),
    );

    return ctx.wizard.next();
}

/* -------------------------------------------------------------------------- */
/* 🧩  Шаг 4. Создание абонемента                                            */
/* -------------------------------------------------------------------------- */
async function stepCreateAbonement(ctx: AbonementCtx) {
    const data = getCallbackData(ctx);
    await deleteMessageSafe(ctx);

    if (data === 'abonement_cancel') {
        await replyMessage(ctx, '❌ Добавление абонемента отменено.');
        return ctx.scene.leave();
    }

    const match = data.match(/abonement_teacher_(\d+)/);
    if (!match) return;
    const teacherId = parseInt(match[1], 10);
    ctx.wizard.state.teacherId = teacherId;

    const { studentId, subjectId, templateId } = ctx.wizard.state;
    const template = await abonementService.getTemplateById(templateId!);
    const teacher = await abonementService.getTeacherById(teacherId);

    if (!template || !teacher || !studentId) {
        await replyMessage(ctx, '⚠️ Ошибка при создании абонемента.');
        return ctx.scene.leave();
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + template.duration);

    const abonement = await abonementService.createAbonement({
        templateId: templateId!,
        studentId: studentId,
        teacherId: teacherId,
        subjectId: subjectId!,
        startDate,
        endDate,
    });

    // 🔗 Привязываем ученика к преподавателю (если не связан)
    await abonementService.connectTeacherAndStudent(teacherId, studentId);

    await clearLastKeyboard(ctx);
    await replyMessage(
        ctx,
        `✅ *Абонемент успешно добавлен!*\n\n` +
            `👨‍🎓 Ученик: *#${studentId}*\n` +
            `📘 Предмет: ${template.subject.name}\n` +
            `🎫 Абонемент: ${template.name}\n` +
            `👨‍🏫 Преподаватель: ${teacher.name}\n` +
            `📅 Срок: ${startDate.toLocaleDateString('ru-RU')} — ${endDate.toLocaleDateString('ru-RU')}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💳 Добавить оплату', `payment${abonement.id}`)],
                [Markup.button.callback('🏠 Главное меню', 'main_menu')],
            ]),
        },
    );
    return ctx.scene.leave();
}

/* -------------------------------------------------------------------------- */
/* 🧭 Экспорт сцены                                                          */
/* -------------------------------------------------------------------------- */
export const addAbonementScene = new Scenes.WizardScene<AbonementCtx>(
    'add-abonement-wizard',
    stepSelectSubject,
    stepSelectTemplate,
    stepSelectTeacher,
    stepCreateAbonement,
);
