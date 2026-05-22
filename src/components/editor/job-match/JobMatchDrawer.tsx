import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  Loader2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "@/i18n/compat/client";
import { useRouter } from "@/lib/navigation";
import { AI_MODEL_CONFIGS } from "@/config/ai";
import { applyJobMatchSuggestion } from "@/lib/jobMatchApply";
import { cn } from "@/lib/utils";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useResumeStore } from "@/store/useResumeStore";
import type {
  AIJobMatchKeywordStatus,
  AIJobMatchResult,
  AIJobMatchSuggestion,
} from "@/types/resume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface JobMatchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const keywordClasses: Record<AIJobMatchKeywordStatus, string> = {
  matched:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  weak:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  missing:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
};

const impactClasses: Record<AIJobMatchSuggestion["impact"], string> = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
  medium:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
  low: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
};

const getScoreClass = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

export function JobMatchDrawer({ open, onOpenChange }: JobMatchDrawerProps) {
  const t = useTranslations("jobMatch");
  const locale = useLocale();
  const router = useRouter();
  const { activeResume, updateResume } = useResumeStore();
  const {
    selectedModel,
    doubaoApiKey,
    doubaoModelId,
    deepseekApiKey,
    deepseekModelId,
    openaiApiKey,
    openaiModelId,
    openaiApiEndpoint,
    openaiReasoningEffort,
    openaiReasoningEnabled,
    geminiApiKey,
    geminiModelId,
    isConfigured,
  } = useAIConfigStore();

  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jdText, setJdText] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>(
    []
  );

  const activeResumeId = activeResume?.id;

  useEffect(() => {
    if (!open || !activeResume) return;

    setJobTitle(activeResume.jobTarget?.title ?? "");
    setCompany(activeResume.jobTarget?.company ?? "");
    setJdText(activeResume.jobTarget?.jdText ?? "");
    setDismissedSuggestionIds([]);
  }, [activeResumeId, open]);

  const analysis = activeResume?.jobTarget?.latestAnalysis;
  const visibleSuggestions = useMemo(
    () =>
      (analysis?.suggestions ?? []).filter(
        (suggestion) => !dismissedSuggestionIds.includes(suggestion.id)
      ),
    [analysis?.suggestions, dismissedSuggestionIds]
  );

  const getProviderConfig = () => {
    const config = AI_MODEL_CONFIGS[selectedModel];
    const apiKey =
      selectedModel === "doubao"
        ? doubaoApiKey
        : selectedModel === "openai"
          ? openaiApiKey
          : selectedModel === "gemini"
            ? geminiApiKey
            : deepseekApiKey;
    const modelId =
      selectedModel === "doubao"
        ? doubaoModelId
        : selectedModel === "openai"
          ? openaiModelId
          : selectedModel === "gemini"
            ? geminiModelId
            : deepseekModelId;

    return {
      apiKey,
      model: config.requiresModelId ? modelId : config.defaultModel,
    };
  };

  const saveJobTarget = (latestAnalysis?: AIJobMatchResult) => {
    if (!activeResume) return;

    updateResume(activeResume.id, {
      jobTarget: {
        title: jobTitle.trim(),
        company: company.trim(),
        jdText: jdText.trim(),
        updatedAt: new Date().toISOString(),
        latestAnalysis:
          latestAnalysis ?? activeResume.jobTarget?.latestAnalysis,
      },
    });
  };

  const handleRunMatch = async () => {
    if (!activeResume) return;

    if (!isConfigured()) {
      toast.error(
        <span>
          {t("error.configRequired")}{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-4"
            onClick={() => router.push("/app/dashboard/ai")}
          >
            {t("error.configure")}
          </button>
        </span>
      );
      return;
    }

    if (!jdText.trim()) {
      toast.error(t("error.jdRequired"));
      return;
    }

    setIsMatching(true);

    try {
      const providerConfig = getProviderConfig();
      const response = await fetch("/api/job-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...providerConfig,
          modelType: selectedModel,
          apiEndpoint: selectedModel === "openai" ? openaiApiEndpoint : undefined,
          reasoningEffort:
            selectedModel === "openai" ? openaiReasoningEffort : undefined,
          reasoningEnabled:
            selectedModel === "openai" ? openaiReasoningEnabled : undefined,
          resume: activeResume,
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jdText: jdText.trim(),
          language: locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          data?.error?.message ||
          data?.message ||
          `${t("error.matchFailed")} (${response.status})`;
        throw new Error(message);
      }

      const result = data.result as AIJobMatchResult;
      updateResume(activeResume.id, {
        jobTarget: {
          title: jobTitle.trim(),
          company: company.trim(),
          jdText: jdText.trim(),
          updatedAt: new Date().toISOString(),
          latestAnalysis: result,
        },
      });
      setDismissedSuggestionIds([]);
      toast.success(t("success.matched"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("error.matchFailed")
      );
    } finally {
      setIsMatching(false);
    }
  };

  const handleApplySuggestion = (suggestion: AIJobMatchSuggestion) => {
    if (!activeResume) return;

    const result = applyJobMatchSuggestion(activeResume, suggestion);

    if (!result.applied) {
      toast.error(t("error.applyFailed"));
      return;
    }

    updateResume(activeResume.id, result.resume);
    setDismissedSuggestionIds((ids) => [...ids, suggestion.id]);
    toast.success(t("success.applied"));
  };

  const handleIgnoreSuggestion = (suggestionId: string) => {
    setDismissedSuggestionIds((ids) => [...ids, suggestionId]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="top-0 flex h-screen w-full flex-col gap-0 p-0 sm:max-w-[720px]"
      >
        <SheetHeader className="border-b px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <SheetTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t("title")}
              </SheetTitle>
              <SheetDescription>{t("description")}</SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            <Card className="rounded-md">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                  {t("target.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("target.jobTitle")}</Label>
                    <Input
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                      placeholder={t("target.jobTitlePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("target.company")}</Label>
                    <Input
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder={t("target.companyPlaceholder")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("target.jd")}</Label>
                  <Textarea
                    value={jdText}
                    onChange={(event) => setJdText(event.target.value)}
                    placeholder={t("target.jdPlaceholder")}
                    className="min-h-[180px] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {analysis ? t("target.saved") : t("target.notSaved")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => saveJobTarget()}
                      disabled={!activeResume || isMatching}
                    >
                      {t("actions.save")}
                    </Button>
                    <Button onClick={handleRunMatch} disabled={isMatching}>
                      {isMatching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {isMatching ? t("actions.matching") : t("actions.match")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!analysis && (
              <div className="rounded-md border border-dashed p-8 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">{t("empty.title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("empty.description")}
                </p>
              </div>
            )}

            {analysis && (
              <div className="space-y-5">
                <Card className="rounded-md">
                  <CardContent className="grid gap-5 p-5 md:grid-cols-[140px_1fr]">
                    <div>
                      <div
                        className={cn(
                          "text-5xl font-semibold leading-none",
                          getScoreClass(analysis.score)
                        )}
                      >
                        {analysis.score}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("result.score")}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm leading-6">{analysis.summary}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ResultList title={t("result.strengths")} items={analysis.strengths} />
                        <ResultList title={t("result.gaps")} items={analysis.gaps} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">
                      {t("result.keywords")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 p-4 pt-2">
                    {analysis.keywords.length > 0 ? (
                      analysis.keywords.map((keyword) => (
                        <Badge
                          key={`${keyword.keyword}-${keyword.status}`}
                          variant="outline"
                          className={cn(
                            "max-w-full gap-1 rounded-md",
                            keywordClasses[keyword.status]
                          )}
                          title={keyword.evidence}
                        >
                          {keyword.keyword}
                          <span className="opacity-70">
                            {t(`keywordStatus.${keyword.status}`)}
                          </span>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("result.noKeywords")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      {t("suggestions.title")}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {t("suggestions.count", {
                        count: visibleSuggestions.length,
                      })}
                    </span>
                  </div>

                  {visibleSuggestions.length > 0 ? (
                    visibleSuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="rounded-md">
                        <CardContent className="space-y-4 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {t(`sections.${suggestion.sectionId}`)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md",
                                impactClasses[suggestion.impact]
                              )}
                            >
                              {t(`impact.${suggestion.impact}`)}
                            </Badge>
                          </div>

                          <div className="grid gap-3">
                            <TextBlock
                              label={t("suggestions.original")}
                              value={suggestion.originalText}
                              tone="muted"
                            />
                            <TextBlock
                              label={t("suggestions.suggested")}
                              value={suggestion.suggestedText}
                              tone="primary"
                            />
                          </div>

                          {suggestion.reason && (
                            <p className="text-sm leading-6 text-muted-foreground">
                              {suggestion.reason}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApplySuggestion(suggestion)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              {t("actions.apply")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleIgnoreSuggestion(suggestion.id)
                              }
                            >
                              {t("actions.ignore")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {t("suggestions.empty")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">-</p>
      )}
    </div>
  );
}

function TextBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "primary";
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "rounded-md border p-3 text-sm leading-6",
          tone === "primary"
            ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
            : "bg-muted/30 text-muted-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
