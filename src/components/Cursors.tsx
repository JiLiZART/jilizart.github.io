import PusherJS from 'pusher-js';
import {useEffect} from "react";

// import.meta.env.PUSHER_HOST
let host = 'soketi.194.116.215.143.xip.artkost.dev';

export const Cursors = () => {

    useEffect(() => {

        if (typeof window === 'undefined') {
            return;
        }

        let client = new PusherJS('app-key', {
            wsHost: host,
            wsPort: 6001,
            forceTLS: false,
            encrypted: true,
            disableStats: true,
            enabledTransports: ['ws', 'wss'],
            cluster: 'eu',
        });

        client.subscribe('chat-room').bind('message', (message) => {
            alert(`${message.sender} says: ${message.content}`);
        });

    }, []);


    return null;
}
