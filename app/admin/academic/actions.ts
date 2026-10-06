"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

const ACADEMIC_PATH = "/admin/academic";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(code: string): never {
  redirect(`${ACADEMIC_PATH}?error=${encodeURIComponent(code)}`);
}

function success(code: string): never {
  revalidatePath(ACADEMIC_PATH);
  revalidatePath("/register");
  revalidatePath("/admin/subjects");
  revalidatePath("/admin/class-offerings");
  revalidatePath("/admin/schedule-builder");

  redirect(`${ACADEMIC_PATH}?success=${encodeURIComponent(code)}`);
}

async function requireSuperAdmin() {
  await requireRole(["super_admin"]);
  return createClient();
}

/* =========================================================
   ACADEMIC YEAR
========================================================= */

export async function createAcademicYear(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const institutionId = value(formData, "institution_id");
  const name = value(formData, "name");
  const startDate = value(formData, "start_date");
  const endDate = value(formData, "end_date");
  const isActive = value(formData, "is_active") === "on";

  if (!institutionId || !name || !startDate || !endDate) {
    fail("academic_year_fields_required");
  }

  if (endDate <= startDate) {
    fail("academic_year_invalid_dates");
  }

  const { data: institution, error: institutionError } = await supabase
    .from("institutions")
    .select("id, is_active")
    .eq("id", institutionId)
    .maybeSingle();

  if (institutionError || !institution) {
    console.error("Institution lookup failed:", institutionError);
    fail("institution_not_found");
  }

  if (!institution.is_active) {
    fail("institution_inactive");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId)
    .ilike("name", name)
    .maybeSingle();

  if (duplicateError) {
    console.error("Academic year duplicate check failed:", duplicateError);
    fail("academic_year_check_failed");
  }

  if (duplicate) {
    fail("academic_year_exists");
  }

  if (isActive) {
    const { error } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .eq("institution_id", institutionId)
      .eq("is_active", true);

    if (error) {
      console.error("Academic year deactivate failed:", error);
      fail("academic_year_activation_failed");
    }
  }

  const { error } = await supabase.from("academic_years").insert({
    institution_id: institutionId,
    name,
    start_date: startDate,
    end_date: endDate,
    is_active: isActive,
  });

  if (error) {
    console.error("Academic year creation failed:", error);
    fail("academic_year_create_failed");
  }

  success("academic_year_created");
}

export async function setAcademicYearActive(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const id = value(formData, "academic_year_id");

  if (!id) {
    fail("academic_year_required");
  }

  const { data: academicYear, error } = await supabase
    .from("academic_years")
    .select("id, institution_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !academicYear) {
    console.error("Academic year lookup failed:", error);
    fail("academic_year_not_found");
  }

  const { error: deactivateError } = await supabase
    .from("academic_years")
    .update({ is_active: false })
    .eq("institution_id", academicYear.institution_id)
    .eq("is_active", true);

  if (deactivateError) {
    console.error("Academic year deactivate failed:", deactivateError);
    fail("academic_year_activation_failed");
  }

  const { error: activateError } = await supabase
    .from("academic_years")
    .update({ is_active: true })
    .eq("id", id);

  if (activateError) {
    console.error("Academic year activate failed:", activateError);
    fail("academic_year_activation_failed");
  }

  success("academic_year_activated");
}

/* =========================================================
   SEMESTER
========================================================= */

