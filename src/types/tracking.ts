export type TrackingInfo = {
  store_name: string;
  item_name: string;
  order_id: string;
  order_url?: string;
  tracking_number?: string;
  status: string;
  total_amount: number;
  currency: string;
  recipient_name: string;
  destination_city: string;
  destination_state: string;
};
