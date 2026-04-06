export type ChecklistProofMode = "none" | "photo" | "comment" | "photo_or_comment";

export type ChecklistFailureState = "pass" | "fail" | "unknown";

export type ChecklistAnswerProofInput = {
  itemType?: string | null;
  isRequired?: boolean | null;
  requiresPhoto?: boolean | null;
  opensIssueOnFail?: boolean | null;
  failureValuesText?: string | null;

  valueBoolean?: boolean | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueSelect?: string | null;
  notes?: string | null;
  photoUrls?: string[] | null;
};

export type ChecklistProofEvaluationResult = {
  hasValue: boolean;
  failureState: ChecklistFailureState;
  requiredProofMode: ChecklistProofMode;
  hasRequiredProof: boolean;
  missingProofReason: string | null;
  canSubmit: boolean;
  answerValueSummary: string | null;
};

export type ChecklistSubmitValidationItem = {
  id: string;
  label: string;
  itemType?: string | null;
  isRequired?: boolean | null;
  requiresPhoto?: boolean | null;
  opensIssueOnFail?: boolean | null;
  failureValuesText?: string | null;
};

export type ChecklistSubmitValidationAnswer = {
  templateItemId: string;
  valueBoolean?: boolean | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueSelect?: string | null;
  notes?: string | null;
  photoUrls?: string[] | null;
};

export type ChecklistSubmitValidationMissingItem = {
  id: string;
  label: string;
  reason?: string;
};

