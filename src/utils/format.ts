import { format, parseISO } from "date-fns";

export const money = (value: number, currency: string = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value || 0);
  } catch {
    return `${currency || "USD"} ${(value || 0).toFixed(2)}`;
  }
};

export const shortDate = (iso: string) => {
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
};
