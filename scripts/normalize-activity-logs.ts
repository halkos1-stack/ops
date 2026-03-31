import { prisma } from "@/lib/prisma"

function normalizeSystemTaskTitleForLog(rawTitle: unknown) {
  const title = String(rawTitle ?? "").trim()
  if (!title) return "Task"

  let match = title.match(/^Καθαρισμός μετά από check-out\s*-\s*(.+)$/i)
  if (match?.[1]) return `Cleaning after check-out - ${match[1]}`

  match = title.match(/^Cleaning after check-out\s*-\s*(.+)$/i)
  if (match?.[1]) return `Cleaning after check-out - ${match[1]}`

  match = title.match(/^Επιθεώρηση πριν από check-in\s*-\s*(.+)$/i)
  if (match?.[1]) return `Inspection before check-in - ${match[1]}`

  match = title.match(/^Inspection before check-in\s*-\s*(.+)$/i)
  if (match?.[1]) return `Inspection before check-in - ${match[1]}`

  match = title.match(/^Αναπλήρωση αναλωσίμων\s*-\s*(.+)$/i)
  if (match?.[1]) return `Supplies refill - ${match[1]}`

  match = title.match(/^Supplies refill\s*-\s*(.+)$/i)
  if (match?.[1]) return `Supplies refill - ${match[1]}`

  return title
}

function buildTaskAssignedMessage(partnerName: string, taskTitle: string) {
  return `Task "${taskTitle}" was assigned to partner ${partnerName}.`
}

function buildAssignmentAcceptedMessage(partnerName: string, taskTitle: string) {
  return `Partner ${partnerName} accepted task "${taskTitle}" from the portal.`
}

function buildAssignmentRejectedMessage(partnerName: string, taskTitle: string) {
  return `Partner ${partnerName} rejected task "${taskTitle}" from the portal.`
}

function buildCleaningSubmittedMessage(partnerName: string) {
  return `Partner ${partnerName} submitted the cleaning list from the portal.`
}

function buildSuppliesSubmittedMessage(partnerName: string) {
  return `Partner ${partnerName} submitted the supplies from the portal.`
}

function buildPhotoUploadedMessage(partnerName: string, itemLabel: string) {
  return `Partner ${partnerName} uploaded a photo for item "${itemLabel}".`
}

function buildCreatedFromBookingMessage(bookingCode: string) {
  return `Task was created from booking ${bookingCode}.`
}

function buildSupersededAssignmentMessage() {
  return "Previous pending assignment was replaced by a newer assignment before acceptance."
}

function normalizeQuotedText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
}

function normalizeActivityMessage(rawMessage: string) {
  let message = normalizeQuotedText(rawMessage)
  if (!message) return message

  let match =
    message.match(/^Partner\s+(.+?)\s+submitted the supplies from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τα αναλώσιμα από το portal\.?$/i)
  if (match?.[1]) {
    return buildSuppliesSubmittedMessage(match[1].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+submitted the cleaning list from the portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+submitted the checklist from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη λίστα καθαριότητας από το portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη λίστα από το portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+υπέβαλε τη checklist από το portal\.?$/i)
  if (match?.[1]) {
    return buildCleaningSubmittedMessage(match[1].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+uploaded a photo for item\s+"(.+)"\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+ανέβασε φωτογραφία για το στοιχείο\s+"(.+)"\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildPhotoUploadedMessage(match[1].trim(), match[2].trim())
  }

  match =
    message.match(/^Partner\s+(.+?)\s+accepted task\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+αποδέχτηκε την εργασία\s+"(.+)"\s+από το portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+αποδέχθηκε την εργασία\s+"(.+)"\s+από το portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+αποδέχτηκε την εργασία\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+αποδέχθηκε την εργασία\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+accepted task\s+"(.+)"\s+από το portal\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildAssignmentAcceptedMessage(
      match[1].trim(),
      normalizeSystemTaskTitleForLog(match[2].trim())
    )
  }

  match =
    message.match(/^Partner\s+(.+?)\s+rejected task\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+απέρριψε την εργασία\s+"(.+)"\s+από το portal\.?$/i) ||
    message.match(/^Partner\s+(.+?)\s+απέρριψε την εργασία\s+"(.+)"\s+from the portal\.?$/i) ||
    message.match(/^Ο συνεργάτης\s+(.+?)\s+rejected task\s+"(.+)"\s+από το portal\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildAssignmentRejectedMessage(
      match[1].trim(),
      normalizeSystemTaskTitleForLog(match[2].trim())
    )
  }

  match =
    message.match(/^Task\s+"(.+)"\s+was assigned to partner\s+(.+)\.?$/i) ||
    message.match(/^Η εργασία\s+"(.+)"\s+ανατέθηκε στον συνεργάτη\s+(.+)\.?$/i)
  if (match?.[1] && match?.[2]) {
    return buildTaskAssignedMessage(
      match[2].trim(),
      normalizeSystemTaskTitleForLog(match[1].trim())
    )
  }

  match =
    message.match(/^Task was created from booking\s+(.+)\.?$/i) ||
    message.match(/^Δημιουργήθηκε εργασία από την κράτηση\s+(.+)\.?$/i)
  if (match?.[1]) {
    return buildCreatedFromBookingMessage(match[1].trim())
  }

  match = message.match(
    /^Προηγούμενη εκκρεμής ανάθεση αντικαταστάθηκε από νεότερη ανάθεση πριν από αποδοχή\.?$/i
  )
  if (match) {
    return buildSupersededAssignmentMessage()
  }

  match = message.match(
    /^Previous pending assignment was replaced by a newer assignment before acceptance\.?$/i
  )
  if (match) {
    return buildSupersededAssignmentMessage()
  }

  return message
}

async function main() {
  const logs = await prisma.activityLog.findMany({
    where: {
      entityType: "TASK_ASSIGNMENT",
    },
    select: {
      id: true,
      message: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  console.log(`Βρέθηκαν ${logs.length} logs για έλεγχο.`)

  let changed = 0

  for (const log of logs) {
    const oldMessage = String(log.message ?? "").trim()
    if (!oldMessage) continue

    const newMessage = normalizeActivityMessage(oldMessage)

    if (newMessage && newMessage !== oldMessage) {
      await prisma.activityLog.update({
        where: { id: log.id },
        data: {
          message: newMessage,
          metadata: {
            normalizedByScript: true,
            normalizedAt: new Date().toISOString(),
            canonicalMessageFormat: "normalized-activity-log-v1",
          },
        },
      })

      changed += 1
      console.log(`Διορθώθηκε log ${log.id}`)
      console.log(`OLD: ${oldMessage}`)
      console.log(`NEW: ${newMessage}`)
      console.log("-----")
    }
  }

  console.log(`Ολοκληρώθηκε. Διορθώθηκαν ${changed} logs.`)
}

main()
  .catch((error) => {
    console.error("Σφάλμα normalize-activity-logs:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })