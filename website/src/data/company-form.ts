import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function validateCompanyForm(_name: string, phone: string) {
  const errors = { name: "", phone: "" };
  const number = parsePhoneNumberFromString(phone, "KZ");
  if (!number || number.country !== "KZ" || !number.isValid()) {
    errors.phone = "Укажите корректный номер Казахстана";
  }
  return { errors, valid: !errors.name && !errors.phone };
}

/** View state only. Form values are deliberately not included. */
export const companyVisit = { visited: false, scrollY: 0, returning: false };

export function revealProgress(
  top: number,
  viewport: number,
  remainingScroll = Infinity,
) {
  const travelled = viewport * 0.94 - top;
  const distance = Math.min(
    viewport * 0.32,
    Math.max(1, travelled + remainingScroll),
  );
  return Math.max(0, Math.min(1, travelled / distance));
}
