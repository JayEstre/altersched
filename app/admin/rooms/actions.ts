<<<<<<< HEAD
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getString } from '@/lib/form-data'
import { isRoomAvailabilityStatus } from '@/lib/enums'

function goError(message: string): never {
  redirect(`/admin/rooms?error=${encodeURIComponent(message)}`)
}

function goSuccess(message: string): never {
  redirect(`/admin/rooms?success=${encodeURIComponent(message)}`)
}

function refreshRoomPages() {
  revalidatePath('/admin/rooms')
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/class-offerings')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// GET DEFAULT INSTITUTION
// ============================================================

async function getInstitutionId() {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()

  const { data: inst, error } = await supabase
    .from('institutions')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (error) {
    goError(error.message)
  }

  if (!inst) {
    goError('No institution found. Please create an institution first.')
  }

  return inst.id
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// CREATE ROOM
// ============================================================

export async function createRoom(formData: FormData) {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const institutionId = await getInstitutionId()
  const code = getString(formData, 'code')
  const name = getString(formData, 'name')
  const building = getString(formData, 'building')
  const floor = getString(formData, 'floor')
  const capacityRaw = getString(formData, 'capacity')
  const roomTypeId = getString(formData, 'room_type_id')
  const capacity = Number(capacityRaw)

  if (!code) {
    goError('Room code is required.')
  }

  if (!name) {
    goError('Room name is required.')
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    goError('Room capacity must be greater than 0.')
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from('rooms')
    .select('id')
    .eq('institution_id', institutionId)
    .ilike('code', code)
    .limit(1)
    .maybeSingle()

  if (duplicateError) {
    goError(duplicateError.message)
  }

  if (duplicate) {
    goError(`Room code "${code}" already exists.`)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  if (roomTypeId) {
    const { data: roomType, error: roomTypeError } = await supabase
<<<<<<< HEAD
      .from('room_types')
      .select('id')
      .eq('id', roomTypeId)
      .maybeSingle()

    if (roomTypeError) {
      goError(roomTypeError.message)
    }

    if (!roomType) {
      goError('Selected room type was not found.')
    }
  }

  const { error } = await supabase.from('rooms').insert({
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    institution_id: institutionId,
    room_type_id: roomTypeId || null,
    code,
    name,
    building: building || null,
    floor: floor || null,
    capacity,
    is_active: true,
<<<<<<< HEAD
  })

  if (error) {
    goError(error.message)
  }

  refreshRoomPages()
  goSuccess('Room created successfully.')
=======
  });

  if (error) {
    goError(error.message);
  }

  refreshRoomPages();
  goSuccess("Room created successfully.");
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// UPDATE ROOM
// ============================================================

export async function updateRoom(formData: FormData) {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const roomId = getString(formData, 'room_id')
  const code = getString(formData, 'code')
  const name = getString(formData, 'name')
  const building = getString(formData, 'building')
  const floor = getString(formData, 'floor')
  const capacityRaw = getString(formData, 'capacity')
  const roomTypeId = getString(formData, 'room_type_id')
  const capacity = Number(capacityRaw)

  if (!roomId) {
    goError('Room ID is required.')
  }

  if (!code) {
    goError('Room code is required.')
  }

  if (!name) {
    goError('Room name is required.')
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    goError('Room capacity must be greater than 0.')
  }

  const { data: currentRoom, error: roomLookupError } = await supabase
    .from('rooms')
    .select('id,institution_id')
    .eq('id', roomId)
    .maybeSingle()

  if (roomLookupError) {
    goError(roomLookupError.message)
  }

  if (!currentRoom) {
    goError('Room was not found.')
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from('rooms')
    .select('id')
    .eq('institution_id', currentRoom.institution_id)
    .ilike('code', code)
    .neq('id', roomId)
    .limit(1)
    .maybeSingle()

  if (duplicateError) {
    goError(duplicateError.message)
  }

  if (duplicate) {
    goError(`Room code "${code}" already exists.`)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  if (roomTypeId) {
    const { data: roomType, error: roomTypeError } = await supabase
<<<<<<< HEAD
      .from('room_types')
      .select('id')
      .eq('id', roomTypeId)
      .maybeSingle()

    if (roomTypeError) {
      goError(roomTypeError.message)
    }

    if (!roomType) {
      goError('Selected room type was not found.')
=======
      .from("room_types")
      .select("id")
      .eq("id", roomTypeId)
      .maybeSingle();

    if (roomTypeError) {
      goError(roomTypeError.message);
    }

    if (!roomType) {
      goError("Selected room type was not found.");
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  const { data, error } = await supabase
<<<<<<< HEAD
    .from('rooms')
=======
    .from("rooms")
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .update({
      room_type_id: roomTypeId || null,
      code,
      name,
      building: building || null,
      floor: floor || null,
      capacity,
    })
<<<<<<< HEAD
    .eq('id', roomId)
    .select('id')
    .maybeSingle()

  if (error) {
    goError(error.message)
  }

  if (!data) {
    goError('Room was not found or you do not have permission to update it.')
  }

  refreshRoomPages()
  goSuccess('Room updated successfully.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// ACTIVATE / DEACTIVATE ROOM
// ============================================================

export async function setRoomActive(formData: FormData) {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const roomId = getString(formData, 'room_id')
  const activeValue = getString(formData, 'is_active')

  if (!roomId) {
    goError('Room ID is required.')
  }

  if (activeValue !== 'true' && activeValue !== 'false') {
    goError('Invalid room status.')
  }

  const isActive = activeValue === 'true'

  const { data, error } = await supabase
    .from('rooms')
    .update({ is_active: isActive })
    .eq('id', roomId)
    .select('id')
    .maybeSingle()

  if (error) {
    goError(error.message)
  }

  if (!data) {
    goError('Room was not found or you do not have permission to update it.')
  }

  refreshRoomPages()
  goSuccess(isActive ? 'Room activated successfully.' : 'Room deactivated successfully.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// DELETE ROOM
// ============================================================

export async function deleteRoom(formData: FormData) {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const roomId = getString(formData, 'room_id')

  if (!roomId) {
    goError('Room ID is required.')
  }

  const { data: room, error: lookupError } = await supabase
    .from('rooms')
    .select('id,code')
    .eq('id', roomId)
    .maybeSingle()

  if (lookupError) {
    goError(lookupError.message)
  }

  if (!room) {
    goError('Room was not found.')
  }

  const { error } = await supabase.from('rooms').delete().eq('id', roomId)

  if (error) {
    if (error.code === '23503') {
      goError(
        'This room is already being used by scheduling records. Deactivate it instead of deleting it.'
      )
    }

    goError(error.message)
  }

  refreshRoomPages()
  goSuccess(`Room ${room.code} deleted successfully.`)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// ADD ROOM AVAILABILITY
// ============================================================

export async function addRoomAvailability(formData: FormData) {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const roomId = getString(formData, 'room_id')
  const semesterId = getString(formData, 'semester_id')
  const dayRaw = getString(formData, 'day_of_week')
  const startTime = getString(formData, 'start_time')
  const endTime = getString(formData, 'end_time')
  const status = getString(formData, 'status')
  const reason = getString(formData, 'reason')
  const dayOfWeek = Number(dayRaw)

  if (!roomId) {
    goError('Room is required.')
  }

  if (!semesterId) {
    goError('Semester is required.')
  }

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    goError('Please select a valid day.')
  }

  if (!startTime || !endTime) {
    goError('Start time and end time are required.')
  }

  if (endTime <= startTime) {
    goError('End time must be later than start time.')
  }

  if (!isRoomAvailabilityStatus(status)) {
    goError('Invalid room availability status.')
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id,is_active')
    .eq('id', roomId)
    .maybeSingle()

  if (roomError) {
    goError(roomError.message)
  }

  if (!room) {
    goError('Selected room was not found.')
  }

  if (!room.is_active) {
    goError('Availability cannot be added to an inactive room.')
  }

  const { data: semester, error: semesterError } = await supabase
    .from('semesters')
    .select('id')
    .eq('id', semesterId)
    .maybeSingle()

  if (semesterError) {
    goError(semesterError.message)
  }

  if (!semester) {
    goError('Selected semester was not found.')
  }

  const { error } = await supabase.from('room_availability').insert({
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    room_id: roomId,
    semester_id: semesterId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    status,
    reason: reason || null,
<<<<<<< HEAD
  })

  if (error) {
    goError(error.message)
  }

  refreshRoomPages()
  goSuccess('Room availability added successfully.')
=======
  });

  if (error) {
    goError(error.message);
  }

  refreshRoomPages();
  goSuccess("Room availability added successfully.");
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

// ============================================================
// REMOVE ROOM AVAILABILITY
// ============================================================

export async function removeRoomAvailability(formData: FormData) {
<<<<<<< HEAD
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const availabilityId = getString(formData, 'availability_id')

  if (!availabilityId) {
    goError('Availability ID is required.')
  }

  const { data, error } = await supabase
    .from('room_availability')
    .delete()
    .eq('id', availabilityId)
    .select('id')
    .maybeSingle()

  if (error) {
    goError(error.message)
  }

  if (!data) {
    goError('Availability record was not found or you do not have permission to remove it.')
  }

  refreshRoomPages()
  goSuccess('Room availability removed successfully.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}
