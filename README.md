# Email Summarization and Triage Cloudflare Worker

This project is a Cloudflare Worker that processes incoming emails, uses AI to summarize their content, triages them into categories, and sends notifications to various services. It's designed to be a powerful, customizable, and easy-to-deploy solution for managing email overload.

## ✨ Key Features

- **AI-Powered Summarization**: Utilizes large language models (LLMs) from OpenAI, Google Gemini, and DeepSeek to generate concise and informative summaries of email content.
- **Intelligent Triage**: Automatically categorizes emails into predefined categories (e.g., `Personal`, `Promotional`, `Transactional`) to help you prioritize what's important.
- **Google Calendar Integration**: Can automatically create Google Calendar events from emails that contain event information.
- **Multi-Channel Notifications**: Sends notifications to Pushover and Telegram, keeping you informed of important emails.
- **Extensible and Customizable**: Built with a modular architecture that makes it easy to add new email handlers, notification services, and LLM providers.

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/email-worker-summarize.git
   cd email-worker-summarize
   ```
2. **Install dependencies:**
    ```bash
    npm install
    ```
3. **Configure the worker:**
    - Create a `wrangler.toml` file in the root of the project.
    - Open `wrangler.toml` and add the necessary configuration. You can refer to the [Configuration](#configuration) section for details on the required variables.
    - You will need to create secrets for your API keys using the wrangler cli:
    ```bash
    npx wrangler secret put OPENAI_API_KEY
    npx wrangler secret put GEMINI_API_KEY
    npx wrangler secret put DEEPSEEK_API_KEY
    npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
    npx wrangler secret put PUSHOVER_TOKEN
    npx wrangler secret put PUSHOVER_USER
    npx wrangler secret put TELEGRAM_BOT_TOKEN
    ```

### Deployment

To deploy the worker to your Cloudflare account, run the following command:

```bash
npm run deploy
```

This command will first generate the necessary JSON schemas from the TypeScript types and then deploy the worker.

## ⚙️ Configuration

The `wrangler.toml` file contains the configuration for the Cloudflare Worker. The following variables are available:

| Variable                  | Description                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EMAIL_ALLOWLIST`         | A comma-separated list of email addresses that are allowed to trigger the worker. Wildcards are supported.    |
| `GOOGLE_CALENDAR_ID`      | The ID of the Google Calendar to which events should be added.                                              |
| `OPENAI_MODEL`            | The OpenAI model to use for generating summaries and other content.                                         |
| `GEMINI_MODEL`            | The Google Gemini model to use for generating summaries and other content.                                  |
| `DEEPSEEK_MODEL`          | The DeepSeek model to use for generating summaries and other content.                                         |
| `OPENAI_REASONING_MODEL`  | The OpenAI model to use for reasoning tasks, such as determining the email category.                        |
| `GEMINI_REASONING_MODEL`  | The Google Gemini model to use for reasoning tasks.                                                         |
| `DEEPSEEK_REASONING_MODEL`| The DeepSeek model to use for reasoning tasks.                                                              |
| `PUSHOVER_API_URL`        | The Pushover API URL for sending notifications.                                                             |
| `TELEGRAM_TO_CHAT_ID`     | The Telegram chat ID to which notifications should be sent.                                                 |

## 🛠️ Scripts

- `npm run generate-schemas`: Generates JSON schemas from TypeScript types.
- `npm run build`: Generates schemas and performs a dry run of the wrangler deployment.
- `npm run deploy`: Generates schemas and deploys the worker.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/email-worker-summarize/issues).