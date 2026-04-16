# OPS

## Τι είναι το OPS

Το OPS είναι πολυοργανωσιακό SaaS λειτουργικής διαχείρισης ακινήτων με πυρήνα την **επιχειρησιακή ετοιμότητα ακινήτου πριν το επόμενο check-in**.

Δεν είναι γενικό εργαλείο “property management”.
Δεν είναι απλό task tracker.
Δεν είναι ημερολόγιο κρατήσεων που παράγει αυτόματα επιχειρησιακή αλήθεια.

Ο πυρήνας του OPS είναι:

- το **ακίνητο** ως κέντρο επιχειρησιακής αλήθειας
- η **readiness-first** λογική πριν το επόμενο check-in
- το **ένα κύριο readiness target** από σήμερα
- η **απόδειξη** κατάστασης και όχι η απλή δήλωση
- η **ελεγχόμενη ροή** από κράτηση σε εργασία
- η εκτέλεση μέσω συνεργάτη με λίστες, συμβάντα και τεκμηρίωση

---

## Τι σημαίνει readiness στο OPS

Στο OPS το readiness δεν σημαίνει απλώς ότι υπάρχει διαθεσιμότητα στο ημερολόγιο.

**Readiness != Availability**

Ένα ακίνητο θεωρείται έτοιμο όταν, με βάση τα πραγματικά ανοιχτά δεδομένα του συστήματος, δεν υπάρχουν εκκρεμότητες που το μπλοκάρουν για το **αμέσως επόμενο check-in από σήμερα**.

Η readiness εικόνα πρέπει να προκύπτει από backend κανόνες και explainable λογική, όχι από αποσπασματικούς υπολογισμούς οθόνης.

Οι canonical readiness καταστάσεις είναι:

- `ready`
- `borderline`
- `not_ready`
- `unknown`

---

## Κλειδωμένες αρχιτεκτονικές αρχές

### 1. Το ακίνητο είναι το readiness hub

Το ακίνητο είναι η βασική επιχειρησιακή οντότητα του OPS.
Γύρω από αυτό συνδέονται:

- κρατήσεις
- εργασίες
- συνεργάτες
- λίστες καθαριότητας
- λίστες αναλωσίμων
- λίστες βλαβών / ζημιών
- συμβάντα / conditions
- readiness snapshot
- ιστορικό ενεργειών
- execution proof

### 2. Η εργασία είναι execution layer

Η εργασία εκφράζει εκτέλεση.
Δεν είναι η απόλυτη πηγή αλήθειας του ακινήτου.

Task-level προσαρμογές επιτρέπονται μόνο ως execution-level λογική και **δεν** πρέπει να αντικαθιστούν τις κύριες δομές του ακινήτου.

### 3. Απόδειξη πάνω από δήλωση

Το OPS χτίζεται με αρχή:

**proof over declaration**

Όπου απαιτείται κρίσιμη τεκμηρίωση, η έλλειψή της πρέπει να μπορεί να μπλοκάρει τη ροή.

### 4. Blocking όταν λείπουν κρίσιμα στοιχεία

Όταν λείπουν κρίσιμα δεδομένα, αποδείξεις ή απαιτούμενα βήματα, το σύστημα δεν πρέπει να “προσπερνά” επιχειρησιακά το πρόβλημα.

### 5. Αυστηρή σειρά γεγονότων

Η επιχειρησιακή ροή έχει σημασία.
Δεν πρέπει να επιτρέπονται παρακάμψεις που αλλοιώνουν την αλήθεια του συστήματος.

### 6. Explainable και μη σιωπηλά αλλοιώσιμο ιστορικό

Το OPS πρέπει να κρατά ιστορικό που παραμένει κατανοήσιμο, ελέγξιμο και δεν ξαναγράφεται σιωπηλά προς τα πίσω.

### 7. Το readiness αφορά μόνο το active readiness target

Το κύριο readiness verdict του συστήματος αφορά μόνο το **αμέσως επόμενο check-in από σήμερα**.

Αυτό είναι το **Active Readiness Target**.

Όλα τα μεταγενέστερα check-in παραμένουν ορατά, αλλά δεν παίρνουν το ίδιο readiness βάρος.
Ανήκουν σε **planning layer** και όχι στο κύριο readiness layer.

