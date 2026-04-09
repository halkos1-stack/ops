# OPS

## Τι είναι το OPS

Το OPS είναι πολυοργανωσιακό SaaS λειτουργικής διαχείρισης ακινήτων με πυρήνα την **επιχειρησιακή ετοιμότητα ακινήτου πριν το επόμενο check-in**.

Δεν είναι γενικό εργαλείο “property management”.
Δεν είναι απλό task tracker.
Δεν είναι ημερολόγιο κρατήσεων που παράγει αυτόματα επιχειρησιακή αλήθεια.

Ο πυρήνας του OPS είναι:

- το **ακίνητο** ως κέντρο επιχειρησιακής αλήθειας
- η **readiness-first** λογική πριν το επόμενο check-in
- η **απόδειξη** κατάστασης και όχι η απλή δήλωση
- η **ελεγχόμενη ροή** από κράτηση σε εργασία
- η εκτέλεση μέσω συνεργάτη με λίστες, συμβάντα και τεκμηρίωση

---

## Τι σημαίνει readiness στο OPS

Στο OPS το readiness δεν σημαίνει απλώς ότι υπάρχει διαθεσιμότητα στο ημερολόγιο.

**Readiness != Availability**

Ένα ακίνητο θεωρείται έτοιμο όταν, με βάση τα πραγματικά ανοιχτά δεδομένα του συστήματος, δεν υπάρχουν εκκρεμότητες που το μπλοκάρουν για το επόμενο check-in.

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

---

## Κύριες επιχειρησιακές ροές

### Ροή κρατήσεων

`Booking -> αντιστοίχιση με ακίνητο -> operational window -> ελεγχόμενη απόφαση διαχειριστή -> task coverage -> readiness impact`

Σημαντική κλειδωμένη αρχή:

Οι πλατφόρμες κρατήσεων είναι **πηγές εισόδου κρατήσεων** και όχι πηγές αυτόματης επιχειρησιακής αλήθειας.

Νέα κράτηση **δεν** πρέπει να ενημερώνει πρόχειρα υπάρχουσα ενεργή εργασία άλλου check-out.

### Ροή εργασίας

`Task -> assignment -> partner portal -> execution lists -> submit -> conditions / readiness impact`

### Ροή readiness

`Open tasks + open conditions + critical supplies + alerts + next check-in pressure -> backend readiness snapshot`

### Ροή συνεργάτη

`Partner token -> portal -> calendar / tasks -> execution popups -> submit -> αποτέλεσμα`

---

## Λογική λιστών εκτέλεσης

Κάθε εργασία μπορεί να χρησιμοποιεί ξεχωριστά execution ενότητες που συνδέονται με το ακίνητο.

Η τρέχουσα κλειδωμένη κατεύθυνση είναι ότι το OPS υποστηρίζει διακριτές ενότητες όπως:

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

---

## Κρίσιμες τεχνικές αρχές ανάπτυξης

- schema και backend πριν από UI
- μία αλλαγή τη φορά στα κρίσιμα σημεία
- όχι σιωπηλές αρχιτεκτονικές αλλαγές
- όχι δεύτερος business engine μέσα στο UI
- όχι παλιά παράλληλη λογική που συνεχίζει να ζει μετά από refactor
- οι mock / dev παρακάμψεις δεν πρέπει να επιβιώνουν σε production-critical ροές

---

## Βασική δομή συστήματος

## Πυρήνας δεδομένων

- `prisma/schema.prisma`

## Auth / access

- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`

## Readiness

- `lib/readiness/compute-property-readiness.ts`
- `lib/readiness/property-condition-rules.ts`
- `lib/readiness/property-condition-mappers.ts`
- `lib/readiness/refresh-property-readiness.ts`
- `lib/properties/readiness-snapshot.ts`

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
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
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
- portal responses

### Θέλουν αυστηρό έλεγχο

- schema
- auth
- route access
- readiness core rules
- σχέσεις Property / Booking / Task / Condition / Supply

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
3. σταθερή παραγωγή conditions από execution flows
4. μεταφορά domain λογικής έξω από route files όπου χρειάζεται
5. διάσπαση βαριών οθονών χωρίς απώλεια επιχειρησιακής συνοχής
6. τεκμηρίωση που παραμένει ευθυγραμμισμένη με τον κλειδωμένο πυρήνα

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
```

### Ανάπτυξη

```bash
npm run dev
```

### Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

---

## Κανόνας συνεργασίας για αλλαγές στον πυρήνα

Στον πυρήνα του OPS κάθε σοβαρή αλλαγή πρέπει να ελέγχεται απέναντι στις κλειδωμένες αρχές του συστήματος:

- property as readiness hub
- task as execution layer
- proof over declaration
- blocking where required
- explainable / non-silent history
- readiness-first before next arrival

Αν μια αλλαγή παραβιάζει κάποιο από αυτά, δεν θεωρείται ασφαλής αλλαγή για το OPS.
