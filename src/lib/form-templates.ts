import walrusHero from "@/assets/walrus/walrus-hero.jpg";
import walrusSessionIllustration from "@/assets/walrus/walrus-session-illustration.jpg";
import walrusThumbsUp from "@/assets/walrus/wal-thumbs-up.D30ahwW3_2d9Bes.webp";
import type { AttachmentValue, FormBranding, FormField, ResponsePolicy } from "@/types";

export const WALRUS_SESSIONS_REVIEW_ADMIN =
  "0xc4d6ee019649edba41d5a5ed1081fe3c86afc41fea413195dd6ecdd0f6090e54";

export type FormTemplate = {
  id: string;
  name: string;
  category: string;
  summary: string;
  title: string;
  description: string;
  branding?: FormBranding;
  responsePolicy?: ResponsePolicy;
  fields: FormField[];
  adminAddresses: string[];
  reviewerAddresses?: string[];
};

function bundledImage(
  blobId: string,
  name: string,
  url: string,
  type = "image/jpeg",
): AttachmentValue {
  return {
    blobId,
    storageMode: "local",
    name,
    type,
    size: 0,
    url,
  };
}

export function createWalrusSessionTemplate(): FormTemplate {
  return {
    id: "walrus-session",
    name: "Walrus Session registration",
    category: "Application form",
    summary:
      "Official submission-style form with links, visuals, video, feedback, and admin confirmation.",
    title: "Walrus Session 2 - Form tooling",
    description: "Please use this form to register your form project.",
    branding: {
      coverImage: bundledImage(
        "formrus-asset-walrus-session-cover",
        "Walrus Session cover",
        walrusHero,
      ),
      logoImage: bundledImage(
        "formrus-asset-walrus-session-card",
        "Walrus Session card",
        walrusSessionIllustration,
      ),
      successImage: bundledImage(
        "formrus-asset-walrus-session-success",
        "Walrus Session success",
        walrusThumbsUp,
        "image/webp",
      ),
      coverPlacement: "banner",
      logoPlacement: "left",
      responseLayout: "stepper",
      successTheme: "celebration",
      successEffect: "splash",
      successTitle: "Submission received",
      successMessage:
        "Your Walrus Session entry has been stored. Keep the response blob ID for your records.",
    },
    responsePolicy: {
      allowMultipleSubmissions: false,
      saveIncompleteResponses: true,
    },
    adminAddresses: [WALRUS_SESSIONS_REVIEW_ADMIN],
    fields: [
      { id: "project_name", type: "text", label: "Project name", required: true },
      {
        id: "session",
        type: "dropdown",
        label: "Please select the session",
        required: true,
        options: ["Walrus Session 2 - Form tooling", "Walrus Session 2 - Best feedback"],
      },
      { id: "team_leader_name", type: "text", label: "Team Leader Name", required: true },
      { id: "team_leader_email", type: "email", label: "Team Leader Email", required: true },
      {
        id: "newsletter_opt_in",
        type: "checkbox",
        label: "Check this if you would be open to receiving our newsletter",
        required: false,
        options: ["Yes, send updates"],
      },
      {
        id: "telegram_handle",
        type: "text",
        label: "Team Leader Telegram Handle",
        required: false,
      },
      { id: "discord_handle", type: "text", label: "Discord handle", required: true },
      { id: "country", type: "text", label: "Country", required: true },
      {
        id: "deepsurge_project_link",
        type: "url",
        label: "DeepSurge project Link",
        required: true,
      },
      { id: "form_link", type: "url", label: "Form Link", required: true },
      {
        id: "judge_admin_confirmation",
        type: "checkbox",
        label: `I confirm ${WALRUS_SESSIONS_REVIEW_ADMIN} is an admin and can review this application`,
        required: true,
        options: ["Confirmed"],
      },
      {
        id: "workflow",
        type: "richText",
        label: "Please describe the workflow and functionalities of your forms",
        required: true,
      },
      {
        id: "visuals",
        type: "screenshot",
        label: "Share any visuals of your form",
        required: false,
      },
      {
        id: "demo_video",
        type: "video",
        label: "Demo video of the form (sub 3 minutes)",
        required: true,
      },
      {
        id: "differentiators",
        type: "richText",
        label: "Which features sets your solution apart from the rest?",
        required: true,
      },
      {
        id: "walrus_feedback",
        type: "richText",
        label: "Feedback about building on Walrus",
        required: true,
      },
      { id: "x_account", type: "text", label: "X account", required: false },
      { id: "x_tweet_link", type: "url", label: "Share link to X tweet", required: true },
      { id: "sui_address", type: "text", label: "SUI address", required: true },
      { id: "github", type: "url", label: "GitHub", required: true },
      { id: "session_feedback", type: "richText", label: "Session Feedback", required: false },
      { id: "deepsurge_feedback", type: "richText", label: "DeepSurge Feedback", required: false },
      {
        id: "rules_confirmation",
        type: "checkbox",
        label:
          "I confirm that I have read, understood, and agree to the rules and regulations of the session",
        required: true,
        options: ["I agree"],
      },
    ],
  };
}

