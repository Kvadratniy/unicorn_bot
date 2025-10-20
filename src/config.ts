import * as dotenv from 'dotenv';
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN || '';

// ID пользователей Telegram, которые могут пользоваться ботом
export const ALLOWED_USERS = [248543646, 440005074];

// ID календаря. Если основной — можно "primary" или адрес почты.
export const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

// путь до ключа сервис-аккаунта
export const SERVICE_ACCOUNT_KEY_FILE = 'service-account.json';
