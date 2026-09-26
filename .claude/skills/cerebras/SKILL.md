---
Name: Cerebras Inference 
Description: Use this to write code to call an LLM using LiteLLM and OpenRouter with Cerebras Inference provider. This skill is designed to help you generate code that interacts with the Cerebras Inference API for running large language models (LLMs) efficiently. You can use this skill to create scripts, functions, or applications that leverage the capabilities of Cerebras Inference for various tasks such as text generation, summarization, translation, and more.  
---

# Calling an LLM via Cerebras

These instructions allow you write code to call an LLM with Cerebras specified as the inference provider.  
This method uses LiteLLM and OpenRouter.

## Setup

The OPENROUTER_API_KEY must be set in the .env file and loaded in as an environment variable.  

The uv project must include litellm and pydantic.
`uv add litellm pydantic`

## Code snippets

Use code like these examples in order to use Cerebras.

### Imports and constants

```python
from litellm import completion
MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}
```

### Code to call via Cerebras for a text response

```python
response = completion(model=MODEL, messages=messages, reasoning_effort="low", extra_body=EXTRA_BODY)
result = response.choices[0].message.content
```

### Code to call via Cerebras for a Structured Outputs response

```python
response = completion(model=MODEL, messages=messages, response_format=MyBaseModelSubclass, reasoning_effort="low", extra_body=EXTRA_BODY)
result = response.choices[0].message.content
result_as_object = MyBaseModelSubclass.model_validate_json(result)
```