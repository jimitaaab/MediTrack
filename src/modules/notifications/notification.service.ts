import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors";

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
) => {
  return prisma.notification.create({
    data: { userId, title, message },
  });
};

export const getNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    throw new NotFoundError("Notification not found");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { count: result.count };
};

export const deleteNotification = async (
  userId: string,
  notificationId: string,
) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    throw new NotFoundError("Notification not found");
  }
  return prisma.notification.delete({ where: { id: notificationId } });
};

const getAppointmentNotificationContext = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { select: { id: true, fullName: true } } } },
      doctor: { include: { user: { select: { id: true, fullName: true } } } },
    },
  });
  if (!appointment) return null;
  return {
    patientUserId: appointment.patient.user.id,
    doctorUserId: appointment.doctor.user.id,
    patientName: appointment.patient.user.fullName,
    doctorName: appointment.doctor.user.fullName,
    dateLabel: appointment.date.toISOString().slice(0, 10),
    timeSlot: appointment.timeSlot,
  };
};

export const notifyAppointmentAccepted = async (appointmentId: string) => {
  const ctx = await getAppointmentNotificationContext(appointmentId);
  if (!ctx) return;
  await createNotification(
    ctx.patientUserId,
    "Appointment Accepted",
    `Your appointment with ${ctx.doctorName} on ${ctx.dateLabel} at ${ctx.timeSlot} has been accepted.`,
  );
};

export const notifyAppointmentRejected = async (appointmentId: string) => {
  const ctx = await getAppointmentNotificationContext(appointmentId);
  if (!ctx) return;
  await createNotification(
    ctx.patientUserId,
    "Appointment Rejected",
    `Your appointment with ${ctx.doctorName} on ${ctx.dateLabel} at ${ctx.timeSlot} has been rejected.`,
  );
};

export const notifyAppointmentCancelledToDoctor = async (
  appointmentId: string,
) => {
  const ctx = await getAppointmentNotificationContext(appointmentId);
  if (!ctx) return;
  await createNotification(
    ctx.doctorUserId,
    "Appointment Cancelled",
    `${ctx.patientName}'s appointment on ${ctx.dateLabel} at ${ctx.timeSlot} has been cancelled.`,
  );
};

export const notifyAppointmentCancelledToPatient = async (
  appointmentId: string,
) => {
  const ctx = await getAppointmentNotificationContext(appointmentId);
  if (!ctx) return;
  await createNotification(
    ctx.patientUserId,
    "Appointment Cancelled",
    `Your appointment with ${ctx.doctorName} on ${ctx.dateLabel} at ${ctx.timeSlot} has been cancelled.`,
  );
};

export const notifyAppointmentRescheduled = async (appointmentId: string) => {
  const ctx = await getAppointmentNotificationContext(appointmentId);
  if (!ctx) return;
  await createNotification(
    ctx.patientUserId,
    "Appointment Rescheduled",
    `Your appointment with ${ctx.doctorName} has been rescheduled to ${ctx.dateLabel} at ${ctx.timeSlot}.`,
  );
};

export const notifyQueueCalled = async (queueId: string) => {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    include: {
      appointment: {
        include: {
          patient: { include: { user: { select: { id: true } } } },
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
  });
  if (!queue?.appointment) return;
  await createNotification(
    queue.appointment.patient.user.id,
    "Queue Called",
    `You are now being called for your appointment with ${queue.appointment.doctor.user.fullName} (Serial #${queue.serialNumber}). Please proceed.`,
  );
};

export const notifyNewReview = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      patient: { include: { user: { select: { fullName: true } } } },
      doctor: { include: { user: { select: { id: true } } } },
    },
  });
  if (!review) return;
  await createNotification(
    review.doctor.user.id,
    "New Review Received",
    `${review.patient.user.fullName} left you a ${review.rating}-star review.`,
  );
};

export const notifyDoctorApproved = async (doctorId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: { select: { id: true } } },
  });
  if (!doctor) return;
  await createNotification(
    doctor.user.id,
    "Doctor Approved",
    "Congratulations! Your doctor profile has been approved.",
  );
};

export const notifyDoctorRejected = async (doctorId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: { select: { id: true } } },
  });
  if (!doctor) return;
  await createNotification(
    doctor.user.id,
    "Doctor Rejected",
    "Your doctor profile has been rejected.",
  );
};

export const notifyAssistantAssigned = async (
  assistantUserId: string,
  doctorName: string,
) => {
  await createNotification(
    assistantUserId,
    "Assistant Assigned",
    `You have been assigned to assist ${doctorName}.`,
  );
};
