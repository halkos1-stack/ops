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

### Γιατί είναι σημαντικό
Αν το UI και ο backend πυρήνας συνεχίσουν να υπολογίζουν readiness παράλληλα, υπάρχει κίνδυνος:
- διαφορετικών readiness αποτελεσμάτων
- ασυνεπών counters
- λάθος operational signals

### Σωστή κατεύθυνση
- μία backend αλήθεια readiness
- το UI να καταναλώνει readiness state / readiness explanation / readiness counters
- σταδιακή αφαίρεση duplicated readiness derivation από το UI

### Προτεραιότητα
ΠΟΛΥ ΥΨΗΛΗ

---

## TOPIC 03 — Καθαρισμός του `app/api/tasks/route.ts`

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

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 04 — Καθαρισμός του `app/api/bookings/route.ts`

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

### Προτεραιότητα
ΜΕΣΑΙΑ ΠΡΟΣ ΥΨΗΛΗ

---

## TOPIC 05 — Διάσπαση των μεγάλων property pages

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
- αφαίρεση duplicated logic όπου γίνεται

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 06 — Route layer vs domain layer separation

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

## TOPIC 07 — Τεκμηρίωση συστήματος

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Το repo δεν έχει ακόμα ώριμη system-level τεκμηρίωση.

### Τρέχουσα εικόνα
Το README πρέπει να αναβαθμιστεί.
Χρειάζεται και μόνιμο system map και μόνιμη λίστα open technical topics.

### Γιατί είναι σημαντικό
Χωρίς αυτά:
- χάνεται η συνοχή
- αυξάνεται το κόστος κατανόησης
- οι αλλαγές γίνονται πιο αποσπασματικά
- τα AI εργαλεία δυσκολεύονται να σεβαστούν τον πυρήνα

### Σωστή κατεύθυνση
- αναβάθμιση `README.md`
- διατήρηση `OPS_SYSTEM_MAP.md`
- διατήρηση `OPS_OPEN_TECHNICAL_TOPICS.md`

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 08 — Παρακολούθηση readiness snapshot refresh coverage

### Κατάσταση
ΑΝΟΙΧΤΟ

### Περιγραφή
Έχει επιβεβαιωθεί readiness refresh μετά από δημιουργία property.
Δεν έχει ακόμα επιβεβαιωθεί από τη συνολική χαρτογράφηση ότι το readiness snapshot ανανεώνεται σε όλα τα κατάλληλα σημεία αλλαγής επιχειρησιακής κατάστασης.

### Ενδεικτικά triggers που πρέπει να ελεγχθούν
- αλλαγή task status
- νέα / κλειστή issue
- αλλαγή supplies κατάστασης
- αλλαγή booking / check-in pressure
- completion checklist / supply run
- partner execution events

### Γιατί είναι σημαντικό
Αν το readiness snapshot δεν ανανεώνεται συστηματικά στα σωστά triggers, η αποθηκευμένη readiness ένδειξη θα μένει πίσω από την πραγματικότητα.

### Σωστή κατεύθυνση
- χαρτογράφηση όλων των readiness update triggers
- κεντρικός κανόνας refresh
- ελαχιστοποίηση “ξεχασμένων” pathways

### Προτεραιότητα
ΥΨΗΛΗ

---

## TOPIC 09 — Παραγωγική σκλήρυνση του partner portal

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

### Γιατί είναι σημαντικό
Το portal είναι εξωτερικό operational surface.
Οτιδήποτε λάθος εδώ επηρεάζει άμεσα την πραγματική εκτέλεση εργασιών.

### Σωστή κατεύθυνση
- να αντιμετωπίζεται σαν ξεχωριστό product surface
- να μην αλλάζει πρόχειρα
- να ελέγχεται πάντα μαζί με backend states

### Προτεραιότητα
ΜΕΣΑΙΑ ΠΡΟΣ ΥΨΗΛΗ

---

## TOPIC 10 — Ενιαία ορολογία και σταθερό naming

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
- task state terms
- issue / damage distinction
- supply shortage vs critical blocker distinction

### Προτεραιότητα
ΜΕΣΑΙΑ

---

## 3. Μη άμεσα τεχνικά θέματα αλλά σημαντικά

Τα παρακάτω δεν είναι πρώτα στην ουρά, αλλά πρέπει να παρακολουθούνται:

- μείωση βάρους responses στα property endpoints όπου χρειάζεται
- καλύτερος διαχωρισμός projections ανά οθόνη
- πιθανή ενίσχυση testing γύρω από critical flows
- καλύτερη release discipline
- αναβάθμιση του κύριου README

---

## 4. Προτεινόμενη σειρά αντιμετώπισης

### Φάση 1
1. Auth / access cleanup
2. Readiness unification
3. Readiness refresh coverage audit

### Φάση 2
4. Tasks route cleanup
5. Bookings route cleanup
6. Property pages refactor

### Φάση 3
7. Partner portal hardening
8. Documentation hardening
9. Terminology cleanup

---

## 5. Κανόνας ανανέωσης αυτού του αρχείου

Το αρχείο αυτό πρέπει να ενημερώνεται όταν:

- κλείνει ένα από τα βασικά topics
- ανοίγει νέο αρχιτεκτονικό μέτωπο
- εντοπίζεται νέο production risk
- αλλάζει η readiness στρατηγική
- αλλάζει η στρατηγική auth/access
- αλλάζει ο τρόπος partner execution

---

## 6. Τι σημαίνει “κλειστό θέμα”

Ένα θέμα θεωρείται κλειστό μόνο όταν ισχύουν και τα τρία:

1. έχει εφαρμοστεί τεχνικά η σωστή λύση
2. η λύση είναι συνεπής με το OPS_SYSTEM_MAP
3. δεν υπάρχει παράλληλη παλιά λογική που συνεχίζει να ζει στο σύστημα