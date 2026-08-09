export type GroupDayType = 'even' | 'odd' | 'weekdays' | 'daily';

const EVEN_WEEKDAYS = new Set([1, 3, 5]);
const ODD_WEEKDAYS = new Set([2, 4, 6]);

export function isGroupClassDay(groupDayType: GroupDayType, now = new Date()) {
  const weekday = now.getDay();

  if (groupDayType === 'daily') return true;
  if (groupDayType === 'weekdays') return weekday !== 0;
  if (weekday === 0) return false;

  return groupDayType === 'even' ? EVEN_WEEKDAYS.has(weekday) : ODD_WEEKDAYS.has(weekday);
}

export function getAttendanceBlockedMessage(groupDayType: GroupDayType, now = new Date()) {
  if (isGroupClassDay(groupDayType, now)) return '';

  if (now.getDay() === 0 && groupDayType !== 'daily') {
    return 'Bugun yakshanba — dars yo\'q, davomat qo\'yib bo\'lmaydi';
  }

  switch (groupDayType) {
    case 'even':
      return 'Bugun juft kun emas — bu guruh faqat dushanba, chorshanba va juma kunlari dars oladi';
    case 'odd':
      return 'Bugun toq kun emas — bu guruh faqat seshanba, payshanba va shanba kunlari dars oladi';
    case 'weekdays':
      return 'Bugun dars kuni emas — bu guruh dushanbadan shanbagacha dars oladi';
    default:
      return 'Bugun davomat qo\'yib bo\'lmaydi';
  }
}
