import React, { useState, useCallback, useMemo, useEffect } from "react";
import "./KanbanBoard.css";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
  DroppableStateSnapshot
} from "react-beautiful-dnd";
import {
  Button,
  Card,
  Avatar,
  Input,
  Select,
  Modal,
  message,
  Tag
} from "antd";
import {
  PlusOutlined,
  UserOutlined,
  CheckSquareOutlined,
  BugOutlined,
  BookOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  ExclamationCircleOutlined 
} from "@ant-design/icons";
import CreateTicketModal from "./CreateTicketModal";
import type { TicketFormData } from "./CreateTicketModal";
import dayjs from 'dayjs';

// Define Issue Types
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
}

interface Column {
  id: string;
  title: string;
  tickets: Ticket[];
}

const initialColumns: Column[] = [
  {
    id: "todo",
    title: "TO DO",
    tickets: [],
  },
  {
    id: "inprogress",
    title: "IN PROGRESS",
    tickets: [],
  },
  {
    id: "done",
    title: "DONE",
    tickets: [],
  },
];

// Lưu vào LocalStorage
const saveColumnsToStorage = (columns: Column[]) => {
  localStorage.setItem("kanban_columns", JSON.stringify(columns));
};

// Lấy từ LocalStorage
const loadColumnsFromStorage = () => {
  const data = localStorage.getItem("kanban_columns");
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
};

const getIssueTypeIcon = (issueType: IssueType) => {
  switch (issueType) {
    case "Task":
      return <CheckSquareOutlined className="issue-type-icon" style={{ color: "#4287f5" }} />;
    case "Bug":
      return <BugOutlined className="issue-type-icon" style={{ color: "#ff4d4f" }} />;
    case "Story":
      return <BookOutlined className="issue-type-icon" style={{ color: "#52c41a" }} />;
    default:
      return null;
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "high":
      return <div className="priority-icon" style={{ color: "#ff4d4f" }}>●</div>;
    case "medium":
      return <div className="priority-icon" style={{ color: "#faad14" }}>●</div>;
    case "low":
      return <div className="priority-icon" style={{ color: "#52c41a" }}>●</div>;
    default:
      return null;
  }
};

