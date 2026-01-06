import { EmailList } from "@/components/email/email-list";

export default function SentPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-semibold">Sent Messages</h1>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <EmailList type="sent" />
      </div>
    </div>
  );
}
