import {useEffect, useMemo, useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {Cursor} from "./Cursor.tsx";

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

function useCursorsChannel({onCursorMove}) {
    useEffect(() => {
        const broadcast = channel.on("broadcast", {event: "cursor-move"}, onCursorMove);

        broadcast.subscribe();

        return () => {
            broadcast.unsubscribe();
        }
    }, []);

    return useMemo(() => ({
        cursorMove(position: CursorPosition) {
            channel.send({
                type: "broadcast",
                event: "cursor-move",
                payload: position,
            });
        }
    }), []);
}

function useCursorTracking({onMove, onUnmove}) {
    useEffect(() => {
        if (typeof window === "undefined") return;


        const $$main = document.getElementById('main');
        const pos = {x: 0, y: 0};

        const handleMouseMove = (e: MouseEvent) => {
            pos.x = e.pageX
            pos.y = e.pageY

            onMove(pos.x + ($$main?.scrollLeft || 0), pos.y + ($$main?.scrollTop || 0));
        };

        const handleScroll = (e) => {
            onMove(pos.x + ($$main?.scrollLeft || 0), pos.y + ($$main?.scrollTop || 0));
        }

        document.addEventListener("mousemove", handleMouseMove);
        $$main?.addEventListener("scroll", handleScroll);
        document.body.style.cursor = "none";

        return () => {
            onUnmove(0, 0)

            document.removeEventListener("mousemove", handleMouseMove);
            $$main?.removeEventListener("scroll", handleScroll);

            document.body.style.cursor = "auto";
        };
    }, []);
}

export const Cursors = () => {
    const [cursors, setCursors] = useState<CursorPosition[]>([]);
    const [ownCursor, setOwnCursor] = useState<CursorPosition>(defaultOwnCursor);

    const {cursorMove} = useCursorsChannel({
        onCursorMove({payload}) {
            if (payload) {
                setCursors((prev) => {
                    const newCursors = prev.filter((c) => c.userId !== payload.userId);

                    return [...newCursors, payload];
                });
            }
        }
    })

    useCursorTracking({
        onMove(x, y) {
            const position = createClientPosition(x, y);

            cursorMove(position);
            setOwnCursor(position);
        },
        onUnmove(x, y) {
            cursorMove(createClientPosition(x, y));
        }
    })

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