export function createBugReportTemplate(): FormTemplate {
  return {
    id: "bug-report",
    name: "Bug report",
    category: "Support workflow",
    summary:
      "Collect reproducible product bugs with severity, screenshots, URLs, and reviewer status.",
    title: "Bug Report",
    description: "Tell us what broke so the team can reproduce, prioritize, and fix it.",
    branding: {
      coverImage: bundledImage(
        "formrus-asset-walrus-bug-cover",
        "Walrus feedback cover",
        walrusHero,
      ),
      coverPlacement: "banner",
      logoPlacement: "hidden",
      successTheme: "clean",
      successEffect: "none",
      successTitle: "Bug report stored",
      successMessage: "Thanks. Your report is now available for the team to review.",
    },
    responsePolicy: {
      allowMultipleSubmissions: true,
      saveIncompleteResponses: true,
    },
    adminAddresses: [WALRUS_SESSIONS_REVIEW_ADMIN],
    fields: [
      { id: "summary", type: "text", label: "Short summary", required: true },
      {
        id: "severity",
        type: "dropdown",
        label: "Severity",
        required: true,
        options: ["Low", "Medium", "High", "Critical"],
      },
      {
        id: "area",
        type: "dropdown",
        label: "Product area",
        required: true,
        options: ["Builder", "Public form", "Admin dashboard", "Walrus upload", "Other"],
      },
      { id: "steps", type: "richText", label: "Steps to reproduce", required: true },
      { id: "expected", type: "longText", label: "Expected behavior", required: true },
      { id: "actual", type: "longText", label: "Actual behavior", required: true },
      { id: "page_url", type: "url", label: "Page URL", required: false },
      { id: "screenshot", type: "screenshot", label: "Screenshot or recording", required: false },
      { id: "contact_email", type: "email", label: "Contact email", required: false },
    ],
  };
}

export function createFeatureRequestTemplate(): FormTemplate {
  return {
    id: "feature-request",
    name: "Feature request",
    category: "Product feedback",
    summary: "Collect ideas, impact, priority, links, and ratings for roadmap review.",
    title: "Feature Request",
    description: "Share an idea and help the team understand who it helps and why it matters.",
    branding: {
      coverImage: bundledImage(
        "formrus-asset-walrus-feature-cover",
        "Walrus roadmap cover",
        walrusHero,
      ),
      coverPlacement: "banner",
      logoPlacement: "hidden",
      successTheme: "blue",
      successEffect: "confetti",
      successTitle: "Feature request saved",
      successMessage: "Your idea has been added to the review queue.",
    },
    responsePolicy: {
      allowMultipleSubmissions: true,
      saveIncompleteResponses: true,
    },
    adminAddresses: [WALRUS_SESSIONS_REVIEW_ADMIN],
    fields: [
      { id: "feature_title", type: "text", label: "Feature title", required: true },
      {
        id: "user_type",
        type: "dropdown",
        label: "Who needs this?",
        required: true,
        options: ["Builder", "Respondent", "Admin", "Developer", "Other"],
      },
      { id: "problem", type: "richText", label: "What problem does this solve?", required: true },
      { id: "proposed_solution", type: "richText", label: "Proposed solution", required: false },
      { id: "priority", type: "star", label: "How important is this?", required: true },
      { id: "reference_url", type: "url", label: "Reference link", required: false },
      { id: "mockup", type: "screenshot", label: "Mockup or example", required: false },
      { id: "email", type: "email", label: "Email for follow-up", required: false },
    ],
  };
}

