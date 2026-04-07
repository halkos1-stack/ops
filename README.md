# OPS

## Τι είναι το OPS

Το OPS είναι πολυοργανωσιακό SaaS λειτουργικής διαχείρισης ακινήτων.

Δεν είναι γενικό εργαλείο “property management”.
Ο πυρήνας του είναι η επιχειρησιακή ετοιμότητα ακινήτου πριν το επόμενο check-in, με κέντρο το ακίνητο και με λειτουργικές ροές γύρω από:

- κρατήσεις
- εργασίες
- συνεργάτες
- λίστες καθαριότητας
- λίστες αναλωσίμων
- ζητήματα / ζημιές / βλάβες
- readiness κατάσταση
- ιστορικό ενεργειών

---

## Βασική αρχή του συστήματος

### Το ακίνητο είναι το operational hub

Το ακίνητο είναι η βασική οντότητα του OPS.
Γύρω από αυτό συνδέονται:

- bookings
- tasks
- issues
- supplies
- templates και runs
- partner execution
- readiness snapshot

### Η εργασία είναι execution layer

Η εργασία εκφράζει εκτέλεση.
Δεν είναι η απόλυτη επιχειρησιακή αλήθεια του ακινήτου.

### Το readiness είναι backend έννοια

Το readiness πρέπει να προκύπτει από backend λογική και όχι από ad-hoc UI υπολογισμούς.

---

## Κύριες δυνατότητες

- Πολυοργανωσιακή αρχιτεκτονική με οργανισμούς και ρόλους
- Διαχείριση ακινήτων
- Διαχείριση κρατήσεων
- Αντιστοίχιση κρατήσεων με ακίνητα
- Δημιουργία και ανάθεση εργασιών
- Portal συνεργάτη με token πρόσβαση
- Checklist runs για καθαριότητα
- Supply runs για αναλώσιμα
- Issues / damages / operational προβλήματα
- Readiness snapshot ανά ακίνητο
- Activity log και events
- Πολυγλωσσική διεπαφή
- QR ροές για αναλώσιμα

---

## Ρόλοι συστήματος

### System roles
- `SUPER_ADMIN`
- `USER`

### Organization roles
- `ORG_ADMIN`
- `MANAGER`
- `PARTNER`

### Γενική λογική πρόσβασης
- `SUPER_ADMIN`: πλήρης ορατότητα / υπερ-διαχείριση
- `ORG_ADMIN`: διαχείριση εφαρμογής στον οργανισμό
- `MANAGER`: επιχειρησιακή διαχείριση οργανισμού
- `PARTNER`: εκτέλεση εργασιών μέσω partner flow / portal

---

## Βασικές επιχειρησιακές ροές

## 1. Ροή κρατήσεων
Booking → αντιστοίχιση με property → operational window → task coverage → readiness impact

## 2. Ροή εργασίας
Task → assignment → partner execution → checklist run / supply run → αποτέλεσμα

## 3. Ροή readiness
Open tasks + open issues + active alerts + critical supply blockers + next check-in pressure → property readiness snapshot

## 4. Ροή portal συνεργάτη
Partner token → dashboard → urgent items → task execution → schedule / calendar / history

---

## Βασική δομή συστήματος

## Πυρήνας δεδομένων
- `prisma/schema.prisma`

## Auth / access
- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`

## Readiness
- `lib/properties/readiness-snapshot.ts`

## API
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/bookings/route.ts`

## Dashboard UI
- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`

## Partner portal
- `app/partner/[token]/page.tsx`

---

## Κρίσιμα αρχεία πυρήνα

Τα παρακάτω θεωρούνται κρίσιμα αρχεία πυρήνα και δεν πρέπει να αλλάζουν πρόχειρα:

- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/auth-options.ts`
- `lib/route-access.ts`
- `lib/properties/readiness-snapshot.ts`
- `app/api/properties/route.ts`
- `app/api/properties/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/bookings/route.ts`

---

## Τρέχουσες αρχιτεκτονικές αρχές

- το property παραμένει το operational hub
- το readiness πρέπει να έχει μία backend αλήθεια
- το UI δεν πρέπει να γίνεται δεύτερος πυρήνας business logic
- οι route handlers δεν πρέπει να μαζεύουν όλο και περισσότερο domain logic
- οι changes στον πυρήνα γίνονται ένα αρχείο τη φορά
- mock / dev bypass λογικές δεν πρέπει να επιβιώνουν σε production-critical ροές

---

## Τρέχουσα κατεύθυνση εξέλιξης

Η σωστή κατεύθυνση για το OPS είναι:

1. ενοποίηση auth / access παντούnpm 
2. ενοποίηση readiness backend λογικής
3. cleanup των route files
4. διάσπαση βαριών property pages
5. σταθερή τεκμηρίωση πυρήνα και ανοιχτών τεχνικών θεμάτων

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