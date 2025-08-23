from openai import AzureOpenAI
from dotenv import load_dotenv
import os
from typing import List, Dict, Any

load_dotenv()


def gpt4o_mini_azure_history(
    system: str,
    history: List[Dict[str, Any]],
    key: str,
    endpoint: str,
    temperature: float = 0.7,
    top_p: float = 1.0,
):
    """Synchronous Azure OpenAI call with history support."""
    client = AzureOpenAI(
        api_key=key,
        api_version="2024-02-01",
        azure_endpoint=endpoint,
    )

    # dynamically create the messages list
    messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
    # Add history messages ensuring correct role and content keys
    for message in history:
        # Basic validation, assuming history has 'role' and 'content'
        if isinstance(message, dict) and "role" in message and "content" in message:
            messages.append({"role": message["role"], "content": message["content"]})
        else:
            # Handle potential malformed history entries if necessary
            print(f"Skipping malformed history message: {message}")
            pass

    # Create a chat completion request
    response = client.chat.completions.create(
        messages=messages,  # type: ignore
        model="gpt-4o-mini",
        temperature=temperature,
        top_p=top_p,
        max_tokens=250,  # Increased for longer responses
    )

    # Access the content and usage information using dot notation
    content = response.choices[0].message.content

    return content