### 8. Τα μεταγενέστερα check-in είναι planning layer

Για τα check-in μετά το active readiness target, το σύστημα πρέπει να δείχνει:

- αν υπάρχει ή όχι covering εργασία
- ποιο checkout συνδέεται με αυτή την άφιξη
- ποια είναι σήμερα η κατάσταση της σχετικής εργασίας
- ότι αυτό δεν είναι το τρέχον readiness target

Δεν πρέπει να δείχνει το ίδιο readiness alert σε όλα τα future check-in.

### 9. Μόνο οι turnover εργασίες του active target επηρεάζουν readiness

Οι εργασίες διακρίνονται λειτουργικά σε:

- turnover εργασίες
- in-stay εργασίες
- λοιπές χειροκίνητες / ειδικές εργασίες

Μόνο η εργασία που καλύπτει το turnover window του **active readiness target** επηρεάζει readiness.

Οι in-stay εργασίες:
- δημιουργούνται
- ανατίθενται
- εκτελούνται
- καταγράφονται

αλλά **δεν** επηρεάζουν readiness για το επόμενο check-in.

### 10. Ο διαχειριστής κρατά την τελική επιχειρησιακή απόφαση

Ο συνεργάτης μπορεί να δηλώνει:
- εκτέλεση
- αναλώσιμα
- ζημιές / βλάβες
- observations

Όμως η τελική επιχειρησιακή απόφαση παραμένει στον διαχειριστή, ειδικά όταν αφορά:
- blocking θέματα
- closure ζημιών / βλαβών / conditions
- εξωσυστημικές παρεμβάσεις
- readiness-impacting αποφάσεις

---

## Λογική χρόνου στο OPS

### Από σήμερα και πίσω

Θεωρείται:

- ιστορικό
- στατιστικά
- γενική εικόνα λειτουργίας
- προηγούμενες κρατήσεις
- προηγούμενες εργασίες
- προηγούμενες δηλώσεις αναλωσίμων
- προηγούμενες ζημιές / βλάβες / conditions
- execution history

### Από σήμερα και μπροστά

Χωρίζεται σε δύο επίπεδα:

#### 1. Active Readiness Target
Το αμέσως επόμενο check-in από σήμερα.

#### 2. Planning Targets
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

## Κύριες επιχειρησιακές ροές

### Ροή κρατήσεων

`Booking -> αντιστοίχιση με ακίνητο -> next relevant check-in -> related checkout -> turnover window -> task coverage -> readiness impact`

Σημαντική κλειδωμένη αρχή:

Οι πλατφόρμες κρατήσεων είναι **πηγές εισόδου κρατήσεων** και όχι πηγές αυτόματης επιχειρησιακής αλήθειας.

Νέα κράτηση **δεν** πρέπει να ενημερώνει πρόχειρα υπάρχουσα ενεργή εργασία άλλου check-out.

### Ροή εργασίας

`Task -> assignment -> partner portal -> execution lists -> submit -> conditions / readiness impact`

### Ροή readiness

`Operational target + open conditions + readiness-relevant supplies + task coverage + proof -> backend readiness verdict`

### Ροή planning

`Future check-ins after the active target -> turnover planning visibility -> task coverage status -> planning-only signal`

### Ροή συνεργάτη

`Partner token -> portal -> calendar / tasks -> execution popups -> submit -> αποτέλεσμα`

### Ροή QR / execution proof

`Partner enters property -> QR scan -> session open -> execution -> submit -> session close -> duration / proof`

---

## Λογική λιστών εκτέλεσης

Κάθε εργασία μπορεί να χρησιμοποιεί ξεχωριστά execution ενότητες που συνδέονται με το ακίνητο.

Η κλειδωμένη κατεύθυνση του OPS υποστηρίζει διακριτές ενότητες όπως:

- λίστα καθαριότητας
- λίστα αναλωσίμων
- λίστα βλαβών / ζημιών

Κεντρική αρχή:

Οι λίστες ενεργοποιούνται και ορίζονται **ανά ακίνητο**, ενώ η εργασία μπορεί να στείλει execution-level εκδοχές χωρίς να αντικαθιστά την κύρια αλήθεια του ακινήτου.

