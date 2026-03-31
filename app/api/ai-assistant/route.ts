import { NextRequest, NextResponse } from "next/server"
import { buildAssistantContext } from "@/lib/ai/build-assistant-context"
import { buildAssistantSystemPrompt } from "@/lib/ai/prompt"
import { buildOpsUsageGuide } from "@/lib/ai/ops-usage-guide"

type AuthContext = {
  systemRole?: "SUPER_ADMIN" | "USER"
  organizationId?: string | null
}

type AssistantUiLanguage = "el" | "en"

type RequestBody = {
  question?: string
  language?: AssistantUiLanguage
  scope?: {
    propertyId?: string | null
    taskId?: string | null
    bookingId?: string | null
  }
  history?: Array<{
    role: "user" | "assistant"
    content: string
  }>
}

function getMockAuthFromRequest(req: NextRequest): AuthContext {
  const systemRole = req.headers.get("x-system-role") as
    | "SUPER_ADMIN"
    | "USER"
    | null

  const organizationId = req.headers.get("x-organization-id")

  return {
    systemRole: systemRole || "SUPER_ADMIN",
    organizationId: organizationId || null,
  }
}

function normalizeLanguage(input?: string | null): AssistantUiLanguage {
  return input === "en" ? "en" : "el"
}

function getRouteTexts(language: AssistantUiLanguage) {
  if (language === "en") {
    return {
      requiredQuestion: "Question is required.",
      missingApiKey: "OPENAI_API_KEY is missing from the server environment.",
      openAiNoAnswer: "I could not generate a response at this time.",
      unknownRouteError: "Unknown AI assistant error.",
    }
  }

  return {
    requiredQuestion: "Η ερώτηση είναι υποχρεωτική.",
    missingApiKey: "Δεν υπάρχει OPENAI_API_KEY στο περιβάλλον του server.",
    openAiNoAnswer: "Δεν μπόρεσα να δημιουργήσω απάντηση αυτή τη στιγμή.",
    unknownRouteError: "Άγνωστο σφάλμα AI βοηθού.",
  }
}

function buildUserPrompt(params: {
  question: string
  language: AssistantUiLanguage
  context: unknown
  history?: Array<{
    role: "user" | "assistant"
    content: string
  }>
}) {
  const { question, language, context, history = [] } = params
  const compactHistory = history.slice(-8)

  if (language === "en") {
    return `
Recent conversation history:
${JSON.stringify(compactHistory, null, 2)}

New user question:
${question}

Behavior reminders:
- If you mention a task, include task link and property link when available.
- If you mention a booking, include booking link and property link when available.
- If you mention an issue, include property link and task link when available.
- If you mention submitted or pending checklist or supplies runs, connect them to task and property.
- If the request is about system usage, provide steps and where to go.
- If the request is about risk or pending items, clearly explain why.
- Stay read-only.
- Reply in English.

Operational context:
${JSON.stringify(context, null, 2)}
`.trim()
  }

  return `
Ιστορικό πρόσφατης συνομιλίας:
${JSON.stringify(compactHistory, null, 2)}

Νέα ερώτηση χρήστη:
${question}

Υπενθυμίσεις συμπεριφοράς:
- Αν αναφέρεις εργασία, δώσε σύνδεσμο εργασίας και σύνδεσμο ακινήτου όταν υπάρχουν.
- Αν αναφέρεις κράτηση, δώσε σύνδεσμο κράτησης και σύνδεσμο ακινήτου όταν υπάρχουν.
- Αν αναφέρεις ζήτημα, ζημιά ή βλάβη, δώσε σύνδεσμο ακινήτου και σύνδεσμο εργασίας όταν υπάρχουν.
- Αν αναφέρεις υποβληθείσες ή εκκρεμείς λίστες ή λίστες αναλωσίμων, σύνδεσέ τες με εργασία και ακίνητο.
- Αν η ερώτηση είναι για χρήση του συστήματος, δώσε καθαρά βήματα και πού πρέπει να πάει ο χρήστης.
- Αν η ερώτηση είναι για κίνδυνο ή εκκρεμότητα, εξήγησε καθαρά γιατί θεωρείται κίνδυνος ή εκκρεμότητα.
- Να παραμένεις μόνο για ανάγνωση.
- Να απαντάς στα ελληνικά.

Operational context:
${JSON.stringify(context, null, 2)}
`.trim()
}

async function callOpenAI(params: {
  apiKey: string
  systemPrompt: string
  userPrompt: string
  language: AssistantUiLanguage
}) {
  const { apiKey, systemPrompt, userPrompt, language } = params
  const texts = getRouteTexts(language)

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI error ${response.status}: ${errorText}`)
  }

  const json = await response.json()

  return json?.choices?.[0]?.message?.content?.trim() || texts.openAiNoAnswer
}

export async function POST(req: NextRequest) {
  const fallbackLanguage = normalizeLanguage(
    req.headers.get("x-ui-language") || null
  )

  try {
    const body = (await req.json()) as RequestBody
    const language = normalizeLanguage(body.language || fallbackLanguage)
    const texts = getRouteTexts(language)
    const question = body.question?.trim()

    if (!question) {
      return NextResponse.json(
        { error: texts.requiredQuestion },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: texts.missingApiKey },
        { status: 500 }
      )
    }

    const auth = getMockAuthFromRequest(req)

    const context = await buildAssistantContext({
      auth,
      question,
      scope: body.scope,
    })

    const usageGuide = buildOpsUsageGuide(language)

    const systemPrompt = buildAssistantSystemPrompt({
      context,
      usageGuide,
      questionMode: context.questionMode,
      language,
    })

    const userPrompt = buildUserPrompt({
      question,
      language,
      context,
      history: body.history,
    })

    const answer = await callOpenAI({
      apiKey,
      systemPrompt,
      userPrompt,
      language,
    })

    return NextResponse.json({
      answer,
      contextMeta: {
        questionMode: context.questionMode,
        language,
        hasScopedProperty: Boolean(context.scoped.scopedProperty),
        hasScopedTask: Boolean(context.scoped.scopedTask),
        hasScopedBooking: Boolean(context.scoped.scopedBooking),
      },
    })
  } catch (error) {
    console.error("AI assistant route error:", error)

    const texts = getRouteTexts(fallbackLanguage)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : texts.unknownRouteError,
      },
      { status: 500 }
    )
  }
}