export async function createSemester(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const academicYearId = value(formData, "academic_year_id");
  const name = value(formData, "name");
  const termOrderRaw = value(formData, "term_order");
  const startDate = value(formData, "start_date");
  const endDate = value(formData, "end_date");
  const isActive = value(formData, "is_active") === "on";

  if (
    !academicYearId ||
    !name ||
    !termOrderRaw ||
    !startDate ||
    !endDate
  ) {
    fail("semester_fields_required");
  }

  const termOrder = Number(termOrderRaw);

  if (!Number.isInteger(termOrder) || termOrder <= 0) {
    fail("semester_invalid_term_order");
  }

  if (endDate <= startDate) {
    fail("semester_invalid_dates");
  }

  const { data: academicYear, error: academicYearError } = await supabase
    .from("academic_years")
    .select("id, institution_id, start_date, end_date")
    .eq("id", academicYearId)
    .maybeSingle();

  if (academicYearError || !academicYear) {
    console.error("Academic year lookup failed:", academicYearError);
    fail("academic_year_not_found");
  }

  if (
    startDate < academicYear.start_date ||
    endDate > academicYear.end_date
  ) {
    fail("semester_outside_academic_year");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("semesters")
    .select("id")
    .eq("academic_year_id", academicYearId)
    .ilike("name", name)
    .maybeSingle();

  if (duplicateError) {
    console.error("Semester duplicate check failed:", duplicateError);
    fail("semester_check_failed");
  }

  if (duplicate) {
    fail("semester_exists");
  }

  if (isActive) {
    const { data: academicYearIds, error: yearIdsError } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", academicYear.institution_id);

    if (yearIdsError) {
      console.error("Academic year list failed:", yearIdsError);
      fail("semester_activation_failed");
    }

    const ids = (academicYearIds ?? []).map((item) => item.id);

    if (ids.length > 0) {
      const { error } = await supabase
        .from("semesters")
        .update({ is_active: false })
        .in("academic_year_id", ids)
        .eq("is_active", true);

      if (error) {
        console.error("Semester deactivate failed:", error);
        fail("semester_activation_failed");
      }
    }
  }

  const { error: insertError } = await supabase.from("semesters").insert({
    academic_year_id: academicYearId,
    name,
    term_order: termOrder,
    start_date: startDate,
    end_date: endDate,
    is_active: isActive,
  });

  if (insertError) {
    console.error("Semester creation failed:", insertError);
    fail("semester_create_failed");
  }

  success("semester_created");
}

export async function setSemesterActive(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const semesterId = value(formData, "semester_id");

  if (!semesterId) {
    fail("semester_required");
  }

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select(`
      id,
      academic_year_id,
      academic_years (
        institution_id
      )
    `)
    .eq("id", semesterId)
    .maybeSingle();

  if (semesterError || !semester) {
    console.error("Semester lookup failed:", semesterError);
    fail("semester_not_found");
  }

  const relation = semester.academic_years as
    | { institution_id?: string }
    | { institution_id?: string }[]
    | null;

  const institutionId = Array.isArray(relation)
    ? relation[0]?.institution_id
    : relation?.institution_id;

  if (!institutionId) {
    fail("semester_academic_year_invalid");
  }

  const { data: years, error: yearsError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId);

  if (yearsError) {
    console.error("Academic year list failed:", yearsError);
    fail("semester_activation_failed");
  }

  const yearIds = (years ?? []).map((item) => item.id);

  if (yearIds.length > 0) {
    const { error } = await supabase
      .from("semesters")
      .update({ is_active: false })
      .in("academic_year_id", yearIds)
      .eq("is_active", true);

    if (error) {
      console.error("Semester deactivate failed:", error);
      fail("semester_activation_failed");
    }
  }

  const { error: activateError } = await supabase
    .from("semesters")
    .update({ is_active: true })
    .eq("id", semesterId);

  if (activateError) {
    console.error("Semester activate failed:", activateError);
    fail("semester_activation_failed");
  }

  success("semester_activated");
}

/* =========================================================
   DEPARTMENT
========================================================= */

export async function createDepartment(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const institutionId = value(formData, "institution_id");
  const code = value(formData, "code").toUpperCase();
  const name = value(formData, "name");
  const description = value(formData, "description");

  if (!institutionId || !code || !name) {
    fail("department_fields_required");
  }

  const { data: institution, error: institutionError } = await supabase
    .from("institutions")
    .select("id")
    .eq("id", institutionId)
    .maybeSingle();

  if (institutionError || !institution) {
    console.error("Institution lookup failed:", institutionError);
    fail("institution_not_found");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("departments")
    .select("id")
    .eq("institution_id", institutionId)
    .ilike("code", code)
    .maybeSingle();

  if (duplicateError) {
    console.error("Department duplicate check failed:", duplicateError);
    fail("department_check_failed");
  }

  if (duplicate) {
    fail("department_code_exists");
  }

  const { error } = await supabase.from("departments").insert({
    institution_id: institutionId,
    code,
    name,
    description: description || null,
    is_active: true,
  });

  if (error) {
    console.error("Department creation failed:", error);
    fail("department_create_failed");
  }

  success("department_created");
}

/* =========================================================
   PROGRAM
========================================================= */

export async function createProgram(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const departmentId = value(formData, "department_id");
  const code = value(formData, "code").toUpperCase();
  const name = value(formData, "name");
  const description = value(formData, "description");

  if (!departmentId || !code || !name) {
    fail("program_fields_required");
  }

  const { data: department, error: departmentError } = await supabase
    .from("departments")
    .select("id, is_active")
    .eq("id", departmentId)
    .maybeSingle();

  if (departmentError || !department) {
    console.error("Department lookup failed:", departmentError);
    fail("department_not_found");
  }

  if (!department.is_active) {
    fail("department_inactive");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("programs")
    .select("id")
    .eq("department_id", departmentId)
    .ilike("code", code)
    .maybeSingle();

  if (duplicateError) {
    console.error("Program duplicate check failed:", duplicateError);
    fail("program_check_failed");
  }

  if (duplicate) {
    fail("program_code_exists");
  }

  const { error } = await supabase.from("programs").insert({
    department_id: departmentId,
    code,
    name,
    description: description || null,
    is_active: true,
  });

  if (error) {
    console.error("Program creation failed:", error);
    fail("program_create_failed");
  }

  success("program_created");
}

/* =========================================================
   YEAR LEVEL
========================================================= */

export async function createYearLevel(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const programId = value(formData, "program_id");
  const levelNumberRaw = value(formData, "level_number");
  const name = value(formData, "name");
  const sortOrderRaw = value(formData, "sort_order");

  if (!programId || !levelNumberRaw || !name) {
    fail("year_level_fields_required");
  }

  const levelNumber = Number(levelNumberRaw);
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : levelNumber;

  if (!Number.isInteger(levelNumber) || levelNumber <= 0) {
    fail("year_level_invalid_number");
  }

  if (!Number.isInteger(sortOrder) || sortOrder <= 0) {
    fail("year_level_invalid_sort_order");
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, is_active")
    .eq("id", programId)
    .maybeSingle();

  if (programError || !program) {
    console.error("Program lookup failed:", programError);
    fail("program_not_found");
  }

  if (!program.is_active) {
    fail("program_inactive");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("year_levels")
    .select("id")
    .eq("program_id", programId)
    .eq("level_number", levelNumber)
    .maybeSingle();

  if (duplicateError) {
    console.error("Year level duplicate check failed:", duplicateError);
    fail("year_level_check_failed");
  }

  if (duplicate) {
    fail("year_level_exists");
  }

  const { error } = await supabase.from("year_levels").insert({
    program_id: programId,
    level_number: levelNumber,
    name,
    sort_order: sortOrder,
    is_active: true,
  });

  if (error) {
    console.error("Year level creation failed:", error);
    fail("year_level_create_failed");
  }

  success("year_level_created");
}

/* =========================================================
   SECTION / BLOCK
========================================================= */

export async function createSection(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const yearLevelId = value(formData, "year_level_id");
  const code = value(formData, "code").toUpperCase();
  const name = value(formData, "name");
  const capacityRaw = value(formData, "capacity");

  if (!yearLevelId || !code || !name) {
    fail("section_fields_required");
  }

  let capacity: number | null = null;

  if (capacityRaw) {
    capacity = Number(capacityRaw);

    if (!Number.isInteger(capacity) || capacity <= 0) {
      fail("section_invalid_capacity");
    }
  }

  const { data: yearLevel, error: yearLevelError } = await supabase
    .from("year_levels")
    .select("id, is_active")
    .eq("id", yearLevelId)
    .maybeSingle();

  if (yearLevelError || !yearLevel) {
    console.error("Year level lookup failed:", yearLevelError);
    fail("year_level_not_found");
  }

  if (!yearLevel.is_active) {
    fail("year_level_inactive");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("sections")
    .select("id")
    .eq("year_level_id", yearLevelId)
    .ilike("code", code)
    .maybeSingle();

  if (duplicateError) {
    console.error("Section duplicate check failed:", duplicateError);
    fail("section_check_failed");
  }

  if (duplicate) {
    fail("section_code_exists");
  }

  const { error } = await supabase.from("sections").insert({
    year_level_id: yearLevelId,
    code,
    name,
    capacity,
    is_active: true,
  });

  if (error) {
    console.error("Section creation failed:", error);
    fail("section_create_failed");
  }

  success("section_created");
}

/* =========================================================
   GENERIC ACTIVE / INACTIVE MANAGEMENT
========================================================= */

const manageableTables = {
  department: "departments",
  program: "programs",
  year_level: "year_levels",
  section: "sections",
} as const;

type ManageableEntity = keyof typeof manageableTables;

export async function setAcademicEntityActive(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const entity = value(formData, "entity") as ManageableEntity;
  const id = value(formData, "id");
  const activeRaw = value(formData, "active");

  if (!entity || !id || !Object.hasOwn(manageableTables, entity)) {
    fail("invalid_academic_entity");
  }

  const isActive = activeRaw === "true";
  const table = manageableTables[entity];

  const { error } = await supabase
    .from(table)
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error(`${entity} status update failed:`, error);
    fail("academic_entity_update_failed");
  }

  success(isActive ? "academic_entity_activated" : "academic_entity_deactivated");
}