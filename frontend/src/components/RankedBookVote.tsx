import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BookOption } from "../types";

interface SortableItemProps {
  book: BookOption;
  index: number;
}

function SortableItem({ book, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm select-none ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 hover:text-gray-600 touch-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <span className="text-sm font-semibold text-brand-600 w-5">
        {index + 1}
      </span>
      {book.coverImageUrl && (
        <img
          src={book.coverImageUrl}
          alt=""
          className="w-8 h-12 object-cover rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{book.title}</p>
        <p className="text-xs text-gray-500 truncate">{book.author}</p>
      </div>
    </div>
  );
}

interface Props {
  monthKey: string;
  books: BookOption[];
  onRanksChange: (ranks: { bookOptionId: number; rank: number }[]) => void;
}

/**
 * Drag-and-drop ranked ballot using dnd-kit.
 * Rank 1 = top position. Uses Borda count on the backend.
 */
export default function RankedBookVote({ books, onRanksChange }: Props) {
  const [ordered, setOrdered] = useState<BookOption[]>(books);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrdered((items) => {
        const oldIndex = items.findIndex((b) => b.id === active.id);
        const newIndex = items.findIndex((b) => b.id === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        onRanksChange(
          next.map((b, i) => ({ bookOptionId: b.id, rank: i + 1 })),
        );
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Drag books to rank them. Rank 1 (top) is your top choice.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={ordered.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {ordered.map((book, index) => (
              <SortableItem key={book.id} book={book} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
