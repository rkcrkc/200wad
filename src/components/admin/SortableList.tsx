"use client";

/**
 * SortableList — shared drag-and-drop primitive for admin reorderable tables.
 *
 * Usage:
 *   const [items, setItems] = useState(initialItems);
 *
 *   const handleReorder = async (newIds: string[]) => {
 *     const prev = items;
 *     const next = reorderById(items, newIds);
 *     setItems(next);                       // optimistic update
 *     const result = await serverReorder(scopeId, newIds);
 *     if (!result.success) {
 *       setItems(prev);                     // roll back on failure
 *       alert(result.error || "Failed to reorder");
 *     }
 *   };
 *
 *   <SortableList ids={items.map(i => i.id)} onReorder={handleReorder}>
 *     <table>
 *       <thead>...</thead>
 *       <tbody>
 *         {items.map(item => (
 *           <SortableRow key={item.id} id={item.id}>
 *             {({ setNodeRef, style, dragHandleProps, isDragging }) => (
 *               <tr ref={setNodeRef} style={style} className={isDragging ? "..." : "..."}>
 *                 <td><DragHandle {...dragHandleProps} /></td>
 *                 ...
 *               </tr>
 *             )}
 *           </SortableRow>
 *         ))}
 *       </tbody>
 *     </table>
 *   </SortableList>
 */

import {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// SortableList
// ---------------------------------------------------------------------------

export interface SortableListProps {
  /** Ordered list of string ids — must match the ids used in <SortableRow id=...>. */
  ids: string[];
  /** Called with the new ordered ids after a successful drag. */
  onReorder: (newIds: string[]) => void;
  children: ReactNode;
  /**
   * When provided, restricts dragging within the referenced container.
   * Useful to prevent the row drifting outside the table container.
   */
  containerRef?: Ref<HTMLElement>;
}

export function SortableList({ ids, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require the pointer to move 5px before starting a drag. This prevents
      // accidental drags when clicking the drag handle.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    onReorder(newIds);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// SortableRow
// ---------------------------------------------------------------------------

export interface SortableRowRenderArgs {
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
  dragHandleProps: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
}

export interface SortableRowProps {
  id: string;
  /**
   * Render-prop that receives the drag state and provides refs/styles/handle
   * props. The caller is responsible for rendering their row element
   * (e.g. <tr>, <div>) and placing the drag handle where desired.
   */
  children: (args: SortableRowRenderArgs) => ReactNode;
}

export function SortableRow({ id, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // While dragging, keep the row above its siblings so the floating row
    // is visible over neighbouring rows and drop targets.
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const dragHandleProps: HTMLAttributes<HTMLElement> = {
    ...(attributes as HTMLAttributes<HTMLElement>),
    ...(listeners as HTMLAttributes<HTMLElement>),
  };

  return <>{children({ setNodeRef, style, dragHandleProps, isDragging })}</>;
}

// ---------------------------------------------------------------------------
// DragHandle
// ---------------------------------------------------------------------------

export interface DragHandleProps extends HTMLAttributes<HTMLButtonElement> {
  className?: string;
  /** Size of the grip icon. Defaults to 16px. */
  iconSize?: number;
}

export function DragHandle({
  className,
  iconSize = 16,
  onClick,
  ...props
}: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      // Stop click-on-handle from bubbling to a clickable parent row.
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing",
        className
      )}
      {...props}
    >
      <GripVertical style={{ width: iconSize, height: iconSize }} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reorder an array of items by a new list of ids. Items whose ids are not
 * found in `newIds` are appended to the end in their original order.
 */
export function reorderById<T extends { id: string }>(
  items: T[],
  newIds: string[]
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const reordered: T[] = [];
  for (const id of newIds) {
    const item = byId.get(id);
    if (item) {
      reordered.push(item);
      byId.delete(id);
    }
  }
  // Append any items that weren't in newIds (shouldn't happen in normal use).
  for (const leftover of byId.values()) {
    reordered.push(leftover);
  }
  return reordered;
}
