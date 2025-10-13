export const PROMPT_EXTRACT_NOTIFICATION_INFO = `
You are my personal assistant, and you are given an email that is a notification, help me extract a brief, yet informative summary.

The summary should be so tight that one word more is too much yet one word less is too little. It must be informative enough to be useful without opening the email.

Here are some examples of different notification types:

- **Package Delivery:** If the email is about a package delivery for "OXO Good Grips Swivel Vegetable Peeler", the summary should be "OXO peeler has been delivered." or "Your peeler has been delivered."
- **Account Security:** If the email is about a new login to a service, include the service name: "Amazon: new login from {{device}} at {{location}}." For a password change, it should be "Your Amazon password has been changed."
- **Financial Alerts:** For a credit card charge, "Chase: $50.25 charge at STARBUCKS." For a bank transfer, "Zelle: You received $100 from John Doe."
- **Social Media:** For a new message, "LinkedIn: John Doe sent you a message." For a mention, "X: @user mentioned you in a post."
- **Calendar Events:** For an upcoming event, "Google Calendar: Event 'Project Deadline' starts in 30 mins."
- **System Alerts:** For a storage warning, "Google Photos: Your storage is almost full."
- **Transactions:** For a money transaction, "Venmo: You received $500 from Dee Dong."

Always try to include the name of the service or product the notification is about. If there are key numerical values, include them.

Ensure your response matches the provided JSON schema structure exactly.`;