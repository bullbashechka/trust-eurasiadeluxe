export function whatsappLink(
  number: string,
  area?: string,
  url = "",
  intent: "visit" | "price" = "visit",
): string | undefined {
  if (!/^[1-9]\d{7,14}$/.test(number)) return undefined;
  const apartment = area
    ? ` квартиру ${area} м² в Eurasia De Luxe`
    : " квартиры в Eurasia De Luxe";
  const message =
    intent === "price"
      ? `Здравствуйте! Хочу уточнить стоимость:${apartment}.`
      : `Здравствуйте! Хочу посмотреть${apartment}. Подскажите, когда можно записаться на просмотр?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message + (url ? `\n${url}` : ""))}`;
}
