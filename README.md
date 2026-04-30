# Travel Match

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and set your OpenAI key:

   ```bash
   OPENAI_API_KEY="your_openai_api_key"
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

The app runs at `http://localhost:3000/`. The UI loads without an API key, but live travel recommendations require `OPENAI_API_KEY`.
