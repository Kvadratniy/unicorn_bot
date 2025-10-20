import { Scenes } from 'telegraf';

declare global {
    /** Состояние для добавления преподавателя */
    interface AddTeacherWizardState {
        teacherData: {
            name?: string;
            phone?: string;
        };
    }

    interface AddAbonementWizardState {
        studentId?: number;
        subjectId?: number;
        templateId?: number;
        teacherId?: number;
    }

    /** Состояние для добавления события */
    interface AddEventWizardState {
        eventData: {
            summary: string;
            date: string; // ISO формат
        };
    }

    /** Состояние для добавления расписания */
    interface AddScheduleWizardState {
        scheduleData: {
            teacherId?: number;
            date?: string;
            subjectId?: number;
        };
        messageId?: number;
    }

    /** Основная сессия для Wizard-сцен */
    interface UnicornSessionData extends Scenes.WizardSessionData {
        addTeacher?: AddTeacherWizardState;
        addEvent?: AddEventWizardState;
        addSchedule?: AddScheduleWizardState;
        addAbonement?: AddAbonementWizardState;
        tmpMessageId?: number;
    }

    /** Главный контекст для всего бота */
    interface UnicornWizardContext extends Scenes.WizardContext<UnicornSessionData> {
        user?: {
            id: number;
            role: 'ADMIN' | 'TEACHER' | 'STUDENT';
            teacherId?: number;
        };
    }
}

export {};
