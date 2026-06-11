---
Task ID: 1
Agent: Super Z (main)
Task: Fix AI auto-response to be context-aware with real clinic data

Work Log:
- Created src/lib/ai-orchestrator.ts: shared module with full clinic context
  - Loads clinic name, persona name, phone, address, city, state
  - Loads services with prices and duration from DB
  - Loads doctors with specialties and work schedules from DB
  - Loads conversation history (last 15 messages)
  - Builds rich system prompts with real business data
  - Routes to specialized agents (desk/flow/bill/grow)
- Updated webhook route to use new orchestrator
  - Removed inline generateAIResponse (was generic, no context)
  - Removed generateFallbackResponse (generic hardcoded responses)
  - Uses generateContextualResponse with full clinic context
  - Emergency fallback uses clinic name instead of generic text
- Updated orchestrator API route to use shared module
  - No more duplicated agent routing logic
  - Full clinic context in all AI responses
- Added OpenAI provider support for Vercel deployment
  - Z-AI SDK (internal-api.z.ai) is NOT reachable from Vercel servers
  - Added OpenAI as primary AI provider when OPENAI_API_KEY is set
  - Supports any OpenAI-compatible API via OPENAI_BASE_URL (Groq, Together, etc.)
  - Default model: gpt-4o-mini (cost-effective for dental clinic chat)

Stage Summary:
- AI orchestrator now has full clinic context (services, prices, doctors, schedules)
- The Z-AI SDK only works within Z.ai infrastructure, not from Vercel
- OpenAI integration added but needs OPENAI_API_KEY env var on Vercel
- Emergency fallback now uses real clinic name and context
- Clinic data confirmed: CENPOD CENTRO PODOLOGICO, 3 services, 2 doctors
- BLOCKING: Need user to add OPENAI_API_KEY to Vercel environment variables
