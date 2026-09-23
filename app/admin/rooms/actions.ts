"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function goError(message: string): never {
  redirect(`/admin/rooms?error=${encodeURIComponent(message)}`);
}

function goSuccess(message: string): never {
  redirect(`/admin/rooms?success=${encodeURIComponent(message)}`);
}

// ============================================================
// GET DEFAULT INSTITUTION
// ============================================================

async function getInstitutionId() {
  await requireRole(["super_admin"]);

  const supabase = await createClient();

  const { data: inst, error } = await supabase
    .from("institutions")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    goError(error.message);
  }

  if (!inst) {
    goError(
      "No institution found. Please create an institution first."
    );
  }

  return inst.id;
}

// ============================================================
// CREATE ROOM
// ============================================================

export async function createRoom(formData: FormData) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();
  const institutionId = await getInstitutionId();

  const code = value(formData, "code");
  const name = value(formData, "name");
  const building = value(formData, "building");
  const floor = value(formData, "floor");
  const capacityRaw = value(formData, "capacity");
  const roomTypeId = value(formData, "room_type_id");

  const capacity = Number(capacityRaw);

  if (!code) {
    goError("Room code is required.");
  }

  if (!name) {
    goError("Room name is required.");
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    goError("Room capacity must be greater than 0.");
  }

  const { error } = await supabase
    .from("rooms")
    .insert({
      institution_id: institutionId,
      room_type_id: roomTypeId || null,
      code,
      name,
      building: building || null,
      floor: floor || null,
      capacity,
      is_active: true,
    });

  if (error) {
    goError(error.message);
  }

  revalidatePath("/admin/rooms");

  goSuccess("Room created successfully.");
}

// ============================================================
// ACTIVATE / DEACTIVATE ROOM
// ============================================================

export async function setRoomActive(formData: FormData) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();

  const roomId = value(formData, "room_id");
  const activeValue = value(formData, "is_active");

  if (!roomId) {
    goError("Room ID is required.");
  }

  const isActive = activeValue === "true";

  const { data, error } = await supabase
    .from("rooms")
    .update({
      is_active: isActive,
    })
    .eq("id", roomId)
    .select("id")
    .maybeSingle();

  if (error) {
    goError(error.message);
  }

  if (!data) {
    goError(
      "Room was not found or you do not have permission to update it."
    );
  }

  revalidatePath("/admin/rooms");

  goSuccess(
    isActive
      ? "Room activated successfully."
      : "Room deactivated successfully."
  );
}

// ============================================================
// ADD ROOM AVAILABILITY
// ============================================================

export async function addRoomAvailability(
  formData: FormData
) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();

  const roomId = value(formData, "room_id");
  const semesterId = value(formData, "semester_id");
  const dayRaw = value(formData, "day_of_week");
  const startTime = value(formData, "start_time");
  const endTime = value(formData, "end_time");
  const status = value(formData, "status");
  const reason = value(formData, "reason");

  const dayOfWeek = Number(dayRaw);

  if (!roomId) {
    goError("Room is required.");
  }

  if (!semesterId) {
    goError("Semester is required.");
  }

  if (
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 7
  ) {
    goError("Please select a valid day.");
  }

  if (!startTime || !endTime) {
    goError("Start time and end time are required.");
  }

  if (endTime <= startTime) {
    goError("End time must be later than start time.");
  }

  const allowedStatuses = [
    "available",
    "blocked",
    "maintenance",
  ];

  if (!allowedStatuses.includes(status)) {
    goError("Invalid room availability status.");
  }

  const { error } = await supabase
    .from("room_availability")
    .insert({
      room_id: roomId,
      semester_id: semesterId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      status,
      reason: reason || null,
    });

  if (error) {
    goError(error.message);
  }

  revalidatePath("/admin/rooms");

  goSuccess("Room availability added successfully.");
}

// ============================================================
// REMOVE ROOM AVAILABILITY
// ============================================================

export async function removeRoomAvailability(
  formData: FormData
) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();

  const availabilityId = value(
    formData,
    "availability_id"
  );

  if (!availabilityId) {
    goError("Availability ID is required.");
  }

  const { data, error } = await supabase
    .from("room_availability")
    .delete()
    .eq("id", availabilityId)
    .select("id")
    .maybeSingle();

  if (error) {
    goError(error.message);
  }

  if (!data) {
    goError(
      "Availability record was not found or you do not have permission to remove it."
    );
  }

  revalidatePath("/admin/rooms");

  goSuccess("Room availability removed successfully.");
}