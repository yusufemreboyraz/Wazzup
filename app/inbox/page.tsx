import { EmailList } from "@/components/email/email-list";
import { Separator } from "@/components/ui/separator";

export default function InboxPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-semibold">Inbox</h1>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <EmailList type="inbox" />
      </div>
    </div>
  );
}