export type ChecklistSubmitValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
      missingItems: ChecklistSubmitValidationMissingItem[];
    };

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeItemType(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeFailureValuesText(value: unknown): string[] {
  const text = toNullableString(value);
  if (!text) return [];

  return text
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function buildChecklistAnswerValueSummary(
  input: ChecklistAnswerProofInput
): string | null {
  if (typeof input.valueBoolean === "boolean") {
    return input.valueBoolean ? "true" : "false";
  }

  if (
    typeof input.valueNumber === "number" &&
    Number.isFinite(input.valueNumber)
  ) {
    return String(input.valueNumber);
  }

  if (toNullableString(input.valueSelect)) {
    return toNullableString(input.valueSelect);
  }

  if (toNullableString(input.valueText)) {
    return toNullableString(input.valueText);
  }

  return null;
}

export function checklistAnswerHasValue(
  input: ChecklistAnswerProofInput
): boolean {
  const itemType = normalizeItemType(input.itemType);

  if (
    itemType === "boolean" ||
    itemType === "yes_no" ||
    itemType === "pass_fail" ||
    itemType === "checkbox"
  ) {
    return typeof input.valueBoolean === "boolean";
  }

  if (itemType === "number" || itemType === "numeric") {
    return (
      typeof input.valueNumber === "number" && Number.isFinite(input.valueNumber)
    );
  }

  if (
    itemType === "select" ||
    itemType === "dropdown" ||
    itemType === "choice" ||
    itemType === "option" ||
    itemType === "options"
  ) {
    return Boolean(toNullableString(input.valueSelect));
  }

  if (itemType === "photo") {
    return normalizePhotoUrls(input.photoUrls).length > 0;
  }

  return Boolean(toNullableString(input.valueText));
}

export function evaluateChecklistFailureState(
  input: ChecklistAnswerProofInput
): ChecklistFailureState {
  if (!checklistAnswerHasValue(input)) {
    return "unknown";
  }

  const itemType = normalizeItemType(input.itemType);
  const failureValues = normalizeFailureValuesText(input.failureValuesText);
  const answerValueSummary = buildChecklistAnswerValueSummary(input);
  const normalizedValue = answerValueSummary?.trim().toLowerCase() ?? null;

  if (
    itemType === "boolean" ||
    itemType === "yes_no" ||
    itemType === "pass_fail" ||
    itemType === "checkbox"
  ) {
    if (input.valueBoolean === false) {
      return "fail";
    }

    if (
      normalizedValue &&
      failureValues.length > 0 &&
      failureValues.includes(normalizedValue)
    ) {
      return "fail";
    }

    return "pass";
  }

  if (normalizedValue && failureValues.length > 0) {
    if (failureValues.includes(normalizedValue)) {
      return "fail";
    }
  }

  if (input.opensIssueOnFail === true) {
    if (
      input.valueBoolean === false ||
      normalizedValue === "fail" ||
      normalizedValue === "failed" ||
      normalizedValue === "no" ||
      normalizedValue === "problem" ||
      normalizedValue === "issue" ||
      normalizedValue === "damage"
    ) {
      return "fail";
    }
  }

  return "pass";
}

export function getRequiredProofModeForChecklistAnswer(
  input: ChecklistAnswerProofInput
): ChecklistProofMode {
  const failureState = evaluateChecklistFailureState(input);

  if (failureState !== "fail") {
    return "none";
  }

  const requiresPhoto = Boolean(input.requiresPhoto);
  const opensIssueOnFail = Boolean(input.opensIssueOnFail);

  if (requiresPhoto) {
    return "photo";
  }

  if (opensIssueOnFail) {
    return "photo_or_comment";
  }

  return "comment";
}

export function checklistAnswerHasRequiredProof(
  input: ChecklistAnswerProofInput
): {
  requiredProofMode: ChecklistProofMode;
  hasRequiredProof: boolean;
  missingProofReason: string | null;
} {
  const requiredProofMode = getRequiredProofModeForChecklistAnswer(input);
  const photos = normalizePhotoUrls(input.photoUrls);
  const notes = toNullableString(input.notes);

  if (requiredProofMode === "none") {
    return {
      requiredProofMode,
      hasRequiredProof: true,
      missingProofReason: null,
    };
  }

  if (requiredProofMode === "photo") {
    const ok = photos.length > 0;
    return {
      requiredProofMode,
      hasRequiredProof: ok,
      missingProofReason: ok
        ? null
        : "Απαιτείται φωτογραφική τεκμηρίωση για αποτυχημένη απάντηση.",
    };
  }

  if (requiredProofMode === "comment") {
    const ok = Boolean(notes);
    return {
      requiredProofMode,
      hasRequiredProof: ok,
      missingProofReason: ok
        ? null
        : "Απαιτείται σχόλιο για αποτυχημένη απάντηση.",
    };
  }

  const ok = photos.length > 0 || Boolean(notes);
  return {
    requiredProofMode,
    hasRequiredProof: ok,
    missingProofReason: ok
      ? null
      : "Απαιτείται φωτογραφία ή σχόλιο για αποτυχημένη απάντηση.",
  };
}

export function evaluateChecklistAnswerProof(
  input: ChecklistAnswerProofInput
): ChecklistProofEvaluationResult {
  const hasValue = checklistAnswerHasValue(input);
  const failureState = evaluateChecklistFailureState(input);
  const proof = checklistAnswerHasRequiredProof(input);
  const isRequired = Boolean(input.isRequired);

  let canSubmit = true;

  if (isRequired && !hasValue) {
    canSubmit = false;
  }

  if (hasValue && failureState === "fail" && !proof.hasRequiredProof) {
    canSubmit = false;
  }

  return {
    hasValue,
    failureState,
    requiredProofMode: proof.requiredProofMode,
    hasRequiredProof: proof.hasRequiredProof,
    missingProofReason: proof.missingProofReason,
    canSubmit,
    answerValueSummary: buildChecklistAnswerValueSummary(input),
  };
}

export function getChecklistProofReadableLine(
  input: ChecklistAnswerProofInput
): string {
  const evaluation = evaluateChecklistAnswerProof(input);

  const parts: string[] = [
    `τιμή: ${evaluation.answerValueSummary ?? "χωρίς τιμή"}`,
    `failure: ${evaluation.failureState}`,
    `proof mode: ${evaluation.requiredProofMode}`,
    `proof ok: ${evaluation.hasRequiredProof ? "yes" : "no"}`,
    `submit: ${evaluation.canSubmit ? "yes" : "no"}`,
  ];

  if (evaluation.missingProofReason) {
    parts.push(`λόγος: ${evaluation.missingProofReason}`);
  }

  return parts.join(" | ");
}

export function evaluateChecklistAnswersProof(
  inputs: ChecklistAnswerProofInput[]
): ChecklistProofEvaluationResult[] {
  return inputs.map((input) => evaluateChecklistAnswerProof(input));
}

export function canSubmitChecklistAnswers(
  inputs: ChecklistAnswerProofInput[]
): boolean {
  return evaluateChecklistAnswersProof(inputs).every((item) => item.canSubmit);
}

export function getChecklistProofBlockingReasons(
  inputs: ChecklistAnswerProofInput[]
): string[] {
  return evaluateChecklistAnswersProof(inputs)
    .filter((item) => item.canSubmit === false)
    .map((item) => {
      if (!item.hasValue) {
        return "Λείπει υποχρεωτική απάντηση από το checklist.";
      }

      if (item.missingProofReason) {
        return item.missingProofReason;
      }

      return "Η απάντηση του checklist δεν μπορεί να υποβληθεί.";
    });
}

export function validateChecklistSubmitAnswers(input: {
  items: ChecklistSubmitValidationItem[];
  answers: ChecklistSubmitValidationAnswer[];
}): ChecklistSubmitValidationResult {
  const items = Array.isArray(input.items) ? input.items : [];
  const answers = Array.isArray(input.answers) ? input.answers : [];

  const answersMap = new Map<string, ChecklistSubmitValidationAnswer>(
    answers.map((answer) => [String(answer.templateItemId), answer])
  );

  const missingRequiredItems: ChecklistSubmitValidationMissingItem[] = [];
  const proofBlockingItems: ChecklistSubmitValidationMissingItem[] = [];

  for (const item of items) {
    const answer = answersMap.get(String(item.id));

    const evaluation = evaluateChecklistAnswerProof({
      itemType: item.itemType ?? null,
      isRequired: item.isRequired ?? false,
      requiresPhoto: item.requiresPhoto ?? false,
      opensIssueOnFail: item.opensIssueOnFail ?? false,
      failureValuesText: item.failureValuesText ?? null,
      valueBoolean: answer?.valueBoolean ?? null,
      valueText: answer?.valueText ?? null,
      valueNumber: answer?.valueNumber ?? null,
      valueSelect: answer?.valueSelect ?? null,
      notes: answer?.notes ?? null,
      photoUrls: answer?.photoUrls ?? [],
    });

    if (Boolean(item.isRequired) && !evaluation.hasValue) {
      missingRequiredItems.push({
        id: item.id,
        label: item.label,
        reason: "Λείπει υποχρεωτική απάντηση.",
      });
      continue;
    }

    if (
      evaluation.hasValue &&
      evaluation.failureState === "fail" &&
      evaluation.canSubmit === false
    ) {
      proofBlockingItems.push({
        id: item.id,
        label: item.label,
        reason:
          evaluation.missingProofReason ??
          "Η αποτυχημένη απάντηση δεν έχει την απαιτούμενη τεκμηρίωση.",
      });
    }
  }

  if (missingRequiredItems.length > 0) {
    return {
      ok: false,
      error: "Λείπουν υποχρεωτικές απαντήσεις από το checklist.",
      missingItems: missingRequiredItems,
    };
  }

  if (proofBlockingItems.length > 0) {
    return {
      ok: false,
      error: "Υπάρχουν αποτυχημένες απαντήσεις χωρίς την απαιτούμενη τεκμηρίωση.",
      missingItems: proofBlockingItems,
    };
  }

  return {
    ok: true,
  };
}