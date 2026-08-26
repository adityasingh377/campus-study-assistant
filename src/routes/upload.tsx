import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FileText, Plus } from "lucide-react";

import { BackLink, Screen, StepLabel } from "@/components/app-chrome";
import { useSession } from "@/lib/session";
import { PYQ_FILE, PYQ_YEARS, SUBJECT, SYLLABUS_FILE, SYLLABUS_UNITS } from "@/lib/study-data";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload syllabus and PYQs — Campus Study Assistant" },
      {
        name: "description",
        content: "Add your syllabus and previous-year question papers so we can compare them.",
      },
      { property: "og:title", content: "Upload your syllabus and PYQs" },
      {
        property: "og:description",
        content: "We read your syllabus and compare it against previous-year papers.",
      },
    ],
  }),
  component: UploadScreen;
});

function UploadScreen() {
  return null;
}
