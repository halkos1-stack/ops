# OPS SYSTEM MAP

## Σκοπός του αρχείου

Το παρόν αρχείο είναι ο λειτουργικός και τεχνικός χάρτης του OPS.
Υπάρχει για να δίνει σε άνθρωπο ή εργαλείο τεχνητής νοημοσύνης γρήγορη και σωστή εικόνα του συστήματος χωρίς να χαθεί ο πυρήνας αρχιτεκτονικής.

Το OPS δεν πρέπει να αντιμετωπίζεται ως γενικό σύστημα “property management”.
Ο πυρήνας του είναι:

- το ακίνητο ως κέντρο επιχειρησιακής αλήθειας
- η readiness λογική πριν το επόμενο check-in
- η ελεγχόμενη ροή από κράτηση σε εργασία
- η εκτέλεση μέσω συνεργάτη
- οι λίστες καθαριότητας / αναλωσίμων
- η απόδειξη κατάστασης και όχι απλή δήλωση

---

## 1. Συνολική ταυτότητα του OPS

Το OPS είναι πολυοργανωσιακό SaaS λειτουργικής διαχείρισης ακινήτων.

Η τρέχουσα εικόνα του συστήματος οργανώνεται γύρω από τα εξής επίπεδα:

1. SaaS / Οργανισμός / Πρόσβαση
2. Επιχειρησιακά δεδομένα ακινήτου
3. Readiness πυρήνας
4. API / επιχειρησιακές ροές
5. Διεπαφή διαχειριστή
6. Portal συνεργάτη

---

## 2. Κεντρική αρχιτεκτονική αρχή

### Το ακίνητο είναι το operational hub

Το ακίνητο είναι η βασική οντότητα γύρω από την οποία συνδέονται:

- κρατήσεις
- εργασίες
- συνεργάτες
- λίστες εκτέλεσης
- αναλώσιμα
- ζητήματα / ζημιές / βλάβες
- readiness snapshot
- ιστορικό ενεργειών

### Η εργασία είναι execution layer, όχι η απόλυτη αλήθεια

Η εργασία εκφράζει εκτέλεση.
Δεν είναι η τελική πηγή αλήθειας του ακινήτου.

### Το readiness πρέπει να προκύπτει από backend κανόνες

Το readiness δεν πρέπει να ορίζεται από την οθόνη.
Το UI πρέπει να απεικονίζει την readiness αλήθεια που παράγεται από backend λογική.

---

## 3. Κύρια επίπεδα του συστήματος

## Επίπεδο Α — SaaS / Πρόσβαση / Οργανισμός

### Ρόλος
Ορίζει ποιος είναι ο χρήστης, σε ποιον οργανισμό ανήκει και τι επιτρέπεται να δει ή να αλλάξει.

### Βασικές έννοιες
- User
- Organization
- Membership
- SystemRole
- OrganizationRole
- Session auth
- Tenant access

### Κρίσιμα αρχεία
- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`

### Παρατηρήσεις
Αυτό το επίπεδο είναι πυρήνας.
Αλλαγές εδώ επηρεάζουν όλο το σύστημα.

---

## Επίπεδο Β — Επιχειρησιακά δεδομένα

### Ρόλος
Αποτυπώνει τη λειτουργική πραγματικότητα του οργανισμού.

### Κύριες οντότητες
- Property
- Booking
- BookingPropertyMapping
- BookingSyncEvent
- Partner
- PartnerPortalAccessToken
- Task
- TaskAssignment
- Issue
- SupplyItem
- PropertySupply
- SupplyConsumption
- PropertyChecklistTemplate
- PropertyChecklistTemplateItem
- TaskChecklistRun
- TaskChecklistAnswer
- TaskSupplyRun
- TaskSupplyAnswer
- Event
- ActivityLog
- Settings
- PropertySupplyQRCode
- PropertySupplyQRScan

### Κρίσιμο αρχείο
- `prisma/schema.prisma`

### Παρατηρήσεις
Αυτό είναι το επιχειρησιακό σώμα του OPS.
Εδώ βρίσκεται μεγάλο μέρος της εμπορικής αξίας του προϊόντος.

---

## Επίπεδο Γ — Readiness πυρήνας

### Ρόλος
Παράγει backend readiness εικόνα του ακινήτου.

### Τι υπολογίζει
- πλήθος ανοιχτών εργασιών
- πλήθος ανοιχτών θεμάτων
- ενεργά alert
- κρίσιμα blockers αναλωσίμων
- επόμενο check-in
- χρονική πίεση επόμενου check-in

### Κρίσιμο αρχείο
- `lib/properties/readiness-snapshot.ts`

### Επιθυμητή αρχή
Το readiness πρέπει να καταλήξει να είναι μία και μοναδική backend αλήθεια.

### Τρέχουσα κατάσταση
Υπάρχει readiness snapshot backend λογική, αλλά υπάρχει και readiness παράγωγη λογική μέσα στο UI.
Αυτό πρέπει να ενοποιηθεί.

---

## Επίπεδο Δ — API / επιχειρησιακές ροές

### Ρόλος
Μετατρέπει τον πυρήνα σε λειτουργικές ροές.

### Κύρια routes
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/bookings/route.ts`

