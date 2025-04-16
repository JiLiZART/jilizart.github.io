import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type CursorProps = {
  color: string;
  x: number;
  y: number;
  message?: string;
};

function Cursor({ color, x, y, message }: CursorProps) {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
    >
      <svg
        className="relative"
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        stroke="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
        />
      </svg>

      {message && (
        <div
          className="absolute top-5 left-2 rounded px-1"
          style={{ backgroundColor: color }}
        >
          <p className="whitespace-nowrap text-sm leading-relaxed text-white">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
}

const PUBLIC_SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL!
const PUBLIC_SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

const userId = Math.random().toString(36).substring(7);
const userName = `${userId.slice(0, 4)}`;
const color = COLORS[Math.floor(Math.random() * COLORS.length)];

const createClientPosition = (x = 0, y = 0) => ({
  x,
  y,
  userId,
  userName,
  color,
});

const defaultOwnCursor = {
    x: 0,
    y: 0,
    userId: "own",
    userName: "You",
    color: "#000",
}

// Subscribe to cursor updates
const channel = supabase.channel("cursors")

export const Cursors = () => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [ownCursor, setOwnCursor] = useState<CursorPosition>(defaultOwnCursor);

  useEffect(() => {
    if (typeof window === "undefined") return;
      const onCursorMove = ({ payload }) => {
          if (payload) {
              setCursors((prev) => {
                  const newCursors = prev.filter((c) => c.userId !== payload.userId);

                  return [...newCursors, payload];
              });
          }
      }

      channel.on("broadcast", { event: "cursor-move" }, onCursorMove).subscribe();

      const sendCursorMove = (position: CursorPosition) => {
          channel.send({
              type: "broadcast",
              event: "cursor-move",
              payload: position,
          });
        }

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const position = createClientPosition(e.clientX, e.clientY);
      sendCursorMove(position);
      setOwnCursor(position);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.body.style.cursor = "none";

    return () => {
      const position = createClientPosition(0, 0);
      sendCursorMove(position);
      channel.unsubscribe();

      window.removeEventListener("mousemove", handleMouseMove);
      document.body.style.cursor = "auto";
    };
  }, []);

  const ownCursorContent = ownCursor.x && ownCursor.y && (
      <Cursor
          key="own"
          color={defaultOwnCursor.color}
          message={defaultOwnCursor.userName}
          x={ownCursor.x}
          y={ownCursor.y}
      />
  )

  return (
    <>
      {ownCursorContent}
      {cursors
        .filter((cur) => cur?.userId !== ownCursor?.userId && cur?.x && cur?.y)
        .map((cursor) => (
          <Cursor
            key={cursor.userId}
            x={cursor.x}
            y={cursor.y}
            color={cursor.color}
            message={cursor.userName}
          />
        ))}
    </>
  );
};
