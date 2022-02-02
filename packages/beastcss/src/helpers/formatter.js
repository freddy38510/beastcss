const { format: formatDigital } = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'kilobyte',
  maximumFractionDigits: 4,
});

const { format: formatDuration } = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'millisecond',
  maximumFractionDigits: 0,
});

const { format: formatConcentration } = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  maximumFractionDigits: 2,
});

// bytes from Buffer.byteLength to kilobytes
export const formatToKB = (number) => formatDigital(number / 1000);

// nanoseconds from process.hrtime.bigint() to milliseconds
export const formatToMs = (number) => formatDuration(Number(number) / 1000000);

// partial percent of total
export const formatToPercent = (partial, total) =>
  formatConcentration((partial / total) * 100 || 0);