---

## Αναλώσιμα, βλάβες, ζημιές και τεκμηρίωση

Το OPS δεν αφορά μόνο καθαριότητα.
Ο πυρήνας του συστήματος καλύπτει συνολική επιχειρησιακή εικόνα ακινήτου, συμπεριλαμβανομένων:

- καθαριότητας
- αναλωσίμων
- ζημιών
- βλαβών
- παρατηρήσεων εκτέλεσης
- φωτογραφικής τεκμηρίωσης
- conditions που επηρεάζουν readiness

### Αναλώσιμα

Το σύστημα πρέπει να κρατά:

- current stock / κατάσταση
- ποσότητα που βρέθηκε
- ποσότητα που συμπληρώθηκε
- τελική κατάσταση μετά από πλήρωση
- consumption history
- replenishment history

#### Κανόνας readiness
Τα αναλώσιμα επηρεάζουν readiness μόνο για το **active readiness target**.

#### Κανόνας διαχείρισης
Αν η πλήρωση δεν γίνει από τον συνεργάτη, ο διαχειριστής πρέπει να μπορεί να ενημερώσει χειροκίνητα το σύστημα ότι έγινε με άλλο τρόπο.

#### Κανόνας στατιστικών
Το σύστημα πρέπει να υποστηρίζει dedicated στατιστική εικόνα κατανάλωσης αναλωσίμων.

### Ζημιές / βλάβες / conditions

Μπορούν να δηλώνονται από:
- συνεργάτη
- διαχειριστή
- εσωτερικές ροές

#### Κανόνας closure
Το κλείσιμο θέματος δεν πρέπει να γίνεται αυτόματα από απλή δήλωση συνεργάτη.
Η τελική αλλαγή `resolved` / `dismissed` πρέπει να ελέγχεται από manager action.

#### Κανόνας readiness
Οι ανοιχτές readiness-relevant ζημιές / βλάβες / conditions επηρεάζουν μόνο το **active readiness target**.

---

## QR παρουσία / work session / execution proof

Το QR δεν πρέπει να είναι απλό βοηθητικό feature.

Πρέπει να γίνει μηχανισμός:

- απόδειξης παρουσίας
- απόδειξης έναρξης εργασίας
- μέτρησης χρόνου εργασίας
- σύνδεσης task / partner / property / execution proof

Η λογική είναι:

1. Ο συνεργάτης μπαίνει στο ακίνητο
2. Σκανάρει QR
3. Ανοίγει work session
4. Καταγράφεται ώρα έναρξης
5. Εκτελεί την εργασία
6. Υποβάλλει τις απαιτούμενες λίστες
7. Κλείνει η εργασία / work session
8. Καταγράφεται διάρκεια

---

## Πολυγλωσσικότητα

Το OPS υλοποιείται ως πολυγλωσσικό σύστημα.

Τρέχουσες ενεργές γλώσσες:

- Ελληνικά
- Αγγλικά

Η πολυγλωσσική λογική πρέπει να είναι κεντρική και επεκτάσιμη, όχι αποσπασματική ανά σελίδα.

---

## SaaS μοντέλο και ρόλοι

Το OPS είναι SaaS πολλών οργανισμών με ρόλους.

### System roles

- `SUPER_ADMIN`
- `USER`

### Organization roles

- `ORG_ADMIN`
- `MANAGER`
- `PARTNER`

Γενική αρχή:

- ο υπερδιαχειριστής έχει καθολική ορατότητα / διαχείριση
- ο οργανωσιακός διαχειριστής και ο manager διαχειρίζονται την επιχειρησιακή ροή
- ο συνεργάτης εκτελεί μέσω partner portal και token-based πρόσβασης

---

## Partner portal

Το partner portal είναι ξεχωριστή επιχειρησιακή επιφάνεια του προϊόντος.
Δεν είναι βοηθητικό demo layer.

Η κλειδωμένη αρχιτεκτονική κατεύθυνση είναι δημόσιο portal χωρίς κλασικό login, με token-based πρόσβαση και execution flow που παραμένει ευθυγραμμισμένο με την backend αλήθεια.

Πρέπει να παραμένει ευθυγραμμισμένο με:

- task truth
- checklist proof
- supply proof
- QR work-session proof
- backend readiness logic

