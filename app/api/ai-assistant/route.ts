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
- If you mention submitted or pending checklist/supplies runs, connect them to task and property.
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
- Αν αναφέρεις εργασία, δώσε λινκ εργασίας και λινκ ακινήτου όταν υπάρχουν.
- Αν αναφέρεις κράτηση, δώσε λινκ κράτησης και λινκ ακινήτου όταν υπάρχουν.
- Αν αναφέρεις ζημιά/βλάβη, δώσε λινκ ακινήτου και λινκ εργασίας όταν υπάρχουν.
- Αν αναφέρεις υποβληθείσες ή εκκρεμείς λίστες, σύνδεσέ τες με εργασία και ακίνητο.
- Αν η ερώτηση είναι για χρήση του συστήματος, δώσε βήματα και πού να πάει ο χρήστης.
- Αν η ερώτηση είναι για κίνδυνο ή εκκρεμότητα, πες καθαρά γιατί θεωρείται κίνδυνος.
- Να παραμένεις read-only.
- Να απαντάς στα ελληνικά.

Operational context:
${JSON.stringify(context, null, 2)}
`.trim()
}

async function callOpenAI(params: {
  apiKey: string
  systemPrompt: string
  userPrompt: string
}) {
  const { apiKey, systemPrompt, userPrompt } = params

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
  return (
    json?.choices?.[0]?.message?.content?.trim() ||
    "Δεν μπόρεσα να δημιουργήσω απάντηση αυτή τη στιγμή."
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const question = body.question?.trim()

    if (!question) {
      return NextResponse.json(
        { error: "Η ερώτηση είναι υποχρεωτική." },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Δεν υπάρχει OPENAI_API_KEY στο περιβάλλον του server.",
        },
        { status: 500 }
      )
    }

    const language = normalizeLanguage(body.language)
    const auth = getMockAuthFromRequest(req)

    const context = await buildAssistantContext({
      auth,
      question,
      scope: body.scope,
    })

    const usageGuide = buildOpsUsageGuide()

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

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Άγνωστο σφάλμα AI βοηθού.",
      },
      { status: 500 }
    )
  }
}