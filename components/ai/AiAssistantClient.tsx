"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAppLanguage } from "@/components/i18n/LanguageProvider"

type ScopeInput = {
  propertyId?: string | null
  taskId?: string | null
  bookingId?: string | null
}

type AssistantUiLanguage = "el" | "en"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

type Props = {
  scope?: ScopeInput
}

const STORAGE_KEY_EL = "ops_ai_assistant_chat_v2_el"
const STORAGE_KEY_EN = "ops_ai_assistant_chat_v2_en"

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").trim()
}

function getStorageKey(language: AssistantUiLanguage) {
  return language === "en" ? STORAGE_KEY_EN : STORAGE_KEY_EL
}

function getAiAssistantTexts(language: AssistantUiLanguage) {
  if (language === "en") {
    return {
      title: "OPS AI Assistant",
      subtitle:
        "Read-only assistant for system data, navigation, usage guidance, daily briefing and risk review.",
      dashboard: "Dashboard",
      chatTitle: "Conversation",
      promptsTitle: "Quick questions",
      emptyState:
        "Ask about tasks, bookings, properties, issues, supplies, checklist runs, alerts, pending items, risks or how to use OPS.",
      placeholder:
        "Ask about OPS data, usage guidance, pending items, risks or navigation...",
      readonly:
        "The assistant is read-only. It does not change OPS data.",
      send: "Send",
      clear: "Clear conversation",
      thinking: "Thinking…",
      you: "You",
      assistant: "AI Assistant",
      errorFallback: "AI assistant request failed.",
      promptGroups: [
        {
          title: "Daily operations",
          items: [
            "Give me a daily briefing.",
            "What needs attention today?",
            "Show me today's check-outs.",
            "Show me the active alerts.",
          ],
        },
        {
          title: "Tasks and bookings",
          items: [
            "Which tasks are open?",
            "Which bookings do not have a task?",
            "Show me the submitted checklist runs.",
            "Show me the pending checklist runs.",
          ],
        },
        {
          title: "Issues and supplies",
          items: [
            "Show me open issues.",
            "Show me low supplies.",
            "Why is this task considered risky?",
            "Show me the most important pending items.",
          ],
        },
        {
          title: "How to use OPS",
          items: [
            "How do I create a task from a booking?",
            "How does task assignment work?",
            "How do cleaning checklist and supplies checklist work?",
            "What does alert mean in OPS?",
          ],
        },
      ],
    }
  }

  return {
    title: "AI Βοηθός OPS",
    subtitle:
      "Read-only βοηθός δεδομένων, πλοήγησης, οδηγιών χρήσης, σύνοψης ημέρας και ελέγχου κινδύνων.",
    dashboard: "Πίνακας ελέγχου",
    chatTitle: "Συνομιλία",
    promptsTitle: "Έτοιμες ερωτήσεις",
    emptyState:
      "Ρώτησέ με για εργασίες, κρατήσεις, ακίνητα, ζημιές / βλάβες, αναλώσιμα, λίστες, alert, εκκρεμότητες, κινδύνους ή για τη χρήση του OPS.",
    placeholder:
      "Ρώτησε για δεδομένα του OPS, οδηγίες χρήσης, εκκρεμότητες, κινδύνους ή πλοήγηση...",
    readonly: "Ο βοηθός είναι read-only. Δεν αλλάζει δεδομένα του OPS.",
    send: "Αποστολή",
    clear: "Καθαρισμός συνομιλίας",
    thinking: "Σκέφτομαι…",
    you: "Εσύ",
    assistant: "AI Βοηθός",
    errorFallback: "Αποτυχία απάντησης AI βοηθού.",
    promptGroups: [
      {
        title: "Ημέρα",
        items: [
          "Δώσε μου σύνοψη ημέρας.",
          "Τι χρειάζεται προσοχή σήμερα;",
          "Δείξε μου τα σημερινά check-out.",
          "Δείξε μου τα ενεργά alert.",
        ],
      },
      {
        title: "Εργασίες και κρατήσεις",
        items: [
          "Ποιες εργασίες είναι ανοικτές;",
          "Ποιες κρατήσεις δεν έχουν εργασία;",
          "Δείξε μου τις υποβληθείσες λίστες.",
          "Δείξε μου τις εκκρεμείς λίστες.",
        ],
      },
      {
        title: "Ζημιές και αναλώσιμα",
        items: [
          "Δείξε μου ανοιχτές ζημιές / βλάβες.",
          "Δείξε μου χαμηλά αναλώσιμα.",
          "Γιατί αυτή η εργασία θεωρείται σε κίνδυνο;",
          "Δείξε μου τις πιο σημαντικές εκκρεμότητες.",
        ],
      },
      {
        title: "Χρήση του OPS",
        items: [
          "Πώς δημιουργώ εργασία από κράτηση;",
          "Πώς λειτουργεί η ανάθεση σε συνεργάτη;",
          "Πώς λειτουργεί η λίστα καθαριότητας και η λίστα αναλωσίμων;",
          "Τι σημαίνει alert στο OPS;",
        ],
      },
    ],
  }
}

