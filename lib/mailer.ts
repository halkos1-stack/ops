import nodemailer from "nodemailer"

type SendMailArgs = {
  to: string
  subject: string
  html: string
  text?: string
}

function getTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendMailSafe(args: SendMailArgs) {
  try {
    const transport = getTransport()

    if (!transport) {
      console.log("SMTP not configured. Email not sent.")
      console.log("TO:", args.to)
      console.log("SUBJECT:", args.subject)
      console.log("TEXT:", args.text || "")
      console.log("HTML:", args.html)

      return {
        sent: false,
        reason: "SMTP_NOT_CONFIGURED",
      }
    }

    const from = process.env.SMTP_FROM || "OPS SaaS <no-reply@example.com>"

    await transport.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    })

    return {
      sent: true,
    }
  } catch (error) {
    console.error("sendMailSafe error:", error)

    return {
      sent: false,
      reason: "SEND_FAILED",
    }
  }
}