import { HotelStay } from "@/types/hotel";
import { currencySymbol } from "@/utils/currency";
import { markdownv2 as format } from 'telegram-format';
import { DIVIDER, formatList } from "@/formatters/common";

export function formatHotelStay(stay: HotelStay) {
  const header = [
    `${format.bold(stay.hotelName)}`,
    `Confirmation: ${format.monospace(stay.confirmationCode)}`,
    `Guest: ${format.bold(stay.guestName)} (${stay.numberOfGuests} guests)`,
    '',
    `${format.bold('Room:')} ${stay.roomType}`,
    `${format.bold('Check-in:')} ${stay.checkInDate} ${stay.checkInTime}`,
    `${format.bold('Check-out:')} ${stay.checkOutDate} ${stay.checkOutTime}`,
    '',
    format.bold('Address: ') + format.url(stay.address, `https://maps.google.com/?q=${encodeURIComponent(stay.address)}`),
    `${format.bold('Total:')} ${currencySymbol(stay.currency)} ${stay.totalAmount}`,
    ''
  ];

  if (stay.cancellationPolicy) {
    header.push(
      format.bold('Cancellation Policy:'),
      stay.cancellationPolicy,
      ''
    );
  }

  const messageParts = [...header];

  if (stay.additionalNotes && stay.additionalNotes.length > 0) {
    messageParts.push(
      DIVIDER,
      format.bold('Additional Notes:'),
      formatList(stay.additionalNotes)
    );
  }

  return messageParts.join('\n');
}
