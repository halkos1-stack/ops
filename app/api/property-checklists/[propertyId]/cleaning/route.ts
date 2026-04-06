import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access";

type RouteContext = {
  params: Promise<{
    propertyId: string;
  }>;
};

type CleaningTemplateItemInput = {
  id?: string;
  label: string;
  labelEn?: string | null;
  description?: string | null;
  itemType?: string | null;
  isRequired?: boolean;
  sortOrder?: number;
  category?: string | null;
  requiresPhoto?: boolean;
  optionsText?: string | null;
};

type CleaningTemplatePayload = {
  title?: string;
  description?: string | null;
  items?: CleaningTemplateItemInput[];
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text === "" ? null : text;
}

function toRequiredString(value: unknown, fieldName: string): string {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`Το πεδίο "${fieldName}" είναι υποχρεωτικό.`);
  }

  return text;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return fallback;

  const text = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(text)) return true;
  if (["false", "0", "no", "off"].includes(text)) return false;

  return fallback;
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;

  const num = Number(value);

  if (Number.isNaN(num)) return fallback;

  return Math.max(0, Math.trunc(num));
}

function normalizeCleaningItemType(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();

  if (["boolean", "text", "number", "select"].includes(text)) {
    return text;
  }

  return "boolean";
}

function normalizeCleaningCategory(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) return "cleaning";

  return text;
}

function normalizeCleaningTemplateItems(
  rawItems: unknown
): Array<{
  label: string;
  labelEn: string | null;
  description: string | null;
  itemType: string;
  isRequired: boolean;
  sortOrder: number;
  category: string;
  requiresPhoto: boolean;
  optionsText: string | null;
}> {
  const items = safeArray(rawItems as CleaningTemplateItemInput[]);

  if (items.length === 0) {
    throw new Error("Το cleaning template πρέπει να περιέχει τουλάχιστον ένα item.");
  }

  return items.map((item, index) => {
    const label = toRequiredString(item?.label, `items[${index}].label`);
    const itemType = normalizeCleaningItemType(item?.itemType);
    const optionsText = toNullableString(item?.optionsText);

    if (itemType === "select" && !optionsText) {
      throw new Error(
        `Το πεδίο "items[${index}].optionsText" είναι υποχρεωτικό όταν το itemType είναι select.`
      );
    }

    return {
      label,
      labelEn: toNullableString(item?.labelEn),
      description: toNullableString(item?.description),
      itemType,
      isRequired: toBoolean(item?.isRequired, true),
      sortOrder: toNonNegativeInt(item?.sortOrder, index + 1),
      category: normalizeCleaningCategory(item?.category),
      requiresPhoto: toBoolean(item?.requiresPhoto, false),
      optionsText,
    };
  });
}

async function getPropertyBase(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      organizationId: true,
      name: true,
    },
  });
}

