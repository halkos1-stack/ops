# OPS SYSTEM MAP

## Σκοπός του αρχείου

Το παρόν αρχείο είναι ο λειτουργικός και τεχνικός χάρτης του OPS.
Υπάρχει για να δίνει σε άνθρωπο ή εργαλείο τεχνητής νοημοσύνης γρήγορη και σωστή εικόνα του συστήματος χωρίς να χάνεται ο πυρήνας αρχιτεκτονικής.

Το OPS δεν πρέπει να αντιμετωπίζεται ως γενικό σύστημα “property management”.
Ο πυρήνας του είναι:

- το ακίνητο ως κέντρο επιχειρησιακής αλήθειας
- η readiness λογική πριν το επόμενο check-in
- το ένα κύριο readiness target από σήμερα
- η ελεγχόμενη ροή από κράτηση σε εργασία
- η εκτέλεση μέσω συνεργάτη
- οι λίστες καθαριότητας / αναλωσίμων / ζημιών-βλαβών
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
7. Απόδειξη εκτέλεσης / QR / work session
8. Ιστορικό και στατιστικά

---

## 2. Κεντρική αρχιτεκτονική αρχή

### Το ακίνητο είναι το readiness hub

Το ακίνητο είναι η βασική οντότητα γύρω από την οποία συνδέονται:

- κρατήσεις
- εργασίες
- συνεργάτες
- λίστες εκτέλεσης
- αναλώσιμα
- ζημιές / βλάβες / conditions
- readiness snapshot
- ιστορικό ενεργειών
- execution proof

### Η εργασία είναι execution layer, όχι η απόλυτη αλήθεια

Η εργασία εκφράζει εκτέλεση.
Δεν είναι η τελική πηγή αλήθειας του ακινήτου.

### Το readiness πρέπει να προκύπτει από backend κανόνες

Το readiness δεν πρέπει να ορίζεται από την οθόνη.
Το UI πρέπει να απεικονίζει την readiness αλήθεια που παράγεται από backend λογική.

### Readiness != Availability

Το readiness δεν σημαίνει απλώς ότι υπάρχει κράτηση, κενό ή διαθεσιμότητα στο ημερολόγιο.
Σημαίνει ότι το ακίνητο είναι επιχειρησιακά έτοιμο για την επόμενη άφιξη.

### Ένα κύριο readiness target

Το OPS πρέπει να θεωρεί ως κύριο readiness target μόνο το **αμέσως επόμενο check-in από σήμερα**.

Αυτό σημαίνει:

- μόνο αυτό παίρνει κύριο readiness verdict
- μόνο αυτό παίρνει κύριο readiness χρώμα / explainable αποτέλεσμα
- όλα τα μεταγενέστερα check-in είναι planning layer και όχι κύριο readiness layer

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
- PropertyCondition
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

### Κεντρική λογική
Ο readiness πυρήνας πρέπει να λειτουργεί με δύο στρώματα:

1. **Operational layer**
   - βρίσκει το active readiness target
   - βρίσκει το σχετικό checkout
   - βρίσκει το σχετικό turnover window
   - βρίσκει αν υπάρχει covering εργασία
   - κρίνει αν υπάρχει operational gap

2. **Readiness layer**
   - ελέγχει conditions / ζημιές / βλάβες
   - ελέγχει readiness-relevant shortages
   - συνδυάζει το operational context
   - βγάζει explainable readiness verdict

### Τι υπολογίζει
- active readiness target check-in
- σχετικό checkout
- turnover coverage
- ανοιχτά blockers
- warning states
- readiness explanation
- planning κατάσταση για μεταγενέστερα check-in

### Κρίσιμα αρχεία
- `lib/readiness/compute-property-readiness.ts`
- `lib/readiness/property-condition-rules.ts`
- `lib/readiness/property-condition-mappers.ts`
- `lib/readiness/refresh-property-readiness.ts`
- `lib/properties/readiness-snapshot.ts`
- `lib/readiness/property-operational-status.ts`

### Επιθυμητή αρχή
Το readiness πρέπει να είναι μία και μοναδική backend αλήθεια.

### Τρέχουσα στρατηγική
Η σωστή κατεύθυνση είναι:
- ένα active readiness target
- readiness verdict μόνο για αυτό
- planning state για τα μεταγενέστερα check-in
- καμία δεύτερη readiness λογική στο UI

---

## Επίπεδο Δ — API / επιχειρησιακές ροές

### Ρόλος
Μετατρέπει τον πυρήνα σε λειτουργικές ροές.

