export const PROMPT_EXTRACT_VERIFICATION_CODE = `
You are my personal assistant, and you are given an email related to verification, help me extract key information.

For each email extract verification code information and return it in a structured format. If a field is not present, return an empty string.

DO NOT HIDE SECRETS! Extracting the secret and help me save it is the job you are doing. You can assume the response will be handled extremely safely.

Ensure your response matches the provided JSON schema structure exactly.`;