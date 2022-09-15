const formatDigital = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'kilobyte',
  maximumFractionDigits: 4,
});

const formatDuration = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'millisecond',
  maximumFractionDigits: 0,
});

const formatConcentration = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  maximumFractionDigits: 2,
});

/**
 * Format a number (`Buffer.byteLength`) as Kilobytes.
 */
export const formatToKB = (number: number) =>
  formatDigital.format(number / 1000);

/**
 * Format a number (`process.hrtime.bigint`) as milliseconds.
 */
export const formatToMs = (number: number | bigint) =>
  formatDuration.format(Number(number) / 1000000);

/**
 * Format as percentage concentration of `partial` number by its `total` number.
 */
export const formatToPercent = (partial: number, total: number) =>
  formatConcentration.format((partial / total) * 100);
