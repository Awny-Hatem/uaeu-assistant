import crypto from "crypto";
import db from "@/lib/db";
import type { AssistantSource, EscalationReason } from "@/lib/prototype-types";

type AnalyticsEvent = {
  eventType: "chat_answer" | "chat_error" | "guide_started";
  source?: AssistantSource;
  locale?: string;
  topic?: string;
  guideId?: string;
  escalationReason?: EscalationReason;
};

type CountRow = {
  label: string;
  count: number;
};

const TOPICS = [
  {
    label: "student_documents",
    keywords: ["document", "letter", "certificate", "transcript", "to whom", "service request"],
  },
  {
    label: "admissions",
    keywords: ["admission", "apply", "application", "requirements", "transfer", "undergraduate"],
  },
  {
    label: "deadlines",
    keywords: ["calendar", "deadline", "exam", "registration", "add drop", "date"],
  },
  {
    label: "support",
    keywords: ["contact", "phone", "email", "support", "service desk", "helpdesk"],
  },
  {
    label: "campus_services",
    keywords: ["library", "counseling", "medical", "housing", "visa", "transport", "vehicle"],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyTopic(query: string): string {
  const normalized = normalize(query);
  for (const topic of TOPICS) {
    if (topic.keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      return topic.label;
    }
  }
  return "general";
}

export function recordAnalyticsEvent(event: AnalyticsEvent) {
  try {
    db.prepare(`
      INSERT INTO analytics_events (
        id,
        event_type,
        source,
        locale,
        topic,
        guide_id,
        escalation_reason,
        timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      event.eventType,
      event.source ?? null,
      event.locale ?? null,
      event.topic ?? null,
      event.guideId ?? null,
      event.escalationReason ?? null,
      Date.now(),
    );
  } catch (error) {
    console.warn("Failed to write analytics event:", error);
  }
}

function countBy(field: "source" | "locale" | "topic" | "guide_id" | "escalation_reason") {
  return db
    .prepare(
      `
      SELECT COALESCE(${field}, 'none') AS label, COUNT(*) AS count
      FROM analytics_events
      GROUP BY COALESCE(${field}, 'none')
      ORDER BY count DESC, label ASC
    `,
    )
    .all() as CountRow[];
}

export function getAnalyticsSummary() {
  const total = db
    .prepare("SELECT COUNT(*) AS count FROM analytics_events")
    .get() as { count: number };

  return {
    totalEvents: total.count,
    bySource: countBy("source"),
    byLocale: countBy("locale"),
    byTopic: countBy("topic"),
    byGuide: countBy("guide_id"),
    byEscalationReason: countBy("escalation_reason"),
  };
}
