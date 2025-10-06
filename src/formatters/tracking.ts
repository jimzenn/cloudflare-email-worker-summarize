import { markdownv2 as format } from 'telegram-format';
import { TrackingInfo } from "@/types/tracking";
import { currencySymbol } from "@/utils/currency";

export function formatTrackingMessage(trackingInfo: TrackingInfo): { title: string, message: string } {
  const title = `[${trackingInfo.store_name}] ${trackingInfo.item_name}: ${trackingInfo.status}`;

  const messageParts = [
    `- Item: ${trackingInfo.item_name}`
  ];

  if (trackingInfo.order_url) {
    messageParts.push(`- Order: ${format.link(format.monospace(trackingInfo.order_id), trackingInfo.order_url)}`);
  } else {
    messageParts.push(`- Order: ${format.monospace(trackingInfo.order_id)}`);
  }

  if (trackingInfo.tracking_number) {
    const trackingUrl = `https://www.17track.net/en/track?nums=${trackingInfo.tracking_number}`;
    messageParts.push(`- Tracking: ${format.link(format.monospace(trackingInfo.tracking_number), trackingUrl)}`);
  }

  messageParts.push(`- Status: ${format.bold(trackingInfo.status)}`);
  messageParts.push(`- Total: ${currencySymbol(trackingInfo.currency)}${trackingInfo.total_amount.toFixed(2)}`);
  messageParts.push(`- To: ${trackingInfo.recipient_name}`);

  const destination = `${trackingInfo.destination_city}, ${trackingInfo.destination_state}`;
  const destinationQuery = encodeURIComponent(destination);
  const destinationUrl = `https://www.google.com/maps/search/?api=1&query=${destinationQuery}`;
  messageParts.push(`- Destination: ${format.link(destination, destinationUrl)}`);

  return { title, message: messageParts.join('\n') };
}
