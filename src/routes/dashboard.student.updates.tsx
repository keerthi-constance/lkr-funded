import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FolderPlus, MessageCircle, Send, ImagePlus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getMyProject } from "@/backend/functions";

export const Route = createFileRoute("/dashboard/student/updates")({
  loader: async () => ({ project: await getMyProject() }),
  component: UpdatesPage,
});

const initialComments = [
  { id: "c1", from: "Nishan A.", text: "How is the prototype v2 holding up in field tests?", reply: "" },
  { id: "c2", from: "Diaspora Trust", text: "Excited to see the results — keep us posted!", reply: "" },
];

function UpdatesPage() {
  const { project } = Route.useLoaderData();
  const [updates, setUpdates] = useState(project?.updates ?? []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [comments, setComments] = useState(initialComments);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  if (!project) {
    return (
      <DashboardShell role="student">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/15 text-teal">
            <FolderPlus className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">No project yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Submit your research project first — you'll be able to post updates once it's live.
          </p>
          <Link to="/dashboard/student/submit">
            <Button className="mt-5 bg-teal-gradient text-navy-deep">Submit Your Project</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const post = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and description first.");
      return;
    }
    setUpdates([{ date: "Just now", title, body }, ...updates]);
    setTitle("");
    setBody("");
    toast.success("Update posted to your donors.");
  };

  const reply = (id: string) => {
    const text = replyDrafts[id];
    if (!text?.trim()) return;
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, reply: text } : c)));
    setReplyDrafts((d) => ({ ...d, [id]: "" }));
    toast.success("Reply posted.");
  };

  return (
    <DashboardShell role="student">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h1 className="font-display text-2xl font-bold">Updates & Engagement</h1>
            <p className="text-muted-foreground">Keep your donors informed and reply to their questions.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold">Post a new update</h3>
            <div className="mt-4 space-y-3">
              <Input placeholder="Update title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea rows={4} placeholder="Share your progress with donors..." value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm"><ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Attach media</Button>
                <Button className="bg-teal-gradient text-navy-deep" onClick={post}><Send className="mr-1.5 h-3.5 w-3.5" /> Post Update</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {updates.map((u, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-base font-semibold">{u.title}</h3>
                  <span className="text-xs text-muted-foreground">{u.date}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{u.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 lg:h-fit">
          <h3 className="mb-4 flex items-center gap-2 font-display font-semibold">
            <MessageCircle className="h-4 w-4 text-teal" /> Donor Comments
          </h3>
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-3">
                <div className="text-sm font-medium">{c.from}</div>
                <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
                {c.reply ? (
                  <div className="mt-2 rounded-lg bg-teal/10 p-2 text-xs text-teal">You: {c.reply}</div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Write a reply..."
                      value={replyDrafts[c.id] ?? ""}
                      onChange={(e) => setReplyDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    />
                    <Button size="sm" className="h-8" onClick={() => reply(c.id)}>Reply</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