async function getCleaningTemplate(propertyId: string) {
  return prisma.propertyChecklistTemplate.findFirst({
    where: {
      propertyId,
      isPrimary: true,
      isActive: true,
      NOT: {
        templateType: "supplies",
      },
    },
    select: {
      id: true,
      organizationId: true,
      propertyId: true,
      title: true,
      description: true,
      templateType: true,
      isPrimary: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          templateId: true,
          label: true,
          labelEn: true,
          description: true,
          itemType: true,
          isRequired: true,
          sortOrder: true,
          category: true,
          requiresPhoto: true,
          opensIssueOnFail: true,
          optionsText: true,
          issueTypeOnFail: true,
          issueSeverityOnFail: true,
          failureValuesText: true,
          linkedSupplyItemId: true,
          supplyUpdateMode: true,
          supplyQuantity: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess();

    if (!access.ok) {
      return access.response;
    }

    const auth = access.auth;
    const { propertyId } = await context.params;

    const property = await getPropertyBase(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      );
    }

    const template = await getCleaningTemplate(propertyId);

    return NextResponse.json({
      propertyId,
      propertyName: property.name,
      template,
    });
  } catch (error) {
    console.error("GET /api/property-checklists/[propertyId]/cleaning error:", error);

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης cleaning template." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess();

    if (!access.ok) {
      return access.response;
    }

    const auth = access.auth;
    const { propertyId } = await context.params;
    const body = (await req.json()) as CleaningTemplatePayload;

    const property = await getPropertyBase(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      );
    }

    const title = toRequiredString(body?.title, "title");
    const description = toNullableString(body?.description);
    const items = normalizeCleaningTemplateItems(body?.items);

    const existingPrimaryTemplate = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        propertyId,
        isPrimary: true,
        isActive: true,
        NOT: {
          templateType: "supplies",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingPrimaryTemplate) {
      return NextResponse.json(
        {
          error:
            "Υπάρχει ήδη κύριο cleaning template για αυτό το ακίνητο. Χρησιμοποιήστε PUT για ενημέρωση.",
        },
        { status: 409 }
      );
    }

    const createdTemplate = await prisma.$transaction(async (tx) => {
      const template = await tx.propertyChecklistTemplate.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          title,
          description,
          templateType: "cleaning",
          isPrimary: true,
          isActive: true,
          items: {
            create: items.map((item) => ({
              label: item.label,
              labelEn: item.labelEn,
              description: item.description,
              itemType: item.itemType,
              isRequired: item.isRequired,
              sortOrder: item.sortOrder,
              category: item.category,
              requiresPhoto: item.requiresPhoto,
              opensIssueOnFail: false,
              optionsText: item.optionsText,
              issueTypeOnFail: null,
              issueSeverityOnFail: null,
              failureValuesText: null,
              linkedSupplyItemId: null,
              supplyUpdateMode: "none",
              supplyQuantity: null,
            })),
          },
        },
        select: {
          id: true,
        },
      });

      return tx.propertyChecklistTemplate.findUnique({
        where: {
          id: template.id,
        },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          title: true,
          description: true,
          templateType: true,
          isPrimary: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          items: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              templateId: true,
              label: true,
              labelEn: true,
              description: true,
              itemType: true,
              isRequired: true,
              sortOrder: true,
              category: true,
              requiresPhoto: true,
              opensIssueOnFail: true,
              optionsText: true,
              issueTypeOnFail: true,
              issueSeverityOnFail: true,
              failureValuesText: true,
              linkedSupplyItemId: true,
              supplyUpdateMode: true,
              supplyQuantity: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        template: createdTemplate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/property-checklists/[propertyId]/cleaning error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας cleaning template.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const access = await requireApiAppAccess();

    if (!access.ok) {
      return access.response;
    }

    const auth = access.auth;
    const { propertyId } = await context.params;
    const body = (await req.json()) as CleaningTemplatePayload & {
      templateId?: string;
    };

    const property = await getPropertyBase(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: "Το ακίνητο δεν βρέθηκε." },
        { status: 404 }
      );
    }

    if (!canAccessOrganization(auth, property.organizationId)) {
      return NextResponse.json(
        { error: "Δεν έχετε πρόσβαση σε αυτό το ακίνητο." },
        { status: 403 }
      );
    }

    const title = toRequiredString(body?.title, "title");
    const description = toNullableString(body?.description);
    const items = normalizeCleaningTemplateItems(body?.items);
    const requestedTemplateId = toNullableString(body?.templateId);

    const existingTemplate = await prisma.propertyChecklistTemplate.findFirst({
      where: {
        propertyId,
        isPrimary: true,
        isActive: true,
        NOT: {
          templateType: "supplies",
        },
      },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        {
          error:
            "Δεν υπάρχει κύριο cleaning template για αυτό το ακίνητο. Χρησιμοποιήστε POST για δημιουργία.",
        },
        { status: 404 }
      );
    }

    if (requestedTemplateId && requestedTemplateId !== existingTemplate.id) {
      return NextResponse.json(
        {
          error:
            "Το templateId δεν αντιστοιχεί στο κύριο cleaning template του ακινήτου.",
        },
        { status: 400 }
      );
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      await tx.propertyChecklistTemplate.update({
        where: {
          id: existingTemplate.id,
        },
        data: {
          title,
          description,
          templateType: "cleaning",
          isPrimary: true,
          isActive: true,
        },
      });

      await tx.propertyChecklistTemplateItem.deleteMany({
        where: {
          templateId: existingTemplate.id,
        },
      });

      await tx.propertyChecklistTemplateItem.createMany({
        data: items.map((item) => ({
          templateId: existingTemplate.id,
          label: item.label,
          labelEn: item.labelEn,
          description: item.description,
          itemType: item.itemType,
          isRequired: item.isRequired,
          sortOrder: item.sortOrder,
          category: item.category,
          requiresPhoto: item.requiresPhoto,
          opensIssueOnFail: false,
          optionsText: item.optionsText,
          issueTypeOnFail: null,
          issueSeverityOnFail: null,
          failureValuesText: null,
          linkedSupplyItemId: null,
          supplyUpdateMode: "none",
          supplyQuantity: null,
        })),
      });

      return tx.propertyChecklistTemplate.findUnique({
        where: {
          id: existingTemplate.id,
        },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          title: true,
          description: true,
          templateType: true,
          isPrimary: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          items: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              templateId: true,
              label: true,
              labelEn: true,
              description: true,
              itemType: true,
              isRequired: true,
              sortOrder: true,
              category: true,
              requiresPhoto: true,
              opensIssueOnFail: true,
              optionsText: true,
              issueTypeOnFail: true,
              issueSeverityOnFail: true,
              failureValuesText: true,
              linkedSupplyItemId: true,
              supplyUpdateMode: true,
              supplyQuantity: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
    });
  } catch (error) {
    console.error("PUT /api/property-checklists/[propertyId]/cleaning error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης cleaning template.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
