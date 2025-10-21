import { Telegraf, Scenes, session } from 'telegraf';
import { showBaseMenu } from './feature/menu/menus';

import addSubjectScene from './feature/subjects/scenes/add.wizard';
import { searchStudentScene } from './feature/student/scene/search.wizard';
import { addStudentScene } from './feature/student/scene/add.wizard';

import { registerMenuHandlers } from './feature/menu/menu.registration';
import { roleMiddleware } from './middleware/roleMiddleware';
import { registerScheduleHandlers } from './feature/schedule/schedule.registration';
import { studentRegistration } from './feature/student/student.registration';
import { subjectRegistration } from './feature/subjects/subject.registration';
import { abonementRegistration } from './feature/abonement/abonement.registration';
import { removeInlineKeyboard } from './utils/helpers';
import { initCreateVisitsJob } from './jobs/autoVisit.job';
import { addAbonementScene } from './feature/abonement/scene/add.wizard';
import { userContextMiddleware } from './middleware/userContextMiddleware';
import { addAvailabilityScene } from './feature/teacher/scene/addAvailability.wizard';
import { registerTeacherHandlers } from './feature/teacher/teacher.registration';
import { registerVisitsHandlers } from './feature/visits/visits.registrate';
import { registerPaymentsHandlers } from './feature/payment/payment.registration';
import {withdrawTeacherWizard} from "./feature/teacher/scene/withdraw.wizard";
import {addOnetimeSchedule} from "./feature/schedule/scene/addOnetimeSchedule.wizard";
import {addTrialSchedule} from "./feature/schedule/scene/addTrialSchedule.wizard";
import {addAbonementSchedule} from "./feature/schedule/scene/addAbonementSchedule.wizard";
import {addAbonementPayment} from "./feature/payment/scene/addAbonementPayment.wizard";
import {addOnetimePaymentWizard} from "./feature/payment/scene/addOnetimePayment.wizard";

const bot = new Telegraf<UnicornWizardContext>(process.env.BOT_TOKEN!);

const stage = new Scenes.Stage([
    addSubjectScene,

    addStudentScene,
    searchStudentScene,
    addAbonementScene,
    addAbonementPayment,

    addTrialSchedule,
    addAbonementSchedule,
    addAvailabilityScene,
    addOnetimeSchedule,
    addOnetimePaymentWizard,
    withdrawTeacherWizard,
]);

// === MIDDLEWARE ===
bot.use(session()); // 1️⃣ сначала сессии
bot.use(userContextMiddleware); // 2️⃣ затем наш контекст пользователя
bot.use(stage.middleware()); // 3️⃣ после этого сцены
bot.use(roleMiddleware); // 4️⃣ и потом проверки ролей

// стартовое меню
bot.start((ctx) => showBaseMenu(ctx));

bot.on('callback_query', async (ctx, next) => {
    await removeInlineKeyboard(ctx);
    await next();
});

// регистрируем обработчики меню
registerMenuHandlers(bot);

// регистрируем обработчики расписания на неделю
registerScheduleHandlers(bot);

// регистрируем обработчики студентов
studentRegistration(bot);

// регистрируем обработчики предметов
subjectRegistration(bot);

// регистрируем обработчики абонементов
abonementRegistration(bot);

// регистрируем обработчики учителей
registerTeacherHandlers(bot);

registerVisitsHandlers(bot);

registerPaymentsHandlers(bot);

initCreateVisitsJob();

bot.launch();
