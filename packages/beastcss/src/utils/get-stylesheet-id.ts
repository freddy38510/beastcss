let count = 0;

export default function getStylesheetId() {
  const id = count.toString();

  count += 1;

  return id;
}
