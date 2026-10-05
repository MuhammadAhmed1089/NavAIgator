from groq_client import chat_complete
import json

prompt = (
    "You are an address parser. Extract the city and the 2-letter state abbreviation "
    "from the provided address. Return ONLY a JSON object with 'city' and 'state' keys. "
    "If you cannot determine them, use 'Unknown'."
)
try:
    response = chat_complete(
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": "22521 Haynes St, West Hills, CA 91307"}
        ],
        response_format={"type": "json_object"},
        temperature=0.0
    )
    parsed = json.loads(response)
    print("PARSED:", parsed)
except Exception as e:
    print("FAILED:", e)