### Βασικές λειτουργίες
- δημιουργία / φόρτωση / ενημέρωση ακινήτων
- δημιουργία / φόρτωση εργασιών
- validations λιστών
- συγχρονισμός cleaning runs
- συγχρονισμός supplies runs
- επεξεργασία κρατήσεων
- υπολογισμός operational windows
- readiness snapshot refresh μετά από δημιουργία property

### Παρατηρήσεις
Τα route files σήμερα περιέχουν αρκετή επιχειρησιακή λογική.
Μακροπρόθεσμα αυτή η λογική πρέπει να σπάσει σε καθαρότερα domain/service αρχεία.

---

## Επίπεδο Ε — Διεπαφή διαχειριστή

### Ρόλος
Δίνει στον διαχειριστή πρακτική εικόνα ελέγχου.

### Κύριες οθόνες που έχουν επιβεβαιωθεί
- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`

### Τι κάνουν
- property listing
- φίλτρα
- readiness κάρτες
- operational counters
- προβολή επόμενου check-in
- property control center
- λίστες ανοιχτών εργασιών
- αναλώσιμα
- θέματα
- default partner
- modals διαχείρισης

### Παρατηρήσεις
Οι οθόνες είναι λειτουργικά ώριμες αλλά αρκετά βαριές.
Δεν πρέπει να μετατραπούν σε δεύτερο business engine.

---

## Επίπεδο ΣΤ — Portal συνεργάτη

### Ρόλος
Δίνει στον συνεργάτη πρόσβαση εκτέλεσης χωρίς κλασικό login, με token-based portal.

### Κύρια επιβεβαιωμένη οθόνη
- `app/partner/[token]/page.tsx`

### Τι περιλαμβάνει
- dashboard συνεργάτη
- στατιστικά αναθέσεων
- urgent items
- γλωσσική εναλλαγή
- σύνδεση με schedule / calendar / history

### Παρατηρήσεις
Το partner portal είναι πραγματική ενότητα προϊόντος και όχι βοηθητικό demo layer.

---

## 4. Πυρήνας λειτουργικών ροών

## Ροή 1 — Χρήστης και πρόσβαση
User → Session → Role → Organization → App Access

## Ροή 2 — Property hub
Organization → Property → Bookings / Tasks / Issues / Supplies / Readiness

## Ροή 3 — Booking operational flow
Booking → Property mapping → Operational window → Task coverage

## Ροή 4 — Execution flow
Task → Assignment → Partner → Checklist / Supplies run → Completion signal

## Ροή 5 — Readiness flow
Tasks + Issues + Alerts + Critical Supplies + Next Check-in → Readiness snapshot → Property readiness fields

---

## 5. Ποια αρχεία θεωρούνται πυρήνας

Τα παρακάτω θεωρούνται ΚΡΙΣΙΜΑ ΑΡΧΕΙΑ ΠΥΡΗΝΑ.
Δεν αλλάζουν “γρήγορα” χωρίς προηγούμενο έλεγχο και σχεδιασμό.

- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`
- `lib/properties/readiness-snapshot.ts`
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/bookings/route.ts`

### Κανόνας
Αλλαγή σε αυτά τα αρχεία σημαίνει:
1. έλεγχος
2. σχεδιασμός
3. ένα αρχείο τη φορά
4. πλήρες αρχείο, όχι αποσπασματικά patches ως default

---

## 6. Ποια αρχεία θεωρούνται κυρίως διεπαφή

Αυτά είναι αρχεία με μεγαλύτερο βάρος παρουσίασης και διαχείρισης οθόνης:

- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`
- `app/partner/[token]/page.tsx`