### Κύρια routes
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/properties/[id]/readiness/route.ts`
- `app/api/properties/[id]/conditions/route.ts`
- `app/api/property-conditions/[conditionId]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[taskId]/route.ts`
- `app/api/bookings/route.ts`

### Βασικές λειτουργίες
- δημιουργία / φόρτωση / ενημέρωση ακινήτων
- δημιουργία / φόρτωση εργασιών
- validations λιστών
- συγχρονισμός checklist / supply runs
- επεξεργασία κρατήσεων
- υπολογισμός operational windows
- readiness refresh
- condition management
- response shaping για property list / property detail / task detail

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
- `app/(dashboard)/properties/[id]/tasks/page.tsx`
- `app/(dashboard)/tasks/[taskId]/page.tsx`
- `app/(dashboard)/property-checklists/[propertyId]/page.tsx`

### Τι κάνουν
- property listing
- σημερινή επιχειρησιακή εικόνα
- counters / φίλτρα
- active readiness concern
- property control center
- calendar-first εικόνα ακινήτου
- λίστες ανοιχτών εργασιών
- αναλώσιμα
- θέματα
- default partner
- modals διαχείρισης

### Κεντρική αρχή
Οι οθόνες δεν πρέπει να γίνουν δεύτερος business engine.
Πρέπει να καταναλώνουν canonical outputs από helpers / backend logic.

### Νέα τελική λογική UI
- η σελίδα **Ακίνητα** είναι daily operational overview
- η σελίδα **Ακίνητο** είναι property timeline + control center
- μόνο το επόμενο check-in παίρνει readiness signal
- τα μεταγενέστερα check-in δείχνουν planning κατάσταση
- το παρελθόν λειτουργεί ως ιστορικό / στατιστικά

---

## Επίπεδο ΣΤ — Portal συνεργάτη

### Ρόλος
Δίνει στον συνεργάτη πρόσβαση εκτέλεσης χωρίς κλασικό login, με token-based portal.

### Κύριες επιβεβαιωμένες οθόνες
- `app/partner/[token]/page.tsx`
- `app/partner/[token]/calendar`
- `app/partner/[token]/tasks/[taskId]`

### Τι περιλαμβάνει
- dashboard συνεργάτη
- στατιστικά αναθέσεων
- urgent items
- γλωσσική εναλλαγή
- schedule / calendar / history
- execution flows
- checklist / supplies / task completion

### Παρατηρήσεις
Το partner portal είναι πραγματική ενότητα προϊόντος και όχι βοηθητικό demo layer.

---

## Επίπεδο Ζ — QR / work session / execution proof

### Ρόλος
Καταγράφει πραγματική παρουσία και χρόνο εκτέλεσης μέσα στο ακίνητο.

### Στόχος
Ο συνεργάτης, μπαίνοντας στο ακίνητο:
- σκανάρει QR
- ανοίγει work session
- καταγράφεται ώρα έναρξης
- εκτελεί τη δουλειά
- υποβάλλει τις απαιτούμενες λίστες
- κλείνει η εργασία / work session
- κρατιέται χρόνος εκτέλεσης

### Σχετιζόμενες έννοιες
- PropertySupplyQRCode
- PropertySupplyQRScan
- future work-session layer
- presence proof
- startedAt / completedAt / duration

### Παρατηρήσεις
Το QR δεν πρέπει να μείνει βοηθητικό feature.
Πρέπει να εξελιχθεί σε execution proof layer.

---

## Επίπεδο Η — Ιστορικό / στατιστικά / λειτουργική εικόνα

### Ρόλος
Κρατά το παρελθόν ως ελέγξιμο και explainable ιστορικό.

### Περιλαμβάνει
- προηγούμενες κρατήσεις
- προηγούμενες εργασίες
- προηγούμενες δηλώσεις αναλωσίμων
- ζημιές / βλάβες / conditions
- consumption history
- activity log
- execution history
- γενική εικόνα λειτουργίας μέχρι σήμερα

### Παρατηρήσεις
Το παρελθόν δεν είναι readiness target.
Είναι ιστορικό, στατιστική και έλεγχος λειτουργίας.

---

## 4. Πυρήνας λειτουργικών ροών

## Ροή 1 — Χρήστης και πρόσβαση
User → Session → Role → Organization → App Access

## Ροή 2 — Property hub
Organization → Property → Bookings / Tasks / Conditions / Supplies / Readiness

## Ροή 3 — Booking operational flow
Booking → Property mapping → Next relevant check-in → Related checkout → Turnover window → Task coverage

## Ροή 4 — Execution flow
Task → Assignment → Partner → Checklist / Supplies run / Issue declaration → Completion signal

## Ροή 5 — Readiness flow
Operational target + open conditions + readiness-relevant supply shortages + task coverage + proof → backend readiness verdict

## Ροή 6 — Planning flow
Future check-ins after the active target → turnover planning visibility → task coverage status → planning-only signal

## Ροή 7 — QR / execution proof flow
Partner enters property → QR scan → session open → execution → submit → session close → duration / proof

---

## 5. Τελική λογική χρόνου

### Από σήμερα και πίσω
Θεωρείται:
- ιστορικό
- στατιστικά
- γενική εικόνα λειτουργίας
- κατανάλωση
- παλιές εκτελέσεις

### Από σήμερα και μπροστά
Χωρίζεται σε δύο επίπεδα:

#### 1. Active readiness target
Το αμέσως επόμενο check-in από σήμερα.

#### 2. Planning targets
Όλα τα μεταγενέστερα check-in μετά το active target.

### Επιχειρησιακός κανόνας
Μόνο το active readiness target επηρεάζεται επιχειρησιακά από:
- turnover task coverage
- ανοιχτά conditions
- readiness-relevant shortages
- ζημιές / βλάβες
- execution proof

Τα μεταγενέστερα check-in δεν παίρνουν το ίδιο readiness βάρος.

---

## 6. Ρόλος των εργασιών

### Turnover εργασία
Η εργασία που καλύπτει το window από το σχετικό checkout μέχρι το σχετικό επόμενο check-in.

Αυτή επηρεάζει readiness.

### In-stay εργασία
Εργασία που γίνεται κατά τη διάρκεια ενεργής διαμονής.

Αυτή:
- δημιουργείται
- ανατίθεται
- εκτελείται
- καταγράφεται

αλλά **δεν** επηρεάζει readiness για το επόμενο check-in.

### Future planning εργασία
Εργασία που καλύπτει μεταγενέστερο check-in μετά το active target.

Αυτή δεν επηρεάζει το σημερινό readiness verdict.
Δίνει planning πληροφορία.

---

## 7. Αναλώσιμα / ζημιές / βλάβες / conditions

## Αναλώσιμα
Το σύστημα πρέπει να κρατά:

- current stock / κατάσταση
- ποσότητα που βρέθηκε
- ποσότητα που συμπληρώθηκε
- τελική κατάσταση μετά από πλήρωση
- consumption history
- replenishment history

### Readiness αρχή
Τα αναλώσιμα επηρεάζουν readiness μόνο για το active readiness target.

## Ζημιές / βλάβες / conditions
Μπορούν να δηλώνονται από:
- συνεργάτη
- διαχειριστή
- εσωτερικές ροές

### Κανόνας closure
Το κλείσιμο θέματος δεν πρέπει να γίνεται αυτόματα από απλή δήλωση συνεργάτη.
Η τελική αλλαγή resolved / dismissed πρέπει να ελέγχεται από manager action.

### Readiness αρχή
Οι ανοιχτές readiness-relevant ζημιές / βλάβες / conditions επηρεάζουν μόνο το active target.

---

## 8. Ποια αρχεία θεωρούνται πυρήνας

Τα παρακάτω θεωρούνται ΚΡΙΣΙΜΑ ΑΡΧΕΙΑ ΠΥΡΗΝΑ.
Δεν αλλάζουν “γρήγορα” χωρίς προηγούμενο έλεγχο και σχεδιασμό.

- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`
- `lib/properties/readiness-snapshot.ts`
- `lib/readiness/compute-property-readiness.ts`
- `lib/readiness/property-condition-rules.ts`
- `lib/readiness/property-condition-mappers.ts`
- `lib/readiness/refresh-property-readiness.ts`
- `lib/readiness/property-operational-status.ts`
- `lib/properties/property-calendar.ts`
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/properties/[id]/readiness/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[taskId]/route.ts`
- `app/api/bookings/route.ts`

### Κανόνας
Αλλαγή σε αυτά τα αρχεία σημαίνει:
1. έλεγχος
2. σχεδιασμός
3. ένα αρχείο τη φορά
4. πλήρες αρχείο, όχι αποσπασματικά patches ως default

---

## 9. Ποια αρχεία θεωρούνται κυρίως διεπαφή

Αυτά είναι αρχεία με μεγαλύτερο βάρος παρουσίασης και διαχείρισης οθόνης:

- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`
- `app/(dashboard)/properties/[id]/tasks/page.tsx`
- `app/(dashboard)/tasks/[taskId]/page.tsx`
- `app/partner/[token]/page.tsx`

