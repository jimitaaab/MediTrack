export interface UpdatePatientProfileInput {
  fullName?: string;
  phone?: string;
  profilePhoto?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  bloodGroup?: string;
}