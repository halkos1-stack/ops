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

export function getBookingsModuleTexts(language: AppLanguage) {
  if (language === "en") {
    return {
      common: {
        loading: "Loading...",
        notFound: "No records found.",
        view: "View",
        close: "Close",
        cancel: "Cancel",
        save: "Save",
        searchPlaceholder: "Search bookings...",
        backToBookings: "Back to bookings",
        viewTask: "View task",
        viewProperty: "View property",
        createTask: "Create task",
        creating: "Creating...",
        internalNotes: "Internal notes",
        noValue: "-",
      },
      labels: {
        bookingCode: "Booking code",
        property: "Property",
        guest: "Guest",
        source: "Source",
        bookingStatus: "Booking status",
        opsStatus: "OPS status",
        checkIn: "Check-in",
        checkOut: "Check-out",
        phone: "Phone",
        email: "Email",
        listingId: "Listing ID",
        mapping: "Mapping",
        dateRange: "Stay",
        alerts: "Alert",
      },
      statuses: {
        cancelled: "Cancelled",
        needsMapping: "Needs mapping",
        readyForAction: "Ready for action",
        error: "Error",
        pendingMatch: "Pending match",
        completed: "Completed",
        mapped: "Mapped",
        pending: "Pending",
        noTask: "No task",
      },
      list: {
        title: "Bookings",
        description:
          "Incoming bookings from platforms, with full visibility and controlled task creation.",
        historyButton: "Booking history",
        listTitle: "Bookings list",
        listDescription:
          "Tasks linked to booking and property are created from here.",
        all: "All",
        active: "Active",
        withoutTasks: "Without task",
        withTasks: "With task",
        needsMapping: "Need mapping",
        cancelled: "Cancelled",
        todayCheckout: "Today check-outs",
        next3Days: "Next 3 days",
        linkedTasks: "Linked tasks",
        noBookings: "No bookings found.",
        taskCreatedSuccess: "Task was created successfully.",
        createTaskError: "Failed to create task.",
        loadError: "Failed to load bookings.",
        propertyNotMapped: "Not mapped yet",
        stayLineSeparator: " | ",
      },
      modal: {
        title: "New task from booking",
        taskType: "Task type",
        priority: "Priority",
        titleLabel: "Title",
        descriptionLabel: "Description",
        scheduledDate: "Task date",
        dueDate: "Due date",
        scheduledStartTime: "Start time",
        scheduledEndTime: "End time",
        alertTitle: "Notification / alert",
        alertDescription:
          "The manager can define an exact alert time for the task.",
        alertEnabled: "Enabled",
        alertAt: "Alert time",
        checklistsTitle: "Task checklists",
        sendCleaningChecklist: "Send cleaning checklist",
        sendSuppliesChecklist: "Send supplies checklist",
        titlePlaceholder: "If empty, a suggested title will be used",
        descriptionPlaceholder: "Optional description",
        notesPlaceholder: "Internal notes for the task",
        taskTypes: {
          cleaning: "Cleaning",
          inspection: "Inspection",
          maintenance: "Maintenance task",
          custom: "Other task",
        },
        priorities: {
          low: "Low",
          normal: "Normal",
          high: "High",
          urgent: "Urgent",
        },
      },
      history: {
        title: "Booking history",
        description:
          "Full visibility of booking status, property linkage and linked tasks.",
        active: "Active",
        all: "All",
        cancelled: "Cancelled",
        clearDay: "Clear selected day",
        detailsTitle: "Detailed list",
        allBookings: "All bookings",
        filteredDayPrefix: "Filtered day",
        arrivals: "Arrivals",
        departures: "Departures",
        bookings: "Bookings",
        noHistory: "No bookings found.",
        loadError: "Failed to load booking history.",
        taskPrefix: "Task",
      },
      detail: {
        breadcrumb: "Bookings",
        titleFallback: "Booking",
        detailsCard: "Booking details",
        propertyCard: "Property",
        linkedTasksCard: "Linked tasks",
        syncHistoryCard: "Sync history",
        createTaskCard: "New task from booking",
        noTasks: "There are no tasks from this booking yet.",
        noHistory: "There is no history yet.",
        noProperty: "This booking has not been matched with a property yet.",
        mappingPending:
          "The mapping with a property must be completed first.",
        cancelledNoTask:
          "This booking is cancelled and cannot create a task.",
        taskCreateError: "Failed to create task.",
        taskCreateSuccess: "Task was created successfully.",
        loadError: "Failed to load booking.",
        notFound: "Booking was not found.",
        bookingInfoLine: "Source",
        completedMapping: "Completed",
        pendingMapping: "Pending",
        assignmentPrefix: "Assignment",
      },
    }
  }

  return {
    common: {
      loading: "Φόρτωση...",
      notFound: "Δεν βρέθηκαν εγγραφές.",
      view: "Προβολή",
      close: "Κλείσιμο",
      cancel: "Ακύρωση",
      save: "Αποθήκευση",
      searchPlaceholder: "Αναζήτηση κρατήσεων...",
      backToBookings: "Επιστροφή στις κρατήσεις",
      viewTask: "Προβολή εργασίας",
      viewProperty: "Προβολή ακινήτου",
      createTask: "Δημιουργία εργασίας",
      creating: "Δημιουργία...",
      internalNotes: "Σημειώσεις",
      noValue: "-",
    },
    labels: {
      bookingCode: "Κωδικός κράτησης",
      property: "Ακίνητο",
      guest: "Επισκέπτης",
      source: "Πηγή",
      bookingStatus: "Κατάσταση κράτησης",
      opsStatus: "Κατάσταση OPS",
      checkIn: "Check-in",
      checkOut: "Check-out",
      phone: "Τηλέφωνο",
      email: "Email",
      listingId: "Listing ID",
      mapping: "Αντιστοίχιση",
      dateRange: "Διαμονή",
      alerts: "Ειδοποίηση",
    },
    statuses: {
      cancelled: "Ακυρωμένη",
      needsMapping: "Χρειάζεται αντιστοίχιση",
      readyForAction: "Έτοιμη για ενέργεια",
      error: "Σφάλμα",
      pendingMatch: "Αναμονή αντιστοίχισης",
      completed: "Ολοκληρωμένη",
      mapped: "Ολοκληρωμένη",
      pending: "Εκκρεμεί",
      noTask: "Χωρίς εργασία",
    },
    list: {
      title: "Κρατήσεις",
      description:
        "Εισερχόμενες κρατήσεις από πλατφόρμες, με πλήρη εικόνα και ελεγχόμενη δημιουργία εργασιών.",
      historyButton: "Ιστορικό κρατήσεων",
      listTitle: "Λίστα κρατήσεων",
      listDescription:
        "Από εδώ δημιουργείται εργασία συνδεδεμένη με την κράτηση και το ακίνητο.",
      all: "Όλες",
      active: "Ενεργές",
      withoutTasks: "Χωρίς εργασία",
      withTasks: "Με εργασία",
      needsMapping: "Χρειάζονται αντιστοίχιση",
      cancelled: "Ακυρωμένες",
      todayCheckout: "Σημερινά check-out",
      next3Days: "Επόμενες 3 ημέρες",
      linkedTasks: "Συνδεδεμένες εργασίες",
      noBookings: "Δεν βρέθηκαν κρατήσεις.",
      taskCreatedSuccess: "Η εργασία δημιουργήθηκε επιτυχώς.",
      createTaskError: "Αποτυχία δημιουργίας εργασίας.",
      loadError: "Αποτυχία φόρτωσης κρατήσεων.",
      propertyNotMapped: "Δεν έχει αντιστοιχιστεί",
      stayLineSeparator: " | ",
    },
    modal: {
      title: "Νέα εργασία από κράτηση",
      taskType: "Τύπος εργασίας",
      priority: "Προτεραιότητα",
      titleLabel: "Τίτλος",
      descriptionLabel: "Περιγραφή",
      scheduledDate: "Ημερομηνία εργασίας",
      dueDate: "Προθεσμία",
      scheduledStartTime: "Ώρα έναρξης",
      scheduledEndTime: "Ώρα λήξης",
      alertTitle: "Ειδοποίηση / alert",
      alertDescription:
        "Ο διαχειριστής μπορεί να ορίσει ακριβή ώρα ειδοποίησης για την εργασία.",
      alertEnabled: "Ενεργό",
      alertAt: "Ώρα alert",
      checklistsTitle: "Λίστες εργασίας",
      sendCleaningChecklist: "Αποστολή λίστας καθαριότητας",
      sendSuppliesChecklist: "Αποστολή λίστας αναλωσίμων",
      titlePlaceholder: "Αν μείνει κενό, θα μπει προτεινόμενος τίτλος",
      descriptionPlaceholder: "Προαιρετική περιγραφή",
      notesPlaceholder: "Εσωτερικές σημειώσεις για την εργασία",
      taskTypes: {
        cleaning: "Καθαρισμός",
        inspection: "Επιθεώρηση",
        maintenance: "Τεχνική εργασία",
        custom: "Άλλη εργασία",
      },
      priorities: {
        low: "Χαμηλή",
        normal: "Κανονική",
        high: "Υψηλή",
        urgent: "Επείγουσα",
      },
    },
    history: {
      title: "Ιστορικό κρατήσεων",
      description:
        "Πλήρης εικόνα κατάστασης κρατήσεων, σύνδεσης με ακίνητα και συνδεδεμένων εργασιών.",
      active: "Ενεργές",
      all: "Όλες",
      cancelled: "Ακυρωμένες",
      clearDay: "Καθαρισμός ημέρας",
      detailsTitle: "Αναλυτική λίστα",
      allBookings: "Όλες οι κρατήσεις",
      filteredDayPrefix: "Φιλτραρισμένη ημέρα",
      arrivals: "Αφίξεις",
      departures: "Αναχωρήσεις",
      bookings: "Κρατήσεις",
      noHistory: "Δεν βρέθηκαν κρατήσεις.",
      loadError: "Αποτυχία φόρτωσης ιστορικού κρατήσεων.",
      taskPrefix: "Εργασία",
    },
    detail: {
      breadcrumb: "Κρατήσεις",
      titleFallback: "Κράτηση",
      detailsCard: "Στοιχεία κράτησης",
      propertyCard: "Ακίνητο",
      linkedTasksCard: "Συνδεδεμένες εργασίες",
      syncHistoryCard: "Ιστορικό συγχρονισμών",
      createTaskCard: "Νέα εργασία από κράτηση",
      noTasks: "Δεν υπάρχουν ακόμη εργασίες από αυτή την κράτηση.",
      noHistory: "Δεν υπάρχει ιστορικό ακόμη.",
      noProperty:
        "Η κράτηση δεν έχει ακόμα αντιστοιχιστεί με ακίνητο.",
      mappingPending:
        "Πρώτα πρέπει να ολοκληρωθεί η αντιστοίχιση με ακίνητο.",
      cancelledNoTask:
        "Η κράτηση είναι ακυρωμένη και δεν μπορεί να δημιουργήσει εργασία.",
      taskCreateError: "Αποτυχία δημιουργίας εργασίας.",
      taskCreateSuccess: "Η εργασία δημιουργήθηκε επιτυχώς.",
      loadError: "Αποτυχία φόρτωσης κράτησης.",
      notFound: "Η κράτηση δεν βρέθηκε.",
      bookingInfoLine: "Πηγή",
      completedMapping: "Ολοκληρωμένη",
      pendingMapping: "Εκκρεμεί",
      assignmentPrefix: "Ανάθεση",
    },
  }
}