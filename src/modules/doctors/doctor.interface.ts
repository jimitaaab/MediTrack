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