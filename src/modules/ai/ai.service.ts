import { prisma } from "../../config/prisma";
import env from "../../config/env";
import {
  AppError,
  ForbiddenError,
  ValidationError,
} from "../../shared/errors";
import httpStatus from "http-status-codes";

const URGENCY_LEVELS = ["Low", "Medium", "High", "Emergency"] as const;

const DISCLAIMER =
  "This is general health information, not a medical diagnosis. Always consult a qualified doctor.";

interface ChatbotResult {
  urgencyLevel: (typeof URGENCY_LEVELS)[number];
  suggestion: string;
  specialization: string;
}

interface AskChatbotInput {
  symptoms: string;
}

// Get patient profile using logged-in user's ID
const getPatientByUserId = async (userId: string) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    throw new ForbiddenError("Patient profile not found");
  }

  return patient;
};

// Validate symptoms
const validateSymptoms = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("symptoms is required");
  }

  const symptoms = value.trim();

  if (symptoms.length < 10 || symptoms.length > 2000) {
    throw new ValidationError(
      "symptoms must be between 10 and 2000 characters",
    );
  }

  return symptoms;
};

// System prompt for the AI
const buildSystemPrompt = (): string => {
  return [
    "You are a medical triage assistant.",
    "Based ONLY on the patient's symptom description, respond with a single JSON object.",
    "",
    'The JSON must contain these keys:',
    '"urgencyLevel": one of "Low", "Medium", "High", "Emergency"',
    '"suggestion": a general 1-2 line suggestion for the patient (not a diagnosis, no specific drug dosages)',
    '"specialization": a recommended doctor specialization to consult',
    `"disclaimer": "${DISCLAIMER}"`,
    "",
    "Do not invent symptoms.",
    "Keep the suggestion general and actionable.",
  ].join("\n");
};

// Call Groq API
const callLlm = async (
  symptoms: string,
): Promise<ChatbotResult> => {
  // Get Groq API key from environment
  const apiKey = env.groq_api_key;

  if (!apiKey) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "AI chatbot is not configured",
    );
  }

  // Groq model
  const model =
    process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

  // Send request to Groq
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model,
        temperature: 0.3,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: symptoms,
          },
        ],
      }),
    },
  );

  // Handle Groq API errors
  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    console.error(
      "Groq API error:",
      response.status,
      detail,
    );

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `AI service request failed (${response.status})`,
    );
  }

  // Read Groq response
  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "AI service returned no content",
    );
  }

  // Parse JSON returned by Groq
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "AI service returned invalid JSON",
    );
  }

  const obj = parsed as Record<string, unknown>;

  const urgencyLevel = obj.urgencyLevel;
  const suggestion = obj.suggestion;
  const specialization = obj.specialization;

  // Validate AI response
  if (
    typeof urgencyLevel !== "string" ||
    !(URGENCY_LEVELS as readonly string[]).includes(
      urgencyLevel,
    ) ||
    typeof suggestion !== "string" ||
    typeof specialization !== "string"
  ) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "AI service returned an unexpected response shape",
    );
  }

  return {
    urgencyLevel:
      urgencyLevel as ChatbotResult["urgencyLevel"],
    suggestion,
    specialization,
  };
};

// Ask chatbot
export const askChatbot = async (
  userId: string,
  payload: AskChatbotInput,
) => {
  // Find patient
  const patient = await getPatientByUserId(userId);

  // Validate symptoms
  const symptoms = validateSymptoms(payload.symptoms);

  // Call Groq
  const result = await callLlm(symptoms);

  // Save chatbot response
  const log = await prisma.chatbotLog.create({
    data: {
      patientId: patient.id,
      question: symptoms,
      response: result.suggestion,
      urgencyLevel: result.urgencyLevel,
      suggestedSpecialization: result.specialization,
    },
  });

  return {
    id: log.id,
    question: log.question,
    urgencyLevel: result.urgencyLevel,
    suggestion: result.suggestion,
    specialization: result.specialization,
    disclaimer: DISCLAIMER,
    createdAt: log.createdAt,
  };
};

// Get chatbot history
export const getChatbotHistory = async (
  userId: string,
) => {
  const patient = await getPatientByUserId(userId);

  return prisma.chatbotLog.findMany({
    where: {
      patientId: patient.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};