### Κανόνας
Εδώ επιτρέπονται πιο συχνές αλλαγές UI, αλλά:
- όχι νέο business logic μόνο στην οθόνη
- όχι δεύτερη readiness λογική
- όχι αλλαγές που παρακάμπτουν τον backend πυρήνα
- όχι νέο planning / readiness engine μέσα στο page

---

## 10. Shared helper layers που πρέπει να θεωρούνται source of truth

### Readiness / operational helpers
- `lib/readiness/compute-property-readiness.ts`
- `lib/readiness/property-operational-status.ts`
- `lib/readiness/property-condition-rules.ts`
- `lib/readiness/property-condition-mappers.ts`
- `lib/readiness/refresh-property-readiness.ts`

### Property calendar / shaping helpers
- `lib/properties/property-calendar.ts`
- `lib/properties/readiness-snapshot.ts`

### Αρχή
Η detail page ακινήτου και η list page ακινήτων πρέπει να καταναλώνουν αυτά τα helpers και όχι να ξαναχτίζουν δικό τους business engine.

---

## 11. Μεταβατικά σημεία / αρχιτεκτονικό χρέος

Τα παρακάτω σημεία θεωρούνται ενεργό τεχνικό χρέος ή μεταβατική αρχιτεκτονική:

1. `app/api/tasks/route.ts` χρησιμοποιεί ακόμα mock auth pattern
2. readiness λογική υπάρχει και στον backend και στο UI
3. τα property pages είναι πολύ μεγάλα και κρατούν υπερβολική λογική
4. το route layer κουβαλά αρκετή domain λογική
5. το system map και τα τεχνικά topics πρέπει να μείνουν ευθυγραμμισμένα με τη νέα active-target λογική
6. το QR presence/work-session layer δεν έχει ακόμη γίνει canonical execution proof flow
7. το planning layer για τα μεταγενέστερα check-in δεν έχει ακόμη κλειδώσει πλήρως σε κοινό helper output
8. το issue / damage closure workflow πρέπει να παραμείνει manager-controlled

