// МСК → UTC
export function toUTCfromMSK(date: Date) {
    return new Date(date.getTime() - 3 * 60 * 60 * 1000);
}

// UTC → МСК
export function toMSKfromUTC(date: Date) {
    return new Date(date.getTime() + 3 * 60 * 60 * 1000);
}
