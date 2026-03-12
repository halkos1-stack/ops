import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sendMailSafe } from "@/lib/mailer"

const ACTIVATION_TOKEN_HOURS = 48

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}

export async function createActivationTokenForUser(userId: string) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(
    Date.now() + ACTIVATION_TOKEN_HOURS * 60 * 60 * 1000
  )

  const created = await prisma.userActivationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
    select: {
      id: true,
      userId: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      usedAt: true,
    },
  })

  const verify = await prisma.userActivationToken.findUnique({
    where: {
      token: created.token,
    },
    select: {
      id: true,
      userId: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      usedAt: true,
    },
  })

  if (!verify) {
    throw new Error(
      "Αποτυχία επιβεβαίωσης αποθήκευσης activation token στη βάση."
    )
  }

  console.log("Activation token created successfully:", {
    id: verify.id,
    userId: verify.userId,
    token: verify.token,
    expiresAt: verify.expiresAt,
    createdAt: verify.createdAt,
    usedAt: verify.usedAt,
  })

  return {
    id: verify.id,
    token: verify.token,
    expiresAt: verify.expiresAt,
    activationUrl: `${getBaseUrl()}/activate/${verify.token}`,
  }
}

export async function invalidateUnusedActivationTokens(userId: string) {
  const result = await prisma.userActivationToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  })

  console.log("Activation tokens invalidated:", {
    userId,
    count: result.count,
  })

  return result
}

export async function createFreshActivationTokenForUser(userId: string) {
  await invalidateUnusedActivationTokens(userId)

  const created = await createActivationTokenForUser(userId)

  const activeTokens = await prisma.userActivationToken.findMany({
    where: {
      userId,
      usedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  console.log("Active activation tokens after create:", {
    userId,
    count: activeTokens.length,
    tokens: activeTokens.map((item) => ({
      id: item.id,
      token: item.token,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
    })),
  })

  return created
}

export async function sendOrganizationUserActivationEmail(args: {
  to: string
  userName: string | null
  organizationName: string
  activationUrl: string
  roleLabel: string
}) {
  const displayName = args.userName?.trim() || "συνεργάτη"
  const subject = `Πρόσκληση ενεργοποίησης λογαριασμού – ${args.organizationName}`

  const text = [
    `Γεια σου ${displayName},`,
    ``,
    `Έχει δημιουργηθεί λογαριασμός για εσένα στο OPS SaaS.`,
    `Οργανισμός: ${args.organizationName}`,
    `Ρόλος: ${args.roleLabel}`,
    ``,
    `Για να ενεργοποιήσεις τον λογαριασμό σου και να ορίσεις τον προσωπικό σου κωδικό, άνοιξε το παρακάτω link:`,
    `${args.activationUrl}`,
    ``,
    `Το link ισχύει για ${ACTIVATION_TOKEN_HOURS} ώρες.`,
  ].join("\n")

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin-bottom:8px;">Πρόσκληση ενεργοποίησης λογαριασμού</h2>
      <p>Γεια σου <strong>${displayName}</strong>,</p>
      <p>Έχει δημιουργηθεί λογαριασμός για εσένα στο <strong>OPS SaaS</strong>.</p>
      <p>
        <strong>Οργανισμός:</strong> ${args.organizationName}<br />
        <strong>Ρόλος:</strong> ${args.roleLabel}
      </p>
      <p>Πάτησε στο παρακάτω κουμπί για να ενεργοποιήσεις τον λογαριασμό σου και να ορίσεις τον προσωπικό σου κωδικό:</p>
      <p style="margin:24px 0;">
        <a
          href="${args.activationUrl}"
          style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;"
        >
          Ενεργοποίηση λογαριασμού
        </a>
      </p>
      <p>Αν το κουμπί δεν λειτουργεί, αντέγραψε αυτό το link στον browser σου:</p>
      <p style="word-break:break-all;">${args.activationUrl}</p>
      <p>Το link ισχύει για ${ACTIVATION_TOKEN_HOURS} ώρες.</p>
    </div>
  `

  return sendMailSafe({
    to: args.to,
    subject,
    html,
    text,
  })
}

export function getOrganizationRoleLabel(
  role: "ORG_ADMIN" | "MANAGER" | "PARTNER"
) {
  switch (role) {
    case "ORG_ADMIN":
      return "Διαχειριστής οργανισμού"
    case "MANAGER":
      return "Manager"
    case "PARTNER":
      return "Συνεργάτης"
    default:
      return role
  }
}