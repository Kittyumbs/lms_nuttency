export type IssueType = "Task" | "Bug" | "Story";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  issueType: IssueType;
  createdAt: Date;
  urls: { url: string }[];
  deadline?: Date;
  status: string;
  personnel?: string; // New field for implementation personnel
}

export interface TicketFormData {
    title: string;
    description: string;
    personnel?: string; // New field for implementation personnel
    priority: string;
    issueType: IssueType;
    urls: { url: string }[];
    deadline?: Date;
  }

export interface Column {
  id: string;
  title: string;
  tickets: Ticket[];
}
