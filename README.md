# AI-Powered Email Automation Engine

This project is a serverless email automation engine that uses Large Language Models (LLMs) to triage, parse, and act on incoming emails. It runs entirely on the Cloudflare edge network, providing a robust and efficient solution for managing high-volume email workflows.

## Core Functionality

The system intelligently processes a variety of email types, including:

-   **Event & Reservation Processing:** Extracts event details from confirmation emails (e.g., flights, hotels) and offers one-click calendar integration.
-   **Structured Data Extraction:** Parses unstructured emails like bills and invoices into structured JSON, identifying key information like due dates and amounts.
-   **Content Summarization:** Condenses newsletters and promotional emails into concise summaries.
-   **Automated Notifications:** Delivers processed information via formatted Telegram messages with interactive components.

## System Architecture & Data Flow

The architecture is designed for scalability and maintainability, leveraging a serverless, event-driven model.

1.  **Email Ingestion (Cloudflare Email Routing):** Emails are piped directly to a Cloudflare Worker, which triggers the processing pipeline.
2.  **AI-Powered Triage:** An initial LLM call categorizes the email (e.g., `event`, `bill`, `newsletter`) and performs a preliminary cleaning of the email body to remove signatures and boilerplate text.
3.  **Modular Handler Dispatch:** Based on the category, the system dispatches the email to a specialized handler module. This modular design isolates logic for each email type, making the system easy to extend.
4.  **Schema-Driven Information Extraction:** The dedicated handler invokes a second, more targeted LLM call. It uses a Zod schema to enforce structured output, ensuring the data returned by the LLM is predictable, validated, and type-safe.
5.  **Action & Notification:**
    *   The structured data is used to format a detailed message sent via the Telegram API.
    *   For actionable items like events, the Telegram message includes an inline keyboard button.
    *   User interaction with the button triggers a `callback_query` webhook. The worker handles this by retrieving the full event context from a Cloudflare KV store and executing the requested action, such as creating a Google Calendar event.

## Key Technical Highlights

This project demonstrates proficiency in modern cloud and AI engineering practices:

*   **Serverless Architecture:** The entire application is deployed as a Cloudflare Worker, running on the edge for low latency and high availability without managing any server infrastructure.
*   **Multi-Stage LLM Chain:** The system employs a two-stage LLM process: a broad categorization followed by a fine-tuned, schema-enforced extraction. This improves both accuracy and cost-efficiency over a single, complex prompt.
*   **Schema-Enforced LLM Output:** By integrating Zod schemas with the LLM prompting, the system guarantees reliable, type-safe JSON output from the model, eliminating the need for fragile string parsing and runtime validation of the AI's response.
*   **Stateful Actions in a Stateless Environment:** Manages stateful user interactions (e.g., "Add to Calendar" clicks) in a stateless serverless environment by persisting event data in Cloudflare KV, bridging the gap between the initial notification and a future user callback.
*   **Extensible, Handler-Based Design:** The core logic is built around a base handler class with specialized implementations for different email categories. This object-oriented pattern allows for rapid development of new email processing capabilities.
*   **Infrastructure as Code (IaC):** Project configuration, including environment variables and KV namespace bindings, is managed declaratively through the `wrangler.toml` file, enabling reproducible deployments.