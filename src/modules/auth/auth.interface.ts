export interface RegisterPatientInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface RegisterDoctorInput extends RegisterPatientInput {
  specializationId: string;
  hospitalName?: string;
  clinicAddress?: string;
  consultationFee: number;
  latitude?: number;
  longitude?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
}