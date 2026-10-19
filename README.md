# College FAQ Assistant

A beginner-friendly, responsive college FAQ chatbot mini-project built with HTML, CSS, and vanilla JavaScript.

## Files
- `index.html` — page structure, chat area, FAQ browser, and test section.
- `style.css` — responsive blue-and-white interface styling.
- `faq-data.js` — the 30-entry structured FAQ knowledge base.
- `script.js` — keyword/similarity matching, chat behavior, filters, and automated tests.

## Run locally
1. Download and extract `college_faq_chatbot.zip`, or keep all four source files in one folder.
2. Open `index.html` in a modern browser (double-click the file).
3. Ask a question, click a suggested question, browse FAQs, or select **Run Tests**.

No backend, database, paid API key, or build tools are required. Google Fonts is optional; if unavailable, the page uses local fallback fonts.

## Important project note
This is a **rule-based FAQ knowledge-base chatbot**, not a fully generative AI chatbot. It returns answers only from `faq-data.js`, and uses a fixed fallback for unsupported questions. Sample dates, fees, eligibility criteria, policies, and course details are illustrative; replace them with verified college information before real use.

## Extend the FAQ knowledge base
Open `faq-data.js` and add an object with a unique `id`, a category, a question, and an answer. Use one of these categories: `Admissions`, `Courses`, `Examinations`, `Fees and Scholarships`, or `Placements`.

## Future AI integration
If adding a real AI model later, route requests through a secure backend. Never put an API key in browser-side JavaScript. Keep verified college information as the source of truth and validate model answers against approved content.