function InlineMarkdown({
  text,
  isUser,
}: {
  text: string
  isUser: boolean
}) {
  const parts: Array<React.ReactNode> = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const [full, label, href] = match
    const start = match.index

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    const className = isUser
      ? "font-medium underline underline-offset-2 text-white"
      : "font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"

    if (href.startsWith("/")) {
      parts.push(
        <Link
          key={`${label}-${href}-${start}`}
          href={href}
          className={className}
        >
          {label}
        </Link>
      )
    } else {
      parts.push(
        <a
          key={`${label}-${href}-${start}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          {label}
        </a>
      )
    }

    lastIndex = start + full.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

function renderMessageContent(content: string, isUser: boolean) {
  const lines = content.split("\n")

  return lines.map((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      return <div key={`br-${index}`} className="h-3" />
    }

    if (/^[-*]\s+/.test(trimmed)) {
      return (
        <li
          key={`li-${index}`}
          className={`ml-5 list-disc text-sm leading-6 ${
            isUser ? "text-white" : "text-slate-700"
          }`}
        >
          <InlineMarkdown text={trimmed.replace(/^[-*]\s+/, "")} isUser={isUser} />
        </li>
      )
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      return (
        <li
          key={`ol-${index}`}
          className={`ml-5 list-decimal text-sm leading-6 ${
            isUser ? "text-white" : "text-slate-700"
          }`}
        >
          <InlineMarkdown text={trimmed.replace(/^\d+\.\s+/, "")} isUser={isUser} />
        </li>
      )
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      return (
        <h3
          key={`h-${index}`}
          className={`text-sm font-semibold ${
            isUser ? "text-white" : "text-slate-900"
          }`}
        >
          <InlineMarkdown text={trimmed.replace(/^#{1,6}\s+/, "")} isUser={isUser} />
        </h3>
      )
    }

    return (
      <p
        key={`p-${index}`}
        className={`text-sm leading-6 ${
          isUser ? "text-white" : "text-slate-700"
        }`}
      >
        <InlineMarkdown text={trimmed} isUser={isUser} />
      </p>
    )
  })
}

export default function AiAssistantClient({ scope }: Props) {
  const { language } = useAppLanguage()
  const uiLanguage: AssistantUiLanguage = language === "en" ? "en" : "el"
  const t = getAiAssistantTexts(uiLanguage)

  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(getStorageKey(uiLanguage))
      if (!raw) {
        setMessages([])
        return
      }

      const parsed = JSON.parse(raw) as Message[]
      if (Array.isArray(parsed)) {
        setMessages(parsed)
      } else {
        setMessages([])
      }
    } catch {
      setMessages([])
    }
  }, [uiLanguage])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        getStorageKey(uiLanguage),
        JSON.stringify(messages)
      )
    } catch {
      // ignore storage errors
    }
  }, [messages, uiLanguage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const canSubmit = useMemo(() => {
    return question.trim().length > 0 && !isLoading
  }, [question, isLoading])

  async function askAssistant(input: string) {
    const cleanQuestion = normalizeText(input)
    if (!cleanQuestion || isLoading) return

    setError(null)

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: cleanQuestion,
      createdAt: new Date().toISOString(),
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setQuestion("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanQuestion,
          language: uiLanguage,
          scope,
          history: nextMessages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        throw new Error(json?.error || t.errorFallback)
      }

      const assistantMessage: Message = {
        id: createId(),
        role: "assistant",
        content:
          typeof json?.answer === "string" && json.answer.trim()
            ? json.answer.trim()
            : t.errorFallback,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorFallback)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    void askAssistant(question)
  }

  function handlePromptClick(prompt: string) {
    void askAssistant(prompt)
  }

  function handleClearChat() {
    setMessages([])
    setQuestion("")
    setError(null)

    try {
      window.localStorage.removeItem(getStorageKey(uiLanguage))
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
            <p className="text-sm text-slate-600">{t.subtitle}</p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.dashboard}
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 xl:border-r xl:border-slate-100">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t.chatTitle}
              </h2>
            </div>

            <div className="max-h-[62vh] overflow-y-auto px-4 py-4 md:px-5">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm leading-6 text-slate-600">
                    {t.emptyState}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isUser = message.role === "user"

                    return (
                      <div
                        key={message.id}
                        className={
                          isUser
                            ? "ml-auto max-w-[94%] rounded-2xl bg-slate-900 px-4 py-3 text-white md:max-w-[82%]"
                            : "mr-auto max-w-[94%] rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 md:max-w-[82%]"
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span
                            className={
                              isUser
                                ? "text-xs font-semibold uppercase tracking-wide text-slate-300"
                                : "text-xs font-semibold uppercase tracking-wide text-slate-500"
                            }
                          >
                            {isUser ? t.you : t.assistant}
                          </span>

                          <span
                            className={
                              isUser
                                ? "text-[11px] text-slate-300"
                                : "text-[11px] text-slate-500"
                            }
                          >
                            {new Date(message.createdAt).toLocaleString(
                              uiLanguage === "en" ? "en-GB" : "el-GR",
                              {
                                dateStyle: "short",
                                timeStyle: "short",
                              }
                            )}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {renderMessageContent(message.content, isUser)}
                        </div>
                      </div>
                    )
                  })}

                  {isLoading ? (
                    <div className="mr-auto max-w-[94%] rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 md:max-w-[82%]">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t.assistant}
                      </div>
                      <p className="text-sm text-slate-600">{t.thinking}</p>
                    </div>
                  ) : null}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4 md:p-5">
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  placeholder={t.placeholder}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">{t.readonly}</p>
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      {t.clear}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.send}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <aside className="border-t border-slate-100 bg-slate-50/60 xl:border-t-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {t.promptsTitle}
              </h2>
            </div>

            <div className="space-y-4 p-4 md:p-5">
              {t.promptGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.title}
                  </h3>

                  <div className="space-y-2">
                    {group.items.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handlePromptClick(prompt)}
                        className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}