export function createCommunitySurveyTemplate(): FormTemplate {
  return {
    id: "community-survey",
    name: "Community survey",
    category: "Survey",
    summary: "Collect satisfaction, preferences, open feedback, and community links.",
    title: "Community Feedback Survey",
    description:
      "Help us understand what is working, what is missing, and what should improve next.",
    branding: {
      coverImage: bundledImage(
        "formrus-asset-walrus-survey-cover",
        "Walrus survey cover",
        walrusHero,
      ),
      coverPlacement: "background",
      logoPlacement: "hidden",
      successTheme: "celebration",
      successEffect: "confetti",
      successTitle: "Thanks for the feedback",
      successMessage: "Your survey response has been stored for the team.",
    },
    responsePolicy: {
      allowMultipleSubmissions: true,
      saveIncompleteResponses: true,
    },
    adminAddresses: [WALRUS_SESSIONS_REVIEW_ADMIN],
    fields: [
      {
        id: "role",
        type: "dropdown",
        label: "How do you use the product?",
        required: true,
        options: ["Builder", "Respondent", "Community member", "Partner", "Other"],
      },
      { id: "rating", type: "star", label: "Overall experience", required: true },
      { id: "favorite_part", type: "longText", label: "What worked well?", required: true },
      { id: "friction", type: "richText", label: "What felt confusing or slow?", required: true },
      {
        id: "missing",
        type: "checkbox",
        label: "What should we add next?",
        required: false,
        options: ["Wallet login", "More templates", "Team accounts", "Analytics", "More exports"],
      },
      { id: "proof_url", type: "url", label: "Relevant link", required: false },
      { id: "contact", type: "email", label: "Email if we can follow up", required: false },
    ],
  };
}

export function createGrantApplicationTemplate(): FormTemplate {
  return {
    id: "grant-application",
    name: "Application form",
    category: "Application intake",
    summary: "Collect project applications with team info, links, media, and long-form answers.",
    title: "Project Application",
    description:
      "Submit your project for review. Include links, demo materials, and clear workflow details.",
    branding: {
      coverImage: bundledImage(
        "formrus-asset-walrus-application-cover",
        "Walrus application cover",
        walrusHero,
      ),
      coverPlacement: "banner",
      logoPlacement: "hidden",
      successTheme: "clean",
      successEffect: "none",
      successTitle: "Application submitted",
      successMessage: "Your application has been captured and is ready for admin review.",
    },
    responsePolicy: {
      allowMultipleSubmissions: false,
      saveIncompleteResponses: true,
    },
    adminAddresses: [WALRUS_SESSIONS_REVIEW_ADMIN],
    fields: [
      { id: "project_name", type: "text", label: "Project name", required: true },
      { id: "team_name", type: "text", label: "Team or company name", required: true },
      { id: "lead_email", type: "email", label: "Lead email", required: true },
      { id: "country", type: "text", label: "Country", required: true },
      { id: "project_link", type: "url", label: "Project link", required: true },
      { id: "github", type: "url", label: "GitHub repository", required: true },
      { id: "workflow", type: "richText", label: "Workflow and functionality", required: true },
      { id: "differentiator", type: "richText", label: "What sets this apart?", required: true },
      { id: "visual", type: "screenshot", label: "Screenshots or visuals", required: false },
      { id: "demo_video", type: "video", label: "Demo video", required: false },
      { id: "sui_address", type: "text", label: "SUI address", required: true },
    ],
  };
}

export function getFormTemplates(): FormTemplate[] {
  return [
    createWalrusSessionTemplate(),
    createBugReportTemplate(),
    createFeatureRequestTemplate(),
    createCommunitySurveyTemplate(),
    createGrantApplicationTemplate(),
  ];
}
