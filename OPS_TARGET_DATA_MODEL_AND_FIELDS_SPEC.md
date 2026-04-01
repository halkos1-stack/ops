# OPS_TARGET_DATA_MODEL_AND_FIELDS_SPEC.md

## Βασική αρχή
Η συνολική κατάσταση ακινήτου δεν είναι source of truth.
Η readiness κατάσταση είναι derived state.

## Νέα βασικά πεδία στο ΑΚΙΝΗΤΟ
- overallReadinessStatus
- readinessLastCalculatedAt
- nextArrivalAt
- lastReadinessConfirmationAt
- hasQr
- qrToken
- qrEnabled
- requiresQrStart
- requiresQrEnd
- latitude
- longitude
- visitorPageEnabled
- visitorPageSlug

## Dynamic supplies
- trackingMode: status | quantity
- nameEl
- nameEn
- isCritical
- minimumThreshold
- targetLevel
- warningThreshold

## QR events
- scan_entry
- work_start
- work_pause
- work_resume
- work_end
- scan_exit
