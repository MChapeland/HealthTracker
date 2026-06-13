UPDATE settings
SET meal_estimate_model = 'gemini-2.5-flash'
WHERE meal_estimate_model IN ('gemini-2.0-flash', 'gemini-2.0-flash-lite', '');
