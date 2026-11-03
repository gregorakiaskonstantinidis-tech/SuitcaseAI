# SuitcaseAI

A mobile-first travel packing prototype built with React, TypeScript, Vite, Tailwind CSS, and React Router.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Choose **Explore the demo** to enter without creating an account.

## Try the prototype

1. Use **Closet & bags** to add or edit wardrobe pieces and luggage.
2. Select **Trip** and follow the six steps: destination and dates (with an automatic weather estimate), suitcase, activities, outfit count and packing, editable outfit combinations, and a final checklist. SuitcaseAI builds the requested number of looks from your wardrobe and flags missing weather-appropriate items as packing recommendations.
3. Swap or add wardrobe pieces to outfit ideas, check or uncheck recommended clothes, adjust essentials, and add custom checklist reminders before saving.
4. Open **Saved trips** to revisit the plan, continue checking items, edit it, or delete it.

The sample wardrobe and luggage are preloaded. Account state, profile, wardrobe, luggage, trips, and preference learning are saved in browser LocalStorage. Weather uses Open-Meteo's geocoding, live forecast, and historical archive APIs: far-future trips use a clearly labeled local climate normal, with a broader seasonal fallback if data is unavailable. Outfit ranking combines weather, trip activities, clothing categories, estimated bag space, and an on-device online preference model. Thumbs-up/down feedback adjusts the model's item, color, and category weights for future trips; no manual style quiz or clothing-occasion tags are needed.

This prototype does not connect to a hosted generative-AI model or use a vision model to identify garment type, cut, or style. It estimates a dominant photo color locally, then uses transparent recommendation logic and feedback learning; a production LLM/vision service would require a secure backend and provider credentials. Uploaded photos and learned preferences stay in this browser.

On desktop, the app is presented in a phone-sized preview. On phones, it fills the screen with a mobile bottom navigation.
