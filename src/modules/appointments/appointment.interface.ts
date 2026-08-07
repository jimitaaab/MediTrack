export interface BookAppointmentInput {
  doctorId: string;
  date: string;
  timeSlot: string;
}

export interface RescheduleAppointmentInput {
  date: string;
  timeSlot: string;
}

export interface ListAppointmentsParams {
  search?: string;
  status?: string;
  date?: string;
}
