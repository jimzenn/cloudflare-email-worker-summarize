import { HotelStay } from "@/types/hotel";
import { currencySymbol } from "@/utils/currency";
import { markdownv2 as format } from 'telegram-format';
import { DIVIDER } from "@/formatters/common";

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

  const notes = stay.additionalNotes?.length > 0
    ? [
      DIVIDER,
      format.bold('Additional Notes:'),
      ...stay.additionalNotes.map(note => `• ${note}`)
    ]
    : [];

  return [...header, ...notes].join('\n');
}
