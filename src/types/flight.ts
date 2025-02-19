export interface FlightSegment {
  airlineName: string;
  flightNumber: string;
  seatNumber?: string;

  departureTime: string;
  departureTZ: string;
  departureCity: string;
  departureIataCode: string;
  departureTerminal?: string;
  departureGate?: string;

  arrivalTime: string;
  arrivalTZ: string;
  arrivalCity: string;
  arrivalIataCode: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
}

export interface FlightTrip {
  confirmation_code: string;
  flightClass: string;
  segments: FlightSegment[];
}

export interface FlightItinerary {
  passengerName: string;
  trips: FlightTrip[];
  additional_notes?: string[];
} 