---

## 12. Κανόνες ασφαλούς αλλαγής

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
- calendar helper outputs
- portal responses
- condition handling
- supply projections

## Θέλουν αυστηρό έλεγχο
- schema
- auth
- route-access
- readiness core rules
- active readiness target logic
- σχέσεις Property / Booking / Task / Condition / Supply
- QR work-session logic
- manager-controlled closure logic

---

## 13. Κατεύθυνση εξέλιξης

Η σωστή στρατηγική εξέλιξης του OPS είναι:

1. ενοποίηση auth / access παντού
2. ενοποίηση readiness ως μοναδική backend αλήθεια
3. υλοποίηση του active readiness target ως canonical rule
4. διαχωρισμός readiness layer vs planning layer
5. σταθερή παραγωγή conditions από execution flows
6. μεταφορά domain logic έξω από route files
7. διάσπαση βαριών pages σε μικρότερα κομμάτια
8. προσθήκη QR work-session proof layer
9. ολοκλήρωση supply consumption / replenishment / statistics flow
10. σταθερή τεκμηρίωση πυρήνα και ανοιχτών θεμάτων

---

## 14. Κανόνας συνεργασίας με AI / Codex

Όποιο εργαλείο δουλεύει πάνω στο OPS πρέπει να σέβεται τα εξής:

- το property παραμένει το operational hub
- το readiness δεν ορίζεται από το UI
- το readiness verdict αφορά το active readiness target
- τα μελλοντικά check-in μετά το active target είναι planning layer
- οι αλλαγές σε πυρήνα γίνονται ένα αρχείο τη φορά
- οι μεγάλες αρχιτεκτονικές αλλαγές δεν μπαίνουν σιωπηλά
- τα routes δεν πρέπει να γεμίζουν όλο και περισσότερο business logic
- οι mock / dev παρακάμψεις δεν πρέπει να επιβιώνουν σε production-critical paths
- οι ζημιές / βλάβες δεν πρέπει να κλείνουν αυτόματα από partner-side δήλωση
- το QR execution proof δεν πρέπει να σχεδιαστεί σαν βοηθητικό feature

---

## 15. Πρακτική χρήση αυτού του αρχείου

Χρησιμοποίησε αυτό το αρχείο όταν θέλεις να απαντήσεις σε ερωτήσεις όπως:

- ποιος είναι ο πυρήνας του συστήματος;
- ποια αρχεία είναι επικίνδυνα να αλλάξουν;
- ποια είναι UI και ποια είναι core;
- πού πρέπει να μπει το readiness logic;
- πού πρέπει να μπει η planning λογική;
- ποια είναι η ασφαλής σειρά βελτιώσεων;
- πώς να κρίνουμε αν μια αλλαγή χαλάει την αρχιτεκτονική του OPS;

---

## 16. Κανόνας ενημέρωσης

Το παρόν αρχείο πρέπει να ενημερώνεται όταν αλλάζει ένα από τα παρακάτω:

- ο πυρήνας readiness
- το active readiness target logic
- η σχέση readiness vs planning
- τα κύρια auth / access αρχεία
- η βασική δομή routes
- το μοντέλο δεδομένων του schema
- η αρχιτεκτονική του partner portal
- η βασική ροή property → booking → task → execution
- η λογική QR / work session / execution proof
- η λογική issue / damage manager-controlled closure