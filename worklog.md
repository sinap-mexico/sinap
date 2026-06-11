---
Task ID: 2
Agent: Super Z (main)
Task: Implement AI function calling for appointment booking

Work Log:
- Updated zai.ts with function calling support
  - Added ToolCall, ChatMessage, ToolDefinition, ChatCompletionResponse types
  - OpenAI-compatible client now passes tools and returns tool_calls
  - Handles ChatCompletionMessageToolCall union type properly
- Rewrote ai-orchestrator.ts with complete tool calling support
  - check_availability tool: queries doctor schedules, finds open time slots
  - create_appointment tool: creates real appointments in the database
  - Multi-step LLM flow: AI calls tool → gets result → generates natural response
  - Checks for scheduling conflicts before creating appointments
  - Includes doctor IDs and service IDs in system prompt
  - Adds current date to system prompt for accurate scheduling
  - timeToMinutes/minutesToTime helpers for slot generation
- Updated webhook route to pass patient.id to generateContextualResponse

Stage Summary:
- AI can now check doctor availability and create appointments
- Function calling works with Groq's llama-3.3-70b-versatile model
- Deploy is live and working: aiTest returns "OK" with Groq provider
- Clinic data includes service IDs and doctor IDs for tool use
- Next: User tests end-to-end with real WhatsApp message
