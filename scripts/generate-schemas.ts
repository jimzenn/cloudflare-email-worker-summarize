import * as TJS from "typescript-json-schema";
import * as fs from "fs";
import * as path from "path";

const settings: TJS.PartialArgs = {
  required: true,
  ref: false,
  noExtraProps: true,
};

const compilerOptions: TJS.CompilerOptions = {
  strictNullChecks: true,
};

const program = TJS.getProgramFromFiles(
  [
    path.resolve("src/types/triage.ts"),
    path.resolve("src/types/flight.ts"),
    path.resolve("src/types/verification.ts"),
    path.resolve("src/types/summarize.ts"),
    path.resolve("src/types/bill.ts"),
    path.resolve("src/types/hotel.ts"),
    path.resolve("src/types/basicCalendarEvent.ts"),
    path.resolve("src/types/promotion.ts"),
    path.resolve("src/types/notification.ts"),
    path.resolve("src/types/legal.ts"),
    path.resolve("src/types/tracking.ts"),
  ],
  compilerOptions
);

const schemas = {
  "TriageSchema": TJS.generateSchema(program, "TriageInfo", settings),
  "FlightSchema": TJS.generateSchema(program, "FlightItinerary", settings),
  "VerificationSchema": TJS.generateSchema(program, "VerificationCode", settings),
  "SummarizeSchema": TJS.generateSchema(program, "SummarizeResponse", settings),
  "BillSchema": TJS.generateSchema(program, "BillInfo", settings),
  "BasicCalendarEventSchema": TJS.generateSchema(program, "BasicCalendarEvent", settings),
  "HotelSchema": TJS.generateSchema(program, "HotelStay", settings),
  "PromotionSchema": TJS.generateSchema(program, "PromotionDetails", settings),
  "NotificationSchema": TJS.generateSchema(program, "NotificationInfo", settings),
  "LegalSchema": TJS.generateSchema(program, "LegalDetails", settings),
  "TrackingSchema": TJS.generateSchema(program, "TrackingInfo", settings),
};

const schemasDir = path.resolve("src/schemas");
if (!fs.existsSync(schemasDir)) {
  fs.mkdirSync(schemasDir, { recursive: true });
}

Object.entries(schemas).forEach(([name, schema]) => {
  fs.writeFileSync(
    path.join(schemasDir, `${name}.json`),
    JSON.stringify(schema, null, 2)
  );
});

console.log("✨ JSON schemas generated successfully!"); 