---

## Κρίσιμες τεχνικές αρχές ανάπτυξης

- schema και backend πριν από UI
- μία αλλαγή τη φορά στα κρίσιμα σημεία
- όχι σιωπηλές αρχιτεκτονικές αλλαγές
- όχι δεύτερος business engine μέσα στο UI
- όχι παλιά παράλληλη λογική που συνεχίζει να ζει μετά από refactor
- οι mock / dev παρακάμψεις δεν πρέπει να επιβιώνουν σε production-critical ροές
- το readiness verdict δεν πρέπει να ξαναπαράγεται στο page layer
- το planning layer δεν πρέπει να χτίζεται πρόχειρα μέσα στην οθόνη

---

## Βασική δομή συστήματος

## Πυρήνας δεδομένων

- `prisma/schema.prisma`

## Auth / access

- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`

## Readiness / operational core

- `lib/readiness/compute-property-readiness.ts`
- `lib/readiness/property-condition-rules.ts`
- `lib/readiness/property-condition-mappers.ts`
- `lib/readiness/refresh-property-readiness.ts`
- `lib/readiness/property-operational-status.ts`
- `lib/properties/readiness-snapshot.ts`
- `lib/properties/property-calendar.ts`

## Κύρια API επίπεδα

- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/properties/[id]/readiness/route.ts`
- `app/api/properties/[id]/conditions/route.ts`
- `app/api/property-conditions/[conditionId]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[taskId]/route.ts`
- `app/api/bookings/route.ts`

## Dashboard UI

- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`
- `app/(dashboard)/properties/[id]/tasks/page.tsx`
- `app/(dashboard)/tasks/[taskId]/page.tsx`
- `app/(dashboard)/property-checklists/[propertyId]/page.tsx`

## Partner portal

- `app/partner/[token]/page.tsx`
- `app/partner/[token]/calendar`
- `app/partner/[token]/tasks/[taskId]`

---

## Κρίσιμα αρχεία πυρήνα

Τα παρακάτω θεωρούνται κρίσιμα αρχεία πυρήνα και δεν πρέπει να αλλάζουν πρόχειρα:

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

---

## Κανόνες ασφαλούς αλλαγής

### Επιτρέπονται εύκολα

- μικρές βελτιώσεις παρουσίασης
- labels
- formatters
- μικρές πολυγλωσσικές βελτιώσεις

### Θέλουν προσοχή

- property routes
- booking routes
- task routes
- readiness calculation
- calendar helper outputs
- portal responses
- condition handling
- supply projections

### Θέλουν αυστηρό έλεγχο

- schema
- auth
- route access
- readiness core rules
- active readiness target logic
- σχέσεις Property / Booking / Task / Condition / Supply
- QR work-session logic
- manager-controlled closure logic

---

## Τεκμηρίωση αποθετηρίου

Το `README.md` είναι η σύντομη πύλη κατανόησης του συστήματος.

Για βαθύτερη τεκμηρίωση χρησιμοποίησε και τα:

- `OPS_SYSTEM_MAP.md`
- `OPS_OPEN_TECHNICAL_TOPICS.md`

---

## Τρέχουσα στρατηγική εξέλιξης

Η σωστή κατεύθυνση για το OPS είναι:

1. ενοποίηση auth / access παντού
2. ενοποίηση readiness ως μοναδική backend αλήθεια
3. υλοποίηση του active readiness target ως canonical rule
4. διαχωρισμός readiness layer vs planning layer
5. σταθερή παραγωγή conditions από execution flows
6. μεταφορά domain λογικής έξω από route files όπου χρειάζεται
7. διάσπαση βαριών οθονών χωρίς απώλεια επιχειρησιακής συνοχής
8. προσθήκη QR work-session proof layer
9. ολοκλήρωση supply consumption / replenishment / statistics flow
10. τεκμηρίωση που παραμένει ευθυγραμμισμένη με τον κλειδωμένο πυρήνα

---

## Τοπική εκτέλεση

### Προαπαιτούμενα

- Node.js
- npm
- PostgreSQL
- μεταβλητές περιβάλλοντος για βάση, auth και mail όπου χρειάζεται

### Εγκατάσταση

```bash
npm install