### Κανόνας
Εδώ επιτρέπονται πιο συχνές αλλαγές UI, αλλά:
- όχι νέο business logic μόνο στην οθόνη
- όχι δεύτερη readiness λογική
- όχι αλλαγές που παρακάμπτουν τον backend πυρήνα

---

## 7. Μεταβατικά σημεία / αρχιτεκτονικό χρέος

Τα παρακάτω σημεία θεωρούνται ενεργό τεχνικό χρέος ή μεταβατική αρχιτεκτονική:

1. `app/api/tasks/route.ts` χρησιμοποιεί ακόμα mock auth pattern
2. readiness λογική υπάρχει και στον backend και στο UI
3. οι property pages είναι πολύ μεγάλες και κρατούν υπερβολική λογική
4. το route layer κουβαλά αρκετή domain λογική
5. το repo δεν έχει ακόμα πλήρες README και system-level τεκμηρίωση

---

## 8. Κανόνες ασφαλούς αλλαγής

## Επιτρέπονται εύκολα
- labels
- μικρές βελτιώσεις UI
- layout αλλαγές
- presentation helpers
- μικρές μεταφραστικές βελτιώσεις

## Θέλουν προσοχή
- property routes
- booking routes
- task routes
- readiness calculation
- portal responses

## Θέλουν αυστηρό έλεγχο
- schema
- auth
- route-access
- readiness core rules
- σχέσεις Property / Booking / Task / Issue / Supply

---

## 9. Κατεύθυνση εξέλιξης

Η σωστή στρατηγική εξέλιξης του OPS είναι:

1. ενοποίηση auth / access παντού
2. ενοποίηση readiness ως μοναδική backend αλήθεια
3. μεταφορά domain logic έξω από route files
4. διάσπαση βαριών pages σε μικρότερα κομμάτια
5. σταθερή τεκμηρίωση πυρήνα και ανοιχτών θεμάτων

---

## 10. Κανόνας συνεργασίας με AI / Codex

Όποιο εργαλείο δουλεύει πάνω στο OPS πρέπει να σέβεται τα εξής:

- το property παραμένει το operational hub
- το readiness δεν ορίζεται από το UI
- οι αλλαγές σε πυρήνα γίνονται ένα αρχείο τη φορά
- οι μεγάλες αρχιτεκτονικές αλλαγές δεν μπαίνουν σιωπηλά
- τα routes δεν πρέπει να γεμίζουν όλο και περισσότερο business logic
- οι mock / dev παρακάμψεις δεν πρέπει να επιβιώνουν σε production-critical paths

---

## 11. Πρακτική χρήση αυτού του αρχείου

Χρησιμοποίησε αυτό το αρχείο όταν θέλεις να απαντήσεις σε ερωτήσεις όπως:

- ποιος είναι ο πυρήνας του συστήματος;
- ποια αρχεία είναι επικίνδυνα να αλλάξουν;
- ποια είναι UI και ποια είναι core;
- πού πρέπει να μπει το readiness logic;
- ποια είναι η ασφαλής σειρά βελτιώσεων;
- πώς να κρίνουμε αν μια αλλαγή χαλάει την αρχιτεκτονική του OPS;

---

## 12. Κανόνας ενημέρωσης

Το παρόν αρχείο πρέπει να ενημερώνεται όταν αλλάζει ένα από τα παρακάτω:

- ο πυρήνας readiness
- τα κύρια auth / access αρχεία
- η βασική δομή routes
- το μοντέλο δεδομένων του schema
- η αρχιτεκτονική του partner portal
- η βασική ροή property → booking → task → execution