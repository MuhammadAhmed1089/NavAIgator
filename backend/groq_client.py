"""
groq_client.py — Groq API client with automatic key rotation.

Loads up to 8 API keys from .env. On every call:
  - Tries the current key.
  - If a RateLimitError or 429 is received, rotates to the next key
    and retries immediately (no sleep needed — different key = fresh quota).
  - If ALL keys are exhausted in a cycle, waits GROQ_RETRY_DELAY_SECONDS
    before starting another cycle.
  - Gives up after GROQ_MAX_RETRIES full cycles.
"""

import os
import time
import logging
from itertools import cycle

from dotenv import load_dotenv
from groq import Groq, RateLimitError, APIStatusError

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

logger = logging.getLogger(__name__)

# ── Load all keys from env ──────────────────────────────────────────────────
def _load_keys() -> list[str]:
    keys = []
    for i in range(1, 9):
        key = os.getenv(f"GROK_API_KEY_{i}", "").strip()
        if key:
            keys.append(key)
    if not keys:
        raise ValueError(
            "No Groq API keys found. Set GROQ_API_KEY_1 ... GROQ_API_KEY_6 in backend/.env"
        )
    logger.info(f"Loaded {len(keys)} Groq API key(s) for rotation.")
    return keys

print("GROQ vars seen:", sorted(k for k in os.environ if "GROQ" in k.upper()), flush=True)

_KEYS = _load_keys()
_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
_MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "3"))
_RETRY_DELAY = float(os.getenv("GROQ_RETRY_DELAY_SECONDS", "2"))

# Track the current key index across the module
_key_index = 0


def _get_client() -> tuple[Groq, int]:
    """Return a Groq client for the current key and its index."""
    global _key_index
    client = Groq(api_key=_KEYS[_key_index])
    return client, _key_index


def _rotate_key() -> None:
    """Rotate to the next key."""
    global _key_index
    old = _key_index
    _key_index = (_key_index + 1) % len(_KEYS)
    logger.warning(f"Rotated Groq key: slot {old+1} → slot {_key_index+1}.")


def chat_complete(
    messages: list[dict],
    response_format: dict | None = None,
    temperature: float = 0.0,
    max_tokens: int = 4096,
) -> str:
    """
    Send a chat completion request with automatic key rotation on rate limits.

    Args:
        messages: List of {"role": ..., "content": ...} dicts.
        response_format: e.g. {"type": "json_object"} for JSON mode.
        temperature: 0.0 for deterministic extraction.
        max_tokens: Max tokens in the response.

    Returns:
        The raw string content of the model's reply.

    Raises:
        RuntimeError: If all retries across all keys fail.
    """
    attempt = 0
    keys_tried_this_cycle = 0

    while attempt < _MAX_RETRIES:
        client, slot = _get_client()
        try:
            kwargs = dict(
                model=_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if response_format:
                kwargs["response_format"] = response_format

            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            logger.info(
                f"Groq call OK | key slot {slot+1} | "
                f"tokens_used={response.usage.total_tokens}"
            )
            return content

        except RateLimitError:
            logger.warning(f"Rate limit hit on key slot {slot+1}. Rotating...")
            _rotate_key()
            keys_tried_this_cycle += 1

            # If we've tried all keys in this cycle, wait before retrying
            if keys_tried_this_cycle >= len(_KEYS):
                attempt += 1
                keys_tried_this_cycle = 0
                if attempt < _MAX_RETRIES:
                    logger.warning(
                        f"All {len(_KEYS)} keys hit rate limit. "
                        f"Waiting {_RETRY_DELAY}s before retry cycle {attempt+1}/{_MAX_RETRIES}..."
                    )
                    time.sleep(_RETRY_DELAY)

        except APIStatusError as e:
            logger.error(f"Groq API error on key slot {slot+1}: {e}")
            raise

    raise RuntimeError(
        f"All {_MAX_RETRIES} retry cycles exhausted across {len(_KEYS)} keys. "
        "Check your API keys and rate limits."
    )


# ── Quick smoke test ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    result = chat_complete(
        messages=[{"role": "user", "content": "Say 'Groq key rotation working!' and nothing else."}],
        temperature=0.0,
    )
    print(result)
