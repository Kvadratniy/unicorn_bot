import { google } from 'googleapis';
import * as fs from 'fs';
import { SERVICE_ACCOUNT_KEY_FILE, CALENDAR_ID } from '../../config';

const key = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_FILE, 'utf-8'));

const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

export async function getUpcomingEvents(limit = 10, timeMin?: Date, timeMax?: Date) {
    const res = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: (timeMin || new Date()).toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: limit,
        singleEvents: true,
        orderBy: 'startTime',
    });
    return res.data.items || [];
}

export async function addEventToCalendar(summary: string, date: Date) {
    const event = {
        summary,
        start: { dateTime: date.toISOString() },
        end: { dateTime: new Date(date.getTime() + 60 * 60 * 1000).toISOString() }, // +1 час
    };

    await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: event,
    });
}
