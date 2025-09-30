export interface FlightSegment {
  airlineName: string;
  flightNumber?: string;
  seatNumber?: string;

  departureTime: string;
  departureTimezone: string;
  departureCity: string;
  departureIataCode: string;
  departureTerminal?: string;
  departureGate?: string;

  arrivalTime: string;
  arrivalTimezone: string;
  arrivalCity: string;
  arrivalIataCode: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
}

export interface FlightTrip {
  confirmationCode: string;
  flightClass: string;
  segments: FlightSegment[];
}

export interface FlightItinerary {
  passengerName: string;
  trips: FlightTrip[];
  additionalNotes?: string[];
}