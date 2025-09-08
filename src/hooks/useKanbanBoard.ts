import { useState, useRef, useCallback, useEffect } from "react";
import { Column, Ticket, TicketFormData } from "../types/kanban";
import { initialColumns } from "../utils/constants";
import { moveTicketBetweenColumns, reorderColumnsOnDragEnd } from "../utils/columnUtils";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

export const useKanbanBoard = () => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const nextTaskNumber = useRef<number>(1); // Will be updated by Firestore data

  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets: Ticket[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          priority: data.priority,
          issueType: data.issueType,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          urls: data.urls || [],
          deadline: data.deadline ? data.deadline.toDate() : undefined,
        };
      });

      const updatedColumns = initialColumns.map(col => ({
        ...col,
        tickets: tickets.filter(ticket => ticket.status === col.id),
      }));
      setColumns(updatedColumns);

      // Update nextTaskNumber based on existing tickets
      const maxTaskNum = tickets.reduce((max, ticket) => {
        const match = ticket.id.match(/TASK-(\d+)/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      nextTaskNumber.current = maxTaskNum + 1;
    });

    return () => unsubscribe();
  }, []);

  const addTicket = useCallback(async (ticketData: TicketFormData) => {
    const newId = `TASK-${nextTaskNumber.current}`;
    nextTaskNumber.current++;

    const newTicket: Omit<Ticket, "id"> = {
      ...ticketData,
      createdAt: new Date(),
      urls: ticketData.urls || [],
      deadline: ticketData.deadline ? new Date(ticketData.deadline) : undefined,
      status: "todo",
    };

    await addDoc(collection(db, "tickets"), newTicket);
  }, []);

  const updateTicket = useCallback(async (ticketId: string, updatedData: Partial<Ticket>) => {
    const ticketRef = doc(db, "tickets", ticketId);
    await updateDoc(ticketRef, updatedData);
  }, []);

  const deleteTicket = useCallback(async (ticketId: string) => {
    const ticketRef = doc(db, "tickets", ticketId);
    await deleteDoc(ticketRef);
  }, []);

  const moveTicket = useCallback(async (ticketId: string, newStatus: string) => {
    const ticketRef = doc(db, "tickets", ticketId);
    await updateDoc(ticketRef, { status: newStatus });
  }, []);

  const handleDragEnd = useCallback(async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      // Reordering within the same column (not directly supported by Firestore for simple reorder)
      // For now, we'll just update the status if it's a move between columns
      // A more complex solution would involve adding an 'order' field to tickets
    } else {
      // Moving between columns
      const ticketRef = doc(db, "tickets", draggableId);
      await updateDoc(ticketRef, { status: destination.droppableId });
    }
  }, []);

  return {
    columns,
    addTicket,
    updateTicket,
    deleteTicket,
    moveTicket,
    handleDragEnd,
    setColumns, // setColumns is still returned for potential local state manipulation if needed, but primary updates will be via Firestore
  };
};
