import cron from 'node-cron';
import prisma from '../core/prisma';
import { Telegraf } from 'telegraf';
import { toMSKfromUTC } from '../utils/time';
import {
    LessonType,
    PaymentStatus,
    PaymentType,
    PaymentMethod,
    TeacherTransactionType,
} from '@prisma/client';

const bot = new Telegraf(process.env.BOT_TOKEN!);

/**
 * Инициализация периодического задания для создания визитов
 */
export function initCreateVisitsJob() {
    cron.schedule(
        '*/1 * * * *',
        async () => {
            try {
                const now = new Date();
                const in5min = new Date(now.getTime() + 5 * 60 * 1000);

                console.log(
                    `[CRON] Проверяем: ${now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} — ${in5min.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
                );

                // === 1️⃣ Получаем предстоящие занятия ===
                const schedules = await loadSchedules(now, in5min);
                if (!schedules.length) return console.log('⚠️ Нет занятий');

                // === 2️⃣ Загружаем администраторов для уведомлений ===
                const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

                // === 3️⃣ Обрабатываем каждое занятие ===
                for (const schedule of schedules) {
                    await handleSchedule(bot, admins, schedule, now);
                }
            } catch (e) {
                console.error('❌ Ошибка CRON:', e);
            }
        },
        { timezone: 'Europe/Moscow' },
    );

    console.log('✅ CRON: Автоматическое создание визитов запущено');
}

/* -------------------------------------------------------------------------- */
/* 🧩 БЛОК 1. Загрузка данных */
/* -------------------------------------------------------------------------- */

/**
 * Загружает все занятия, начинающиеся в ближайшие 5 минут.
 */
async function loadSchedules(now: Date, in5min: Date) {
    return prisma.schedule.findMany({
        where: { startDate: { gte: now, lt: in5min } },
        include: { students: true, teacher: true, subject: true },
    });
}

/* -------------------------------------------------------------------------- */
/* 🧩 БЛОК 2. Обработка одного занятия */
/* -------------------------------------------------------------------------- */

async function handleSchedule(bot: Telegraf, admins: any[], schedule: any, now: Date) {
    for (const student of schedule.students) {
        // Проверяем, не создан ли визит
        const existing = await prisma.visit.findFirst({
            where: { scheduleId: schedule.id, studentId: student.id },
        });
        if (existing) continue;

        switch (schedule.type) {
            case LessonType.TRIAL:
                await handleTrialLesson(bot, admins, schedule, student);
                break;

            case LessonType.ABONEMENT:
                await handleAbonementLesson(bot, admins, schedule, student, now);
                break;

            case LessonType.ONETIME:
                await handleOnetimeLesson(bot, admins, schedule, student, now);
                break;
        }
    }
}

/* -------------------------------------------------------------------------- */
/* 🧩 БЛОК 3. Обработка конкретных типов уроков */
/* -------------------------------------------------------------------------- */

/**
 * Пробное занятие — визит без оплаты и без абонемента.
 */
async function handleTrialLesson(bot: Telegraf, admins: any[], schedule: any, student: any) {
    console.log(`🎓 Пробное занятие: ${student.firstName}`);

    await prisma.visit.create({
        data: {
            date: schedule.startDate,
            studentId: student.id,
            scheduleId: schedule.id,
        },
    });

    await notifyAdmins(bot, admins, schedule, student, 'Создан визит (пробное занятие)');
}

/**
 * Абонементное занятие — визит, связанный с активным абонементом.
 */
async function handleAbonementLesson(
    bot: Telegraf,
    admins: any[],
    schedule: any,
    student: any,
    now: Date,
) {
    const abonement = await prisma.abonement.findFirst({
        where: {
            studentId: student.id,
            teacherId: schedule.teacherId,
            subjectId: schedule.subjectId,
            startDate: { lte: now },
            endDate: { gte: now },
        },
    });

    if (!abonement) {
        console.warn(`⚠️ Нет активного абонемента у ${student.firstName}`);
        return;
    }

    await prisma.visit.create({
        data: {
            date: schedule.startDate,
            studentId: student.id,
            scheduleId: schedule.id,
            abonementId: abonement.id,
        },
    });

    await createTeacherTransaction(schedule);

    await notifyAdmins(bot, admins, schedule, student, 'Создан визит (по абонементу)');
}

/**
 * Разовое занятие — визит + автоматическое создание оплаты.
 */
async function handleOnetimeLesson(
    bot: Telegraf,
    admins: any[],
    schedule: any,
    student: any,
    now: Date,
) {
    console.log(`💸 Разовое занятие: ${student.firstName}`);

    const visit = await prisma.visit.create({
        data: {
            date: schedule.startDate,
            studentId: student.id,
            scheduleId: schedule.id,
        },
    });

    await prisma.payment.create({
        data: {
            studentId: student.id,
            type: PaymentType.SINGLE_LESSON,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.CASH,
            amount: 2000,
            date: now,
            comment: 'Разовое занятие',
            visitId: visit.id,
        },
    });

    await createTeacherTransaction(schedule);

    await notifyAdmins(bot, admins, schedule, student, 'Создан визит и оплата (разовое занятие)');
}

/* -------------------------------------------------------------------------- */
/* 🧩 БЛОК 4. Уведомления */
/* -------------------------------------------------------------------------- */

async function notifyAdmins(
    bot: Telegraf,
    admins: any[],
    schedule: any,
    student: any,
    prefix: string,
) {
    const msg =
        `📋 *${prefix}*\n` +
        `👨‍🎓 ${student.firstName}\n` +
        `📘 ${schedule.subject.name}\n` +
        `👨‍🏫 ${schedule.teacher.name}\n` +
        `🕒 ${toMSKfromUTC(schedule.startDate).toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
        })}`;

    for (const admin of admins) {
        if (!admin.telegramId) continue;
        await bot.telegram
            .sendMessage(admin.telegramId, msg, { parse_mode: 'Markdown' })
            .catch(() => {});
    }
}

/**
 * Создание TeacherTransaction при визите + обновление баланса преподавателя
 */
async function createTeacherTransaction(schedule: any) {
    // Загружаем преподавателя с базовой ставкой
    const teacher = await prisma.teacher.findUnique({
        where: { id: schedule.teacherId },
        select: { id: true, baseRate: true },
    });

    if (!teacher || !teacher.baseRate) {
        console.warn(`⚠️ У преподавателя ID=${schedule.teacherId} не указана baseRate`);
        return;
    }

    // 1️⃣ Создаём транзакцию
    await prisma.teacherTransaction.create({
        data: {
            teacherId: teacher.id,
            type: TeacherTransactionType.LESSON_INCOME,
            amount: teacher.baseRate,
            description: 'Доход за проведённый урок',
            scheduleId: schedule.id,
        },
    });

    // 2️⃣ Увеличиваем баланс преподавателя
    await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
            balance: { increment: teacher.baseRate },
        },
    });

    console.log(
        `💰 Добавлена транзакция преподавателю ID=${teacher.id} (+${teacher.baseRate} ₽, баланс обновлён)`,
    );
}
