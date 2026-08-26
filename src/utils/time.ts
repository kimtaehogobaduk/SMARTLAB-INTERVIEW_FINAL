/**
 * 대한민국 표준시(KST, UTC+9, Asia/Seoul) 시간 및 날짜 유틸리티
 * 모든 서버/클라이언트 환경에서 일관된 실시간 한국 시간을 제공합니다.
 */

export const KST_TIMEZONE = 'Asia/Seoul';

/**
 * 실시간 대한민국 표준시(KST) 시간 문자열 반환 (HH:mm:ss 또는 HH:mm)
 */
export function getKSTTimeString(
  dateInput: Date | number | string = new Date(),
  showSeconds: boolean = true
): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: false
  }).format(d);
}

/**
 * 실시간 대한민국 표준시(KST) 날짜 문자열 반환 (YYYY. MM. DD)
 */
export function getKSTDateString(
  dateInput: Date | number | string = new Date()
): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * 실시간 대한민국 표준시(KST) 날짜 및 시간 전체 문자열 반환 (YYYY-MM-DD HH:mm:ss)
 */
export function getKSTDateTimeString(
  dateInput: Date | number | string = new Date()
): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const dateParts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const getPart = (type: string) => dateParts.find(p => p.type === type)?.value || '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

/**
 * 실시간 KST 디지털 시계용 포맷터
 */
export const getKSTTimeStr = getKSTTimeString;
export const getKSTDateTimeStr = getKSTDateTimeString;
export const getKSTDateStr = getKSTDateString;
