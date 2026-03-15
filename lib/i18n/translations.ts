import { AppLanguage } from "@/components/i18n/LanguageProvider"

type RoleInput = {
  systemRole: "SUPER_ADMIN" | "USER"
  organizationRole: "ORG_ADMIN" | "MANAGER" | "PARTNER" | null
}

export function getRoleLabel(
  language: AppLanguage,
  role: RoleInput
): string {
  if (language === "en") {
    if (role.systemRole === "SUPER_ADMIN") return "SUPER ADMIN"
    if (role.organizationRole === "ORG_ADMIN") return "ORGANIZATION ADMIN"
    if (role.organizationRole === "MANAGER") return "MANAGER"
    if (role.organizationRole === "PARTNER") return "PARTNER"
    return "USER"
  }

  if (role.systemRole === "SUPER_ADMIN") return "SUPER ADMIN"
  if (role.organizationRole === "ORG_ADMIN") return "ΔΙΑΧΕΙΡΙΣΤΗΣ ΟΡΓΑΝΙΣΜΟΥ"
  if (role.organizationRole === "MANAGER") return "MANAGER"
  if (role.organizationRole === "PARTNER") return "ΣΥΝΕΡΓΑΤΗΣ"
  return "ΧΡΗΣΤΗΣ"
}

export function getDashboardShellTexts(language: AppLanguage) {
  if (language === "en") {
    return {
      brand: "OPS SAAS",
      title: "Control panel",
      superAdminDescription: "Access to the central OPS platform area.",
      organizationDescription:
        "Central operational view for organization, properties, tasks and partners.",
      organizationLabel: "Organization",
      superAdminBannerPrefix: "You are currently inside the central OPS as",
      superAdminBannerRole: "SUPER ADMIN",
      superAdminBannerSuffix: ". You can return at any time to",
      superAdminBannerManagement: "organization management",
      dashboardHrefLabel: "Go to dashboard",
    }
  }

  return {
    brand: "OPS SAAS",
    title: "Πίνακας ελέγχου",
    superAdminDescription: "Πρόσβαση στο κεντρικό OPS από περιοχή πλατφόρμας.",
    organizationDescription:
      "Κεντρική προβολή λειτουργίας οργανισμού, ακινήτων, εργασιών και συνεργατών.",
    organizationLabel: "Οργανισμός",
    superAdminBannerPrefix: "Βρίσκεσαι στο κεντρικό OPS ως",
    superAdminBannerRole: "SUPER ADMIN",
    superAdminBannerSuffix: ". Μπορείς να επιστρέψεις οποιαδήποτε στιγμή στη",
    superAdminBannerManagement: "διαχείριση οργανισμών",
    dashboardHrefLabel: "Μετάβαση στον πίνακα ελέγχου",
  }
}