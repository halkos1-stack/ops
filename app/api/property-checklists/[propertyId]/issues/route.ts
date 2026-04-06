import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAppAccess, canAccessOrganization } from "@/lib/route-access";

type RouteContext = {
  params: Promise<{
    propertyId: string;
  }>;
};

type IssueTemplateItemInput = {
  id?: string;
  label: string;
  labelEn?: string | null;
  description?: string | null;
  sortOrder?: number;
  itemType?: string | null;
  isRequired?: boolean;
  allowsIssue?: boolean;
  allowsDamage?: boolean;
  defaultIssueType?: string | null;
  defaultSeverity?: string | null;
  requiresPhoto?: boolean;
  affectsHostingByDefault?: boolean;
  urgentByDefault?: boolean;
  locationHint?: string | null;
};

type IssueTemplatePayload = {
  title?: string;
  description?: string | null;
  items?: IssueTemplateItemInput[];
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

function normalizeIssueItemType(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();

  if (["issue_check", "issue", "damage", "report"].includes(text)) {
    return text;
  }

  return "issue_check";
}

function normalizeDefaultIssueType(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) return "repair";

  return text;
}

function normalizeDefaultSeverity(value: unknown): string {
  const text = String(value ?? "").trim().toLowerCase();

  if (["low", "medium", "high", "critical", "urgent"].includes(text)) {
    return text;
  }

  return "medium";
}

function normalizeIssueTemplateItems(
  rawItems: unknown
): Array<{
  label: string;
  labelEn: string | null;
  description: string | null;
  sortOrder: number;
  itemType: string;
  isRequired: boolean;
  allowsIssue: boolean;
  allowsDamage: boolean;
  defaultIssueType: string;
  defaultSeverity: string;
  requiresPhoto: boolean;
  affectsHostingByDefault: boolean;
  urgentByDefault: boolean;
  locationHint: string | null;
}> {
  const items = safeArray(rawItems as IssueTemplateItemInput[]);

  if (items.length === 0) {
    throw new Error("Το issues template πρέπει να περιέχει τουλάχιστον ένα item.");
  }

  return items.map((item, index) => {
    const label = toRequiredString(item?.label, `items[${index}].label`);
    const allowsIssue = toBoolean(item?.allowsIssue, true);
    const allowsDamage = toBoolean(item?.allowsDamage, true);

    if (!allowsIssue && !allowsDamage) {
      throw new Error(
        `Το item "${label}" πρέπει να επιτρέπει issue ή damage καταγραφή.`
      );
    }

    return {
      label,
      labelEn: toNullableString(item?.labelEn),
      description: toNullableString(item?.description),
      sortOrder: toNonNegativeInt(item?.sortOrder, index + 1),
      itemType: normalizeIssueItemType(item?.itemType),
      isRequired: toBoolean(item?.isRequired, true),
      allowsIssue,
      allowsDamage,
      defaultIssueType: normalizeDefaultIssueType(item?.defaultIssueType),
      defaultSeverity: normalizeDefaultSeverity(item?.defaultSeverity),
      requiresPhoto: toBoolean(item?.requiresPhoto, false),
      affectsHostingByDefault: toBoolean(item?.affectsHostingByDefault, false),
      urgentByDefault: toBoolean(item?.urgentByDefault, false),
      locationHint: toNullableString(item?.locationHint),
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

async function getIssuesTemplate(propertyId: string) {
  return prisma.propertyIssueTemplate.findFirst({
    where: {
      propertyId,
      isPrimary: true,
      isActive: true,
    },
    select: {
      id: true,
      organizationId: true,
      propertyId: true,
      title: true,
      description: true,
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
          sortOrder: true,
          itemType: true,
          isRequired: true,
          allowsIssue: true,
          allowsDamage: true,
          defaultIssueType: true,
          defaultSeverity: true,
          requiresPhoto: true,
          affectsHostingByDefault: true,
          urgentByDefault: true,
          locationHint: true,
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

    const template = await getIssuesTemplate(propertyId);

    return NextResponse.json({
      propertyId,
      propertyName: property.name,
      template,
    });
  } catch (error) {
    console.error("GET /api/property-checklists/[propertyId]/issues error:", error);

    return NextResponse.json(
      { error: "Αποτυχία φόρτωσης issues template." },
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
    const body = (await req.json()) as IssueTemplatePayload;

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
    const items = normalizeIssueTemplateItems(body?.items);

    const existingPrimaryTemplate = await prisma.propertyIssueTemplate.findFirst({
      where: {
        propertyId,
        isPrimary: true,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (existingPrimaryTemplate) {
      return NextResponse.json(
        {
          error:
            "Υπάρχει ήδη κύριο issues template για αυτό το ακίνητο. Χρησιμοποιήστε PUT για ενημέρωση.",
        },
        { status: 409 }
      );
    }

    const createdTemplate = await prisma.$transaction(async (tx) => {
      const template = await tx.propertyIssueTemplate.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          title,
          description,
          isPrimary: true,
          isActive: true,
          items: {
            create: items.map((item) => ({
              label: item.label,
              labelEn: item.labelEn,
              description: item.description,
              sortOrder: item.sortOrder,
              itemType: item.itemType,
              isRequired: item.isRequired,
              allowsIssue: item.allowsIssue,
              allowsDamage: item.allowsDamage,
              defaultIssueType: item.defaultIssueType,
              defaultSeverity: item.defaultSeverity,
              requiresPhoto: item.requiresPhoto,
              affectsHostingByDefault: item.affectsHostingByDefault,
              urgentByDefault: item.urgentByDefault,
              locationHint: item.locationHint,
            })),
          },
        },
        select: {
          id: true,
        },
      });

      return tx.propertyIssueTemplate.findUnique({
        where: {
          id: template.id,
        },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          title: true,
          description: true,
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
              sortOrder: true,
              itemType: true,
              isRequired: true,
              allowsIssue: true,
              allowsDamage: true,
              defaultIssueType: true,
              defaultSeverity: true,
              requiresPhoto: true,
              affectsHostingByDefault: true,
              urgentByDefault: true,
              locationHint: true,
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
    console.error("POST /api/property-checklists/[propertyId]/issues error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία δημιουργίας issues template.";

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
    const body = (await req.json()) as IssueTemplatePayload & {
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
    const items = normalizeIssueTemplateItems(body?.items);
    const requestedTemplateId = toNullableString(body?.templateId);

    const existingTemplate = await prisma.propertyIssueTemplate.findFirst({
      where: {
        propertyId,
        isPrimary: true,
        isActive: true,
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
            "Δεν υπάρχει κύριο issues template για αυτό το ακίνητο. Χρησιμοποιήστε POST για δημιουργία.",
        },
        { status: 404 }
      );
    }

    if (requestedTemplateId && requestedTemplateId !== existingTemplate.id) {
      return NextResponse.json(
        {
          error:
            "Το templateId δεν αντιστοιχεί στο κύριο issues template του ακινήτου.",
        },
        { status: 400 }
      );
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      await tx.propertyIssueTemplate.update({
        where: {
          id: existingTemplate.id,
        },
        data: {
          title,
          description,
          isPrimary: true,
          isActive: true,
        },
      });

      await tx.propertyIssueTemplateItem.deleteMany({
        where: {
          templateId: existingTemplate.id,
        },
      });

      await tx.propertyIssueTemplateItem.createMany({
        data: items.map((item) => ({
          templateId: existingTemplate.id,
          label: item.label,
          labelEn: item.labelEn,
          description: item.description,
          sortOrder: item.sortOrder,
          itemType: item.itemType,
          isRequired: item.isRequired,
          allowsIssue: item.allowsIssue,
          allowsDamage: item.allowsDamage,
          defaultIssueType: item.defaultIssueType,
          defaultSeverity: item.defaultSeverity,
          requiresPhoto: item.requiresPhoto,
          affectsHostingByDefault: item.affectsHostingByDefault,
          urgentByDefault: item.urgentByDefault,
          locationHint: item.locationHint,
        })),
      });

      return tx.propertyIssueTemplate.findUnique({
        where: {
          id: existingTemplate.id,
        },
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          title: true,
          description: true,
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
              sortOrder: true,
              itemType: true,
              isRequired: true,
              allowsIssue: true,
              allowsDamage: true,
              defaultIssueType: true,
              defaultSeverity: true,
              requiresPhoto: true,
              affectsHostingByDefault: true,
              urgentByDefault: true,
              locationHint: true,
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
    console.error("PUT /api/property-checklists/[propertyId]/issues error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Αποτυχία ενημέρωσης issues template.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
