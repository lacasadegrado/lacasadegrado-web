/** "García" and "garcia" match: searches ignore accents, case and extra spaces. */
export function foldSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
