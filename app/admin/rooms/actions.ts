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

function refreshRoomPages() {
  revalidatePath("/admin/rooms");
  revalidatePath("/admin/class-offerings");
  revalidatePath("/admin/schedule-builder");
  revalidatePath("/scheduler/schedule-builder");
  revalidatePath("/scheduler/class-offerings");
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
    goError("No institution found. Please create an institution first.");
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

  const { data: duplicate, error: duplicateError } = await supabase
    .from("rooms")
    .select("id")
    .eq("institution_id", institutionId)
    .ilike("code", code)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    goError(duplicateError.message);
  }

  if (duplicate) {
    goError(`Room code "${code}" already exists.`);
  }

  if (roomTypeId) {
    const { data: roomType, error: roomTypeError } = await supabase
      .from("room_types")
      .select("id")
      .eq("id", roomTypeId)
      .maybeSingle();

    if (roomTypeError) {
      goError(roomTypeError.message);
    }

    if (!roomType) {
      goError("Selected room type was not found.");
    }
  }

  const { error } = await supabase.from("rooms").insert({
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

  refreshRoomPages();
  goSuccess("Room created successfully.");
}

// ============================================================
// UPDATE ROOM
// ============================================================

export async function updateRoom(formData: FormData) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();

  const roomId = value(formData, "room_id");
  const code = value(formData, "code");
  const name = value(formData, "name");
  const building = value(formData, "building");
  const floor = value(formData, "floor");
  const capacityRaw = value(formData, "capacity");
  const roomTypeId = value(formData, "room_type_id");

  const capacity = Number(capacityRaw);

  if (!roomId) {
    goError("Room ID is required.");
  }

  if (!code) {
    goError("Room code is required.");
  }

  if (!name) {
    goError("Room name is required.");
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    goError("Room capacity must be greater than 0.");
  }

  const { data: currentRoom, error: roomLookupError } = await supabase
    .from("rooms")
    .select("id,institution_id")
    .eq("id", roomId)
    .maybeSingle();

  if (roomLookupError) {
    goError(roomLookupError.message);
  }

  if (!currentRoom) {
    goError("Room was not found.");
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("rooms")
    .select("id")
    .eq("institution_id", currentRoom.institution_id)
    .ilike("code", code)
    .neq("id", roomId)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    goError(duplicateError.message);
  }

  if (duplicate) {
    goError(`Room code "${code}" already exists.`);
  }

  if (roomTypeId) {
    const { data: roomType, error: roomTypeError } = await supabase
      .from("room_types")
      .select("id")
      .eq("id", roomTypeId)
      .maybeSingle();

    if (roomTypeError) {
      goError(roomTypeError.message);
    }

    if (!roomType) {
      goError("Selected room type was not found.");
    }
  }

  const { data, error } = await supabase
    .from("rooms")
    .update({
      room_type_id: roomTypeId || null,
      code,
      name,
      building: building || null,
      floor: floor || null,
      capacity,
    })
    .eq("id", roomId)
    .select("id")
    .maybeSingle();

  if (error) {
    goError(error.message);
  }

  if (!data) {
    goError("Room was not found or you do not have permission to update it.");
  }

  refreshRoomPages();
  goSuccess("Room updated successfully.");
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

  if (activeValue !== "true" && activeValue !== "false") {
    goError("Invalid room status.");
  }

  const isActive = activeValue === "true";

  const { data, error } = await supabase
    .from("rooms")
    .update({ is_active: isActive })
    .eq("id", roomId)
    .select("id")
    .maybeSingle();

  if (error) {
    goError(error.message);
  }

  if (!data) {
    goError("Room was not found or you do not have permission to update it.");
  }

  refreshRoomPages();

  goSuccess(
    isActive
      ? "Room activated successfully."
      : "Room deactivated successfully."
  );
}

// ============================================================
// DELETE ROOM
// ============================================================

export async function deleteRoom(formData: FormData) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();
  const roomId = value(formData, "room_id");

  if (!roomId) {
    goError("Room ID is required.");
  }

  const { data: room, error: lookupError } = await supabase
    .from("rooms")
    .select("id,code")
    .eq("id", roomId)
    .maybeSingle();

  if (lookupError) {
    goError(lookupError.message);
  }

  if (!room) {
    goError("Room was not found.");
  }

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    if (error.code === "23503") {
      goError(
        "This room is already being used by scheduling records. Deactivate it instead of deleting it."
      );
    }

    goError(error.message);
  }

  refreshRoomPages();
  goSuccess(`Room ${room.code} deleted successfully.`);
}

// ============================================================
// ADD ROOM AVAILABILITY
// ============================================================

export async function addRoomAvailability(formData: FormData) {
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

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    goError("Please select a valid day.");
  }

  if (!startTime || !endTime) {
    goError("Start time and end time are required.");
  }

  if (endTime <= startTime) {
    goError("End time must be later than start time.");
  }

  const allowedStatuses = ["available", "blocked", "maintenance"];

  if (!allowedStatuses.includes(status)) {
    goError("Invalid room availability status.");
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id,is_active")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    goError(roomError.message);
  }

  if (!room) {
    goError("Selected room was not found.");
  }

  if (!room.is_active) {
    goError("Availability cannot be added to an inactive room.");
  }

  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("id")
    .eq("id", semesterId)
    .maybeSingle();

  if (semesterError) {
    goError(semesterError.message);
  }

  if (!semester) {
    goError("Selected semester was not found.");
  }

  const { error } = await supabase.from("room_availability").insert({
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

  refreshRoomPages();
  goSuccess("Room availability added successfully.");
}

// ============================================================
// REMOVE ROOM AVAILABILITY
// ============================================================

export async function removeRoomAvailability(formData: FormData) {
  await requireRole(["super_admin"]);

  const supabase = await createClient();

  const availabilityId = value(formData, "availability_id");

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

  refreshRoomPages();
  goSuccess("Room availability removed successfully.");
}
