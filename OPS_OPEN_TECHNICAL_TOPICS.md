# OPS OPEN TECHNICAL TOPICS

## Σκοπός του αρχείου

Το αρχείο αυτό κρατά τα ενεργά τεχνικά θέματα, μεταβατικά σημεία και αρχιτεκτονικά ανοικτά μέτωπα του OPS.

Δεν είναι backlog προϊόντος.  
Δεν είναι λίστα ιδεών.  
Είναι λίστα τεχνικών και αρχιτεκτονικών ζητημάτων που επηρεάζουν τη σωστή εξέλιξη του συστήματος.

---

## 1. Κανόνας χρήσης

Για κάθε θέμα πρέπει να είναι καθαρό:

- τι ακριβώς είναι
- γιατί είναι σημαντικό
- ποιο επίπεδο του συστήματος επηρεάζει
- ποια είναι η σωστή κατεύθυνση
- αν είναι άμεση προτεραιότητα ή όχι

---

## 2. Ενεργά ανοιχτά τεχνικά θέματα

## TOPIC 01 — Ενοποίηση auth / access σε όλα τα app routes

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το OPS διαθέτει ήδη σωστότερο κεντρικό επίπεδο πρόσβασης μέσω:
- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`

Ωστόσο δεν έχει περαστεί ακόμα με πλήρη συνέπεια σε όλα τα routes.

### Επιβεβαιωμένο σύμπτωμα
Το `app/api/tasks/route.ts` χρησιμοποιεί ακόμα mock auth pattern αντί για πλήρη κεντρική πρόσβαση.

### Γιατί είναι σημαντικό
Αυτό δημιουργεί ασυνέπεια σε:
- tenant isolation
- role access
- αξιοπιστία route behavior
- production hardening

### Σωστή κατεύθυνση
- πλήρης αντικατάσταση mock auth λογικής
- ένα ενιαίο μοντέλο auth/access για όλα τα admin routes
- καμία εξάρτηση από custom headers ως production αλήθεια

### Προτεραιότητα
ΠΟΛΥ ΥΨΗΛΗ

---

## TOPIC 02 — Ενοποίηση readiness σε μία backend αλήθεια

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Στο σύστημα υπάρχει readiness snapshot backend λογική, αλλά readiness παράγωγη λογική υπάρχει και στο UI.

### Επιβεβαιωμένα σημεία
- backend readiness snapshot: `lib/properties/readiness-snapshot.ts`
- readiness derivation και στο property UI / properties list UI
- shared readiness/helpers: `lib/readiness/*`
- shared calendar snapshot logic: `lib/properties/property-calendar.ts`

### Γιατί είναι σημαντικό
Αν το UI και ο backend πυρήνας συνεχίσουν να υπολογίζουν readiness παράλληλα, υπάρχει κίνδυνος:
- διαφορετικών readiness αποτελεσμάτων
- ασυνεπών counters
- λάθος operational signals
- λάθος χρωμάτων / labels σε σελίδα ακινήτου και σελίδα ακινήτων

### Σωστή κατεύθυνση
- μία backend αλήθεια readiness
- το UI να καταναλώνει readiness state / readiness explanation / readiness counters
- σταδιακή αφαίρεση duplicated readiness derivation από το UI
- το ημερολόγιο να καταναλώνει canonical readiness/planning outputs και όχι να ξαναβγάζει δικούς του επιχειρησιακούς κανόνες

### Προτεραιότητα
ΠΟΛΥ ΥΨΗΛΗ

---

## TOPIC 03 — Active Readiness Target: μόνο το επόμενο check-in από σήμερα

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Η readiness στρατηγική του OPS πρέπει να κλειδώσει τεχνικά σε ένα και μόνο κύριο target:
το αμέσως επόμενο check-in από σήμερα.

Αυτό σημαίνει ότι:
- το readiness verdict αφορά μόνο αυτό το check-in
- τα μεταγενέστερα check-in δεν πρέπει να εμφανίζονται με το ίδιο readiness βάρος
- τα μεταγενέστερα check-in ανήκουν σε planning layer και όχι σε κύριο readiness layer

### Γιατί είναι σημαντικό
Αν όλα τα future check-in συνεχίσουν να παίρνουν το ίδιο alert ή το ίδιο readiness χρώμα:
- ο διαχειριστής χάνει την κύρια επιχειρησιακή προτεραιότητα
- το ημερολόγιο δίνει θολό signal
- το UI παραβιάζει την readiness-first λογική του πυρήνα

### Σωστή κατεύθυνση
- προσθήκη canonical έννοιας `Active Readiness Target`
- readiness verdict μόνο για το αμέσως επόμενο check-in
- future check-ins = planning visibility only
- σαφές backend output για:
  - active target
  - planning targets
  - explainable readiness vs planning state

### Προτεραιότητα
ΠΟΛΥ ΥΨΗΛΗ

---

## TOPIC 04 — Διάκριση readiness layer vs planning layer στο ημερολόγιο ακινήτου

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Η σελίδα ακινήτου προβάλλει το ακίνητο μέσα στον χρόνο.  
Όμως δεν πρέπει όλες οι μελλοντικές αφίξεις να δείχνονται σαν να είναι το ίδιο readiness concern.

Πρέπει να υπάρξει καθαρός τεχνικός διαχωρισμός:
- **readiness layer** για το αμέσως επόμενο check-in
- **planning layer** για όλα τα μεταγενέστερα check-in

### Γιατί είναι σημαντικό
Χωρίς αυτόν τον διαχωρισμό:
- τα χρώματα στο ημερολόγιο παραπλανούν
- τα hover μηνύματα δεν είναι explainable
- δεν ξεχωρίζει η σημερινή επιχειρησιακή προτεραιότητα από τη μελλοντική προετοιμασία

### Σωστή κατεύθυνση
- κύριο readiness χρώμα μόνο στο active target
- διαφορετικό planning χρώμα στα μεταγενέστερα check-in
- hover στα μεταγενέστερα check-in που να λέει:
  - αν υπάρχει ή όχι covering εργασία
  - ποιο checkout συνδέεται με αυτή την άφιξη
  - ποια είναι σήμερα η κατάσταση της σχετικής εργασίας
  - ότι αυτό δεν είναι το τρέχον readiness target

### Προτεραιότητα
ΠΟΛΥ ΥΨΗΛΗ

---

## TOPIC 05 — Καθαρισμός και ενοποίηση των property calendar helpers

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το `lib/properties/property-calendar.ts` έχει ήδη γίνει σημαντικό shared layer για daily/property snapshots.
Όμως πρέπει να εξελιχθεί από “ημερήσιο snapshot helper” σε canonical projection helper ευθυγραμμισμένο με:
- active readiness target
- planning-only future arrivals
- κοινή task classification
- κοινή issue/supply impact λογική

### Γιατί είναι σημαντικό
Αν το ημερολόγιο παραμείνει μισό UI helper και μισό business layer:
- θα ξαναγεννηθεί δεύτερος business engine
- θα μείνει διπλή λογική για task impact / issue impact / supply impact
- θα δυσκολεύει ο καθαρός έλεγχος readiness behavior

### Σωστή κατεύθυνση
- `buildPropertyCalendarDaySnapshot()` να καταναλώνει canonical backend-like inputs
- να αποδίδει:
  - active readiness target info
  - planning state
  - linked turnover task
  - relevant supply impact
  - relevant issue impact
- να μη διαχέει το ίδιο urgency σε όλα τα future days

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 06 — Διάκριση turnover εργασιών vs in-stay εργασιών

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Οι εργασίες δεν έχουν όλες την ίδια readiness σημασία.

Πρέπει να ξεχωρίσουν καθαρά:
- turnover εργασίες
- in-stay εργασίες
- λοιπές χειροκίνητες / ειδικές εργασίες

### Γιατί είναι σημαντικό
Οι in-stay εργασίες:
- πρέπει να δημιουργούνται
- πρέπει να εκτελούνται
- πρέπει να ενημερώνουν συνεργάτη και ιστορικό

αλλά δεν πρέπει να επηρεάζουν readiness για το επόμενο check-in.

### Σωστή κατεύθυνση
- μόνο το task που καλύπτει το turnover window του active target να επηρεάζει readiness
- future turnover tasks για μεταγενέστερα check-in να επηρεάζουν μόνο planning state
- in-stay tasks = execution only, όχι readiness input

### Προτεραιότητα
ΠΟΛΥ ΥΨΗΛΗ

---

## TOPIC 07 — Παρακολούθηση readiness snapshot refresh coverage

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Έχει επιβεβαιωθεί readiness refresh μετά από ορισμένα σημεία αλλαγής, αλλά δεν έχει κλειδώσει ακόμα πλήρης κανόνας refresh σε όλα τα επιχειρησιακά triggers.

### Ενδεικτικά triggers που πρέπει να ελεγχθούν
- αλλαγή task status
- αλλαγή assignment status
- νέα / κλειστή issue ή condition
- αλλαγή supplies κατάστασης
- αλλαγή booking / επόμενου check-in pressure
- completion checklist / supply run
- partner execution events
- work-session start / close όταν προστεθεί QR presence flow

### Γιατί είναι σημαντικό
Αν το readiness snapshot δεν ανανεώνεται συστηματικά στα σωστά triggers:
- η αποθηκευμένη readiness ένδειξη θα μένει πίσω από την πραγματικότητα
- το UI θα καταναλώνει stale readiness state
- οι explainable αποφάσεις θα χάσουν αξιοπιστία

### Σωστή κατεύθυνση
- χαρτογράφηση όλων των readiness update triggers
- ένας canonical refresh κανόνας
- καμία ad-hoc readiness εγγραφή από route που παρακάμπτει τον canonical refresh helper

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 08 — Καθαρισμός του `app/api/tasks/route.ts`

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το tasks route είναι λειτουργικά δυνατό, αλλά κουβαλά:
- validations
- checklist επιλογή
- supply run sync
- task creation rules
- mock auth access pattern

### Γιατί είναι σημαντικό
Το route έχει γίνει ταυτόχρονα:
- access layer
- validation layer
- orchestration layer
- domain logic layer

Αυτό δυσκολεύει:
- testing
- συντήρηση
- καθαρή επέκταση
- consistency με τα υπόλοιπα routes

### Σωστή κατεύθυνση
- cleanup auth
- εξαγωγή domain logic σε `lib/...`
- λεπτότερο route file
- διατήρηση ίδιας λειτουργίας με καθαρότερη αρχιτεκτονική
- σύνδεση με canonical task classification (turnover / in-stay / planning)

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 09 — Καθαρισμός του `app/api/bookings/route.ts`

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το bookings route έχει πλούσια λογική για:
- filtering
- tenant scoping
- next check-in derivation
- operational work window
- task coverage status

### Γιατί είναι σημαντικό
Το route είναι χρήσιμο αλλά κινδυνεύει να γίνει υπερβολικά “έξυπνο” και δύσκολο στη συντήρηση.

### Σωστή κατεύθυνση
- διατήρηση business behavior
- σταδιακή εξαγωγή derived operational logic σε domain helpers / services
- πιο καθαρός διαχωρισμός between query / normalize / enrich
- canonical helper για previous checkout / next check-in / turnover window

### Προτεραιότητα
ΜΕΣΑΙΑ ΠΡΟΣ ΥΨΗΛΗ

---

## TOPIC 10 — Διάσπαση των μεγάλων property pages

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Οι οθόνες:
- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`

κρατούν πολλή λογική μαζί:
- helpers
- counters
- readiness derivations
- filters
- UI state
- modals
- formatters
- data transformations

### Γιατί είναι σημαντικό
Αυτό αυξάνει:
- τεχνικό χρέος
- δυσκολία debugging
- κίνδυνο regressions
- δυσκολία επαναχρησιμοποίησης

### Σωστή κατεύθυνση
- extraction σε components
- extraction σε hooks
- extraction σε selectors / formatters
- extraction σε shared calendar selectors
- αφαίρεση duplicated logic όπου γίνεται
- η detail page να πάψει να ξαναχτίζει δεύτερο business engine

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 11 — Route layer vs domain layer separation

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Σε αρκετά routes το business logic ζει ακόμα μέσα στο route file.

### Γιατί είναι σημαντικό
Το OPS μεγαλώνει.
Όσο το business logic μένει σε route files:
- τόσο δυσκολεύει το testing
- τόσο δυσκολεύει η επαναχρησιμοποίηση
- τόσο πιο επικίνδυνο γίνεται κάθε refactor

### Σωστή κατεύθυνση
Να διαχωριστούν σταδιακά:
- access
- request parsing
- validation
- domain orchestration
- persistence
- response shaping

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 12 — QR presence / work-session layer

### Κατάσταση
ΝΕΟ ΑΝΟΙΧΤΟ

### Περιγραφή
Στο σύστημα υπάρχουν ήδη QR-related entities για property supplies, αλλά δεν υπάρχει ακόμα canonical layer για:
- είσοδο συνεργάτη στο ακίνητο
- έναρξη εργασίας
- παρουσία
- διάρκεια εργασίας
- κλείσιμο work session

### Γιατί είναι σημαντικό
Το QR δεν πρέπει να είναι απλό βοηθητικό feature.
Πρέπει να γίνει μηχανισμός:
- απόδειξης παρουσίας
- απόδειξης έναρξης
- μέτρησης χρόνου εργασίας
- σύνδεσης task / partner / property / execution proof

### Σωστή κατεύθυνση
- νέο helper/domain layer για work sessions
- QR scan → session open
- checklist/supply submit ή explicit completion → session close
- canonical outputs:
  - startedAt
  - closedAt
  - durationMinutes
  - presenceVerified
  - closedReason

### Προτεραιότητα
ΜΕΣΑΙΑ ΠΡΟΣ ΥΨΗΛΗ

---

## TOPIC 13 — Αναλώσιμα: κατανάλωση, πλήρωση, readiness impact, statistics

### Κατάσταση
ΝΕΟ ΑΝΟΙΧΤΟ

### Περιγραφή
Το σύστημα έχει ήδη:
- property supply layer
- consumption entities
- QR supply entities

Αυτό όμως δεν έχει ακόμα κλειδώσει πλήρως σαν ενιαία ροή:
- δήλωση ποσότητας που βρέθηκε
- δήλωση ποσότητας που συμπληρώθηκε
- τελική κατάσταση μετά από πλήρωση
- readiness impact μόνο για το active target
- dedicated στατιστική κατανάλωσης

### Γιατί είναι σημαντικό
Χωρίς αυτό:
- τα αναλώσιμα θα μείνουν ημιτελές readiness input
- δεν θα υπάρχει καθαρή εικόνα πραγματικής κατανάλωσης
- ο manager δεν θα μπορεί να ενημερώνει σωστά εξωσυστημικές πληρώσεις

### Σωστή κατεύθυνση
- canonical supply state στο property layer
- readiness impact μόνο για το active target
- manual manager correction path όταν η πλήρωση γίνεται εκτός partner flow
- dedicated consumption statistics page
- ξεκάθαρη διάκριση ανάμεσα σε:
  - current stock
  - replenishment
  - consumption
  - readiness shortage impact

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 14 — Ζημιές / βλάβες / conditions: manager-controlled closure

### Κατάσταση
ΝΕΟ ΑΝΟΙΧΤΟ

### Περιγραφή
Η δήλωση ζημιάς ή βλάβης μπορεί να έρχεται από συνεργάτη ή εσωτερική ροή.
Όμως το κλείσιμο του θέματος δεν πρέπει να γίνεται αυτόματα από δήλωση συνεργάτη.

### Γιατί είναι σημαντικό
Το OPS είναι proof-first readiness system.
Αν το θέμα κλείνει αυτόματα:
- χάνεται η διαχειριστική επιχειρησιακή απόφαση
- μειώνεται η αξιοπιστία readiness truth
- θολώνει η έννοια blocking / resolved / dismissed

### Σωστή κατεύθυνση
- ο συνεργάτης μπορεί να δηλώνει
- ο manager μπορεί να στέλνει φόρμα ή follow-up σε κατάλληλο συνεργάτη
- το θέμα μπορεί να επιλυθεί και εκτός συστήματος
- το κλείσιμο / resolved / dismissed γίνεται μόνο χειροκίνητα από manager
- από τη σελίδα ακινήτου να υπάρχει dedicated είσοδος προς page διαχείρισης ζημιών/βλαβών

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 15 — Παραγωγική σκλήρυνση του partner portal

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το partner portal υπάρχει και είναι λειτουργικό, αλλά πρέπει να θεωρείται ξεχωριστή κρίσιμη ενότητα προϊόντος.

### Περιοχές που θέλουν συνεχές έλεγχο
- token lifecycle
- token revocation
- token expiry behavior
- access scope correctness
- language consistency
- task state consistency
- execution journey consistency
- alignment με QR work-session layer
- alignment με task proof / checklist proof / supply proof

### Γιατί είναι σημαντικό
Το portal είναι εξωτερικό operational surface.
Οτιδήποτε λάθος εδώ επηρεάζει άμεσα την πραγματική εκτέλεση εργασιών.

### Σωστή κατεύθυνση
- να αντιμετωπίζεται σαν ξεχωριστό product surface
- να μην αλλάζει πρόχειρα
- να ελέγχεται πάντα μαζί με backend states
- να μένει ευθυγραμμισμένο με το ίδιο readiness / task truth που βλέπει και το admin side

### Προτεραιότητα
ΜΕΣΑΙΑ ΠΡΟΣ ΥΨΗΛΗ

---

## TOPIC 16 — Τεκμηρίωση συστήματος

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το repo έχει ήδη καλύτερη τεκμηρίωση από πριν, αλλά πρέπει να συνεχίσει να συντηρεί system-level docs που να ακολουθούν τις νέες readiness αποφάσεις.

### Τρέχουσα εικόνα
Υπάρχουν:
- `README.md`
- `OPS_SYSTEM_MAP.md`
- `OPS_OPEN_TECHNICAL_TOPICS.md`

Όμως τώρα που κλειδώνει η νέα λογική active readiness target / planning layer / QR work session / manager-controlled issue closure, τα docs πρέπει να ενημερωθούν σε πλήρη συμφωνία.

### Γιατί είναι σημαντικό
Χωρίς αυτά:
- χάνεται η συνοχή
- αυξάνεται το κόστος κατανόησης
- οι αλλαγές γίνονται πιο αποσπασματικά
- τα AI εργαλεία δυσκολεύονται να σεβαστούν τον πυρήνα

### Σωστή κατεύθυνση
- διατήρηση `README.md`
- διατήρηση `OPS_SYSTEM_MAP.md`
- διατήρηση `OPS_OPEN_TECHNICAL_TOPICS.md`
- προσθήκη κλειδωμένης λογικής property calendar / active target / helper roles στα docs πυρήνα

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 17 — Ενιαία ορολογία και σταθερό naming

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το OPS έχει ήδη αρκετό βάθος και πολυπλοκότητα.
Χρειάζεται ακόμα πιο σκληρή ορολογική πειθαρχία σε:
- schema
- routes
- UI
- docs
- συνεργασία με AI

### Γιατί είναι σημαντικό
Αν διαφορετικά στρώματα μιλάνε για το ίδιο πράγμα με άλλο όνομα, αυξάνει:
- η σύγχυση
- το λάθος mapping
- η δυσκολία debugging
- η πιθανότητα λαθεμένων refactors

### Σωστή κατεύθυνση
- μία canonical ορολογία για κάθε βασική έννοια
- readiness terms
- active readiness target
- planning target
- turnover task vs in-stay task
- issue / damage / condition distinction
- supply shortage vs consumption vs replenishment distinction

### Προτεραιότητα
ΜΕΣΑΙΑ

---

## 3. Μη άμεσα τεχνικά θέματα αλλά σημαντικά

Τα παρακάτω δεν είναι πρώτα στην ουρά, αλλά πρέπει να παρακολουθούνται:

- μείωση βάρους responses στα property endpoints όπου χρειάζεται
- καλύτερος διαχωρισμός projections ανά οθόνη
- πιθανή ενίσχυση testing γύρω από critical flows
- καλύτερη release discipline
- καλύτερη observability στα readiness refreshes
- μελλοντική βελτίωση του reporting γύρω από κατανάλωση αναλωσίμων

---

## 4. Προτεινόμενη σειρά αντιμετώπισης

### Φάση 1
1. Auth / access cleanup
2. Readiness unification
3. Active Readiness Target implementation
4. Calendar readiness vs planning separation
5. Readiness refresh coverage audit

### Φάση 2
6. Turnover vs in-stay task classification
7. Property calendar helper consolidation
8. Tasks route cleanup
9. Bookings route cleanup
10. Property pages refactor

### Φάση 3
11. Supplies consumption / replenishment / statistics flow
12. Damage / issue management flow with manager-only closure
13. QR work-session layer
14. Partner portal hardening
15. Documentation hardening
16. Terminology cleanup

---

## 5. Κανόνας ανανέωσης αυτού του αρχείου

Το αρχείο αυτό πρέπει να ενημερώνεται όταν:

- κλείνει ένα από τα βασικά topics
- ανοίγει νέο αρχιτεκτονικό μέτωπο
- εντοπίζεται νέο production risk
- αλλάζει η readiness στρατηγική
- αλλάζει η στρατηγική auth/access
- αλλάζει ο τρόπος partner execution
- αλλάζει η λογική active readiness target / planning layer
- προστίθεται νέο execution proof μοντέλο όπως QR work session

---

## 6. Τι σημαίνει “κλειστό θέμα”

Ένα θέμα θεωρείται κλειστό μόνο όταν ισχύουν και τα τρία:

1. έχει εφαρμοστεί τεχνικά η σωστή λύση
2. η λύση είναι συνεπής με το OPS_SYSTEM_MAP
3. δεν υπάρχει παράλληλη παλιά λογική που συνεχίζει να ζει στο σύστημα