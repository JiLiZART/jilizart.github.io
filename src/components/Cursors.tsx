import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { RealtimeChannel } from "@supabase/supabase-js";

type Props = {
  color: string;
  x: number;
  y: number;
  message?: string;
};

function Cursor({ color, x, y, message }: Props) {
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

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
);

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

export const Cursors = () => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [ownCursor, setOwnCursor] = useState<CursorPosition>({
    x: 0,
    y: 0,
    userId: "own",
    userName: "You",
    color: "#000",
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userId = Math.random().toString(36).substring(7);
    const userName = `${userId.slice(0, 4)}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Subscribe to cursor updates
    const channel = supabase
      .channel("cursors")
      .on("broadcast", { event: "cursor-move" }, ({ payload }) => {
        setCursors((prev) => {
          const newCursors = prev.filter((c) => c.userId !== payload.userId);
          return [...newCursors, payload];
        });
      })
      .subscribe();

    setChannel(channel);

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const position = {
        x: e.clientX,
        y: e.clientY,
        userId,
        userName,
        color,
      };

      channel.send({
        type: "broadcast",
        event: "cursor-move",
        payload: position,
      });

      setOwnCursor(position);
    };

    window.addEventListener("mousemove", handleMouseMove);

    document.body.style.cursor = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      channel.unsubscribe();
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <>
      <Cursor
        key="own"
        color={"#000"}
        message={"You"}
        x={ownCursor.x}
        y={ownCursor.y}
      />
      {cursors
        .filter((cur) => cur?.userId !== ownCursor?.userId)
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
