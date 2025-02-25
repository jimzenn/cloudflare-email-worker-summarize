export interface HotelStay {
  hotelName: string;
  roomType: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  timezone: string;
  address: string;
  confirmationCode: string;
  guestName: string;
  numberOfGuests: number;
  totalAmount: number;
  currency: string;
  cancellationPolicy: string;
  additionalNotes: string[];
}
