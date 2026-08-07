export interface UpdateDoctorProfileInput {
  fullName?: string;
  phone?: string;
  profilePhoto?: string;
  specializationId?: string;
  hospitalName?: string;
  clinicAddress?: string;
  latitude?: number;
  longitude?: number;
  consultationFee?: number;
}

export interface ListDoctorsParams {
  search?: string;
  specialization?: string;
  sortBy?: string;
}

export interface NearbyDoctorsParams {
  lat: number;
  lng: number;
  specialization?: string;
  radius?: number;
}

export interface CreateScheduleInput {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
}

export interface UpdateScheduleInput {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  slotDurationMinutes?: number;
}

export interface UpdateClinicLocationInput {
  clinicAddress?: string;
  latitude?: number;
  longitude?: number;
}