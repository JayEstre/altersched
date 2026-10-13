import { Constants, type Enums } from '@/lib/database.types'

/** Database enum values with type guards (generated from lib/database.types.ts). */

export type AvailabilityType = Enums<'availability_type'>
export type RoomAvailabilityStatus = Enums<'room_availability_status'>
export type AccountStatus = Enums<'account_status'>

export const AVAILABILITY_TYPES = Constants.public.Enums.availability_type
export const ROOM_AVAILABILITY_STATUSES = Constants.public.Enums.room_availability_status
export const ACCOUNT_STATUSES = Constants.public.Enums.account_status

const includes = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value)

export const isAvailabilityType = (value: string): value is AvailabilityType =>
  includes(AVAILABILITY_TYPES, value)

export const isRoomAvailabilityStatus = (value: string): value is RoomAvailabilityStatus =>
  includes(ROOM_AVAILABILITY_STATUSES, value)

export const isAccountStatus = (value: string): value is AccountStatus =>
  includes(ACCOUNT_STATUSES, value)