const KanbanBoard: React.FC = () => {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [columns, setColumns] = useState<Column[]>(() => {
    const stored = loadColumnsFromStorage();
    return stored || initialColumns;
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [loadingStates, setLoadingStates] = useState({
    create: false,
    update: false,
    delete: false,
  });

  const [movingTicket, setMovingTicket] = useState<string | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(null);

  useEffect(() => {
    saveColumnsToStorage(columns);
  }, [columns]);

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const sourceCol = newColumns.find(col => col.id === source.droppableId);
      const destCol = newColumns.find(col => col.id === destination.droppableId);
    
      if (!sourceCol || !destCol) return prevColumns;
    
      const [movedTicket] = sourceCol.tickets.splice(source.index, 1);
      movedTicket.status = destination.droppableId;
      destCol.tickets.splice(destination.index, 0, movedTicket);
    
      return newColumns;
    });
  }, []);

  const getListStyle = (isDraggingOver: boolean) => ({
    background: isDraggingOver ? '#f0f0f0' : 'transparent',
    padding: 8,
    width: '100%',
    minHeight: 500,
    transition: 'background-color 0.2s ease'
  });

  const generateUniqueTaskId = useCallback((existingIds: string[]): string => {
    const generateId = (): string => {
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      const id = `${timestamp % 10000}${randomNum.toString().padStart(3, '0')}`.slice(0, 4);
      return `ID Task: ${id}`;
    };

    let newId = generateId();
    while (existingIds.includes(newId)) {
      newId = generateId();
    }
    return newId;
  }, []);

  const handleCreateTicket = useCallback((ticketData: TicketFormData) => {
    setLoadingStates((prev) => ({ ...prev, create: true }));
    try {
      const existingIds = columns.flatMap(col => col.tickets.map(t => t.id));
      const newId = generateUniqueTaskId(existingIds);
  
      const newTicket: Ticket = {
        ...ticketData,
        id: newId,
        createdAt: new Date(),
        urls: ticketData.urls || [],
        deadline: ticketData.deadline ? new Date(ticketData.deadline) : undefined,
        status: "todo",
        issueType: ticketData.issueType as IssueType,
      };
  
      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === "todo"
            ? { ...column, tickets: [...column.tickets, newTicket] }
            : column
        )
      );
  
      setIsCreateModalOpen(false);
      message.success("Ticket created successfully!");
    } catch (error) {
      console.error("Error creating ticket:", error);
      message.error("Failed to create ticket");
    } finally {
      setLoadingStates((prev) => ({ ...prev, create: false }));
    }
  }, [columns, generateUniqueTaskId]);

  const handleUpdateTicket = useCallback((updatedTicketData: TicketFormData) => {
    if (!editingTicket) return;
  
    setLoadingStates(prev => ({ ...prev, update: true }));
  
    try {
      const updatedTicket: Ticket = {
        ...editingTicket,
        ...updatedTicketData,
        deadline: updatedTicketData.deadline ? new Date(updatedTicketData.deadline) : undefined,
        issueType: updatedTicketData.issueType as IssueType,
      };
  
      setColumns(prevColumns => prevColumns.map(column => ({
        ...column,
        tickets: column.tickets.map(ticket =>
          ticket.id === updatedTicket.id ? updatedTicket : ticket
        ),
      })));
  
      setIsEditModalOpen(false);
      setEditingTicket(null);
      message.success("Ticket updated successfully");
    } catch (error) {
      console.error("Error updating ticket:", error);
      message.error("Failed to update ticket");
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  }, [editingTicket]);

  const handleOpenEditModal = useCallback((ticket: Ticket) => {
    setEditingTicket({
      ...ticket,
    });
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingTicket(null);
  }, []);

  const handleDeleteTicket = useCallback((ticketId: string) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this ticket?",
      icon: <ExclamationCircleOutlined />,
      onOk: () => {
        setColumns(prevColumns => 
          prevColumns.map(column => ({
            ...column,
            tickets: column.tickets.filter(t => t.id !== ticketId),
          }))
        );
        message.success("Ticket deleted successfully!");
      },
      onCancel: () => {
        message.info("Delete action was cancelled");
      },
    });
  }, []);

  const handleMoveTicket = useCallback((ticketId: string, direction: 'left' | 'right') => {
    setMovingTicket(ticketId);
    
    setColumns(prevColumns => {
      const currentColumn = prevColumns.find(col => 
        col.tickets.some(t => t.id === ticketId)
      );
      if (!currentColumn) return prevColumns;

      const statusFlow = ['todo', 'inprogress', 'done'];
      const currentIndex = statusFlow.indexOf(currentColumn.id);
      const newIndex = direction === 'right' 
        ? Math.min(currentIndex + 1, statusFlow.length - 1)
        : Math.max(currentIndex - 1, 0);
      const newStatus = statusFlow[newIndex];

      // Highlight target column
      setHighlightedColumn(newStatus);
      
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedColumn(null);
        setMovingTicket(null);
      }, 300);

      return prevColumns.map(column => {
        if (column.id === currentColumn.id) {
          return {
            ...column,
            tickets: column.tickets.filter(t => t.id !== ticketId)
          };
        } else if (column.id === newStatus) {
          const movedTicket = currentColumn.tickets.find(t => t.id === ticketId)!;
          return {
            ...column,
            tickets: [...column.tickets, { ...movedTicket, status: newStatus }]
          };
        }
        return column;
      });
    });
  }, []);

  const filterTickets = useCallback((tickets: Ticket[]) => {
    return tickets.filter(ticket => {
      if (priorityFilter && ticket.priority !== priorityFilter) return false;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          ticket.title?.toLowerCase().includes(searchLower) || 
          ticket.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [priorityFilter, searchText]);

  const filteredColumns = useMemo(() => {
    return columns.map(column => ({
      ...column,
      tickets: filterTickets(column.tickets),
    }));
  }, [columns, filterTickets]);

  return (
    <div className="p-4 bg-white h-full flex flex-col">
      {/* Header section */}
      <div className="mb-4 w-full flex justify-between items-center">
        <div className="flex gap-2">
          <Input.Search
            placeholder="Search ticket..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />

          <Select
            placeholder="Filter by priority"
            allowClear
            style={{ width: 200 }}
            onChange={setPriorityFilter}
            options={[
              { value: "low", label: <span style={{ color: '#52c41a' }}>🟢 Low</span> },
              { value: "medium", label: <span style={{ color: '#faad14' }}>🟡 Medium</span> },
              { value: "high", label: <span style={{ color: '#ff4d4f' }}>🔴 High</span> },
            ]}
          />
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalOpen(true)}
          loading={loadingStates.create}
          disabled={loadingStates.create}
        >
          Add Ticket
        </Button>
      </div>

      {/* Main board content */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {filteredColumns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col flex-1 bg-gray-100 rounded-lg shadow ${
                    highlightedColumn === column.id ? 'column-highlight' : ''
                  }`}
                  style={getListStyle(snapshot.isDraggingOver)}
                >
                  <h2 className="text-sm font-semibold text-gray-600 p-3 border-b border-gray-200">
                    {column.title}
                    <span className="text-gray-400 font-normal ml-2">
                      ({column.tickets.length})
                    </span>
                  </h2>

                  <div className="flex-grow p-3 overflow-y-auto">
                    {column.tickets.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        {priorityFilter || searchText
                          ? "No matching tickets found."
                          : "No tickets available."}
                      </div>
                    ) : (
                      column.tickets.map((ticket, index) => (
                        <Draggable
                          key={ticket.id}
                          draggableId={ticket.id}
                          index={index}
                        >
                          {(provided: DraggableProvided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 draggable-ticket ${
                                movingTicket === ticket.id ? 'ticket-exit' : ''
                              } ${
                                !movingTicket ? 'ticket-enter-active' : ''
                              }`}
                              onClick={() => handleOpenEditModal(ticket)}
                            >
                              <Card
                                size="small"
                                styles={{ 
                                  body: { 
                                    padding: 12,
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease',
                                    border: 'none',
                                  }
                                }}
                                className="kanban-card"
                                style={{
                                  cursor: 'grab',
                                  border: 'none',
                                  background: 'white',
                                  boxShadow: 'none'
                                }}
                              >
                                <div className="text-xs text-gray-500 mb-1">
                                  {ticket.id}
                                </div>
                                <div className="text-sm font-medium mb-2">
                                  {ticket.title}
                                </div>
                                {ticket.urls?.map((u, idx) => {
                                  let isUrl = false;
                                  try {
                                    isUrl = !!u.url && /^https?:\/\//.test(u.url) && Boolean(new URL(u.url));
                                  } catch {
                                    isUrl = false;
                                  }
                                  return (
                                    <div key={idx}>
                                      {isUrl ? (
                                        <a
                                          href={u.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline text-xs truncate"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {new URL(u.url).hostname}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-700">{u.url}</span>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="flex justify-between items-center">
                                  <div className="icon-wrapper">
                                    {getIssueTypeIcon(ticket.issueType)}
                                    {getPriorityIcon(ticket.priority)}
                                    {ticket.deadline && (
                                      <div className="mt-2">
                                        <Tag
                                          color={
                                            dayjs(ticket.deadline).startOf('day').isBefore(dayjs().startOf('day')) 
                                              ? '#cc0000'
                                              : dayjs(ticket.deadline).startOf('day').isSame(dayjs().startOf('day'))
                                              ? 'red'
                                              : 'green'
                                          }
                                        >
                                          Deadline: {dayjs(ticket.deadline).format("YYYY-MM-DD")}
                                        </Tag>
                                      </div>
                                    )}
                                  </div>
                                  <Avatar
                                    size={24}
                                    icon={<UserOutlined />}
                                    className="bg-gray-200"
                                  />
                                </div>
                                <div className="action-buttons">
                                  {column.id !== 'todo' && (
                                    <Button
                                      type="text"
                                      className="action-button"
                                      icon={<LeftOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveTicket(ticket.id, 'left');
                                      }}
                                    />
                                  )}
                                  <Button
                                    type="text"
                                    className="action-button delete"
                                    icon={<DeleteOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTicket(ticket.id);
                                    }}
                                  />
                                  {column.id !== 'done' && (
                                    <Button
                                      type="text"
                                      className="action-button"
                                      icon={<RightOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveTicket(ticket.id, 'right');
                                      }}
                                    />
                                  )}
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <CreateTicketModal
        mode="create"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTicket={handleCreateTicket}
        loading={loadingStates.create}
      />

      {editingTicket && (
        <CreateTicketModal
          mode="edit"
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          initialData={editingTicket}
          onUpdateTicket={handleUpdateTicket}
          loading={loadingStates.update}
        />
      )}
    </div>
  );
};

export default KanbanBoard;