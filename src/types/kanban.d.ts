export type IssueType = "Task" | "Bug" | "Story";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  issueType: IssueType;
  createdAt: Date;
  urls: string[];
  deadline?: Date;
  status: string;
}

export interface TicketFormData {
    title: string;
    description: string;
    priority: string;
    issueType: IssueType;
    urls: string[];
    deadline?: Date;
  }

export interface Column {
  id: string;
  title: string;
  tickets: Ticket[];
}