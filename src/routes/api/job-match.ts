import { createFileRoute } from "@tanstack/react-router";
import type { AIModelType } from "@/config/ai";
import type { ResumeData } from "@/types/resume";
import { generateAIJson } from "@/lib/ai/client";
import { AIRequestError, getErrorMessage } from "@/lib/ai/errors";
import { normalizeJobMatchResult } from "@/lib/ai/jobMatch";
import { buildJobMatchSystemPrompt } from "@/lib/ai/prompts";

const buildResumeSnapshot = (resume: ResumeData) => ({
  title: resume.title,
  basic: {
    name: resume.basic?.name,
    title: resume.basic?.title,
    employementStatus: resume.basic?.employementStatus,
    location: resume.basic?.location,
    customFields: resume.basic?.customFields,
  },
  skillContent: resume.skillContent,
  selfEvaluationContent: resume.selfEvaluationContent,
  education: resume.education?.map((item) => ({
    id: item.id,
    school: item.school,
    major: item.major,
    degree: item.degree,
    startDate: item.startDate,
    endDate: item.endDate,
    gpa: item.gpa,
    description: item.description,
  })),
  experience: resume.experience?.map((item) => ({
    id: item.id,
    company: item.company,
    position: item.position,
    date: item.date,
    details: item.details,
  })),
  projects: resume.projects?.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    date: item.date,
    description: item.description,
    link: item.link,
    linkLabel: item.linkLabel,
  })),
  customData: resume.customData,
});

const normalizeResponseLanguage = (language?: string) => {
  if (language === "en" || language === "English") return "English";
  return "Chinese";
};

export const Route = createFileRoute("/api/job-match")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            apiKey,
            model,
            modelType,
            apiEndpoint,
            reasoningEffort,
            reasoningEnabled,
            resume,
            jobTitle,
            company,
            jdText,
            language,
          } = body as {
            apiKey: string;
            model?: string;
            modelType: AIModelType;
            apiEndpoint?: string;
            reasoningEffort?: string;
            reasoningEnabled?: boolean;
            resume?: ResumeData;
            jobTitle?: string;
            company?: string;
            jdText?: string;
            language?: string;
          };

          if (!apiKey || !modelType || !resume || !jdText?.trim()) {
            return Response.json(
              {
                error: {
                  message: "Missing API key, model type, resume or job description",
                },
              },
              { status: 400 }
            );
          }

          const result = await generateAIJson(
            {
              provider: modelType,
              apiKey,
              model,
              apiEndpoint,
              reasoningEffort,
              reasoningEnabled,
              responseFormat: {
                type: "json_object",
              },
              temperature: 0.2,
              messages: [
                {
                  role: "system",
                  content: buildJobMatchSystemPrompt(
                    normalizeResponseLanguage(language)
                  ),
                },
                {
                  role: "user",
                  content: JSON.stringify(
                    {
                      jobTarget: {
                        title: jobTitle ?? "",
                        company: company ?? "",
                        jdText,
                      },
                      resume: buildResumeSnapshot(resume),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
            normalizeJobMatchResult
          );

          return Response.json({ result: result.data });
        } catch (error) {
          console.error("Error in job match:", error);
          const status = error instanceof AIRequestError ? error.status : 500;

          return Response.json(
            {
              error: {
                message: getErrorMessage(error, "Failed to match job"),
                code: error instanceof AIRequestError ? error.code : undefined,
              },
            },
            { status }
          );
        }
      },
    },
  },
});
