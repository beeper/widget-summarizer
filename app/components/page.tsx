"use client"

import {
    hasActionPower,
    hasRoomEventPower,
    hasStateEventPower,
    isValidPowerLevelStateEvent,
    ROOM_EVENT_REDACTION,
    WidgetApi,
} from '@matrix-widget-toolkit/api';
import {MuiCapabilitiesGuard} from '@matrix-widget-toolkit/mui';
import {useWidgetApi} from '@matrix-widget-toolkit/react';
import {EventDirection, WidgetEventCapability} from 'matrix-widget-api';
import {useMemo, useState, useEffect} from 'react';
import {useObservable} from 'react-use';
import {filter, map} from 'rxjs';
import {
    Box
} from '@mui/material';
import {RoomEvent} from '@matrix-widget-toolkit/api';
import { useCompletion } from 'ai/react';

interface Message {
    user: string;
    content: string;
}

interface RoomMessageEvent {
    msgtype: string;
    body: string;
}


export default function WidgetPage() {
    return (
        <>
            <Box m={1}>
                <MuiCapabilitiesGuard
                    capabilities={[
                        WidgetEventCapability.forStateEvent(
                            EventDirection.Receive,
                            'm.room.member'
                        ),
                        WidgetEventCapability.forRoomEvent(
                            EventDirection.Receive,
                            'm.room.message'
                        ),
                        WidgetEventCapability.forRoomEvent(
                            EventDirection.Receive,
                            'm.reaction'
                        ),
                        WidgetEventCapability.forRoomEvent(
                            EventDirection.Receive,
                            ROOM_EVENT_REDACTION
                        ),
                    ]}
                >
                    <WidgetPageContent/>
                </MuiCapabilitiesGuard>
            </Box>
        </>
    );
};

async function getDisplayNameData(widgetApi: WidgetApi) {
    const users_response: RoomEvent<any>[] = await widgetApi.receiveStateEvents('m.room.member');
    let user_dict: Record<string, string> = {}
    users_response.map((user) => {
        let sender = user.sender;
        user_dict[sender] = user.content.displayname
    })
    return user_dict
}

function quoteString(input: string) {
    const lines = input.split('\n');
    const quotedLines = lines.map(line => '> ' + line);
    return quotedLines.join('\n');
}

function processMessages(roomEvents: RoomEvent<any>[]) {
    let messages_store: Record<string, Message> = {}

    roomEvents.forEach((message) => {
        messages_store[message.event_id] = {user: message.sender, content: message.content.body as string}
    })

    const messages: Message[] = roomEvents.reduce((acc: Message[], x): Message[] => {

        // Don't add edited messages
        if (x.content.body && typeof x.content.body === 'string' && !x.content.body.startsWith('* ')) {
            let content = x.content.body as string
            // check if message relates to any others
            let relates_to = x.content?.["m.relates_to"]?.["m.in_reply_to"]?.event_id;
            if (relates_to && messages_store[relates_to]) {
                content = `${quoteString(messages_store[relates_to]["content"])}\n${content}`
            }
            acc.push({user: x.sender, content: content})
        }
        return acc;
    }, []);

    return messages
}



function WidgetPageContent() {

    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState("");
    const { complete, completion, isLoading } = useCompletion({
        api: '/api/completion',
        onResponse: res => {
            setLoading(false);
            setStatus(`${messageCount} messages:`)
        },
    })
    let messageCount: number;
    const widgetApi = useWidgetApi();

    async function fetchData() {
        const fullyReadData = await widgetApi.receiveRoomAccountData('m.fully_read');
        const fullyRead: string | undefined = fullyReadData[0].content.event_id;
        const roomEvents: RoomEvent<RoomMessageEvent>[] = await widgetApi.receiveRoomEvents('m.room.message', {limit: 500, since: fullyRead});
        const messages = processMessages(roomEvents);
        const displayNameData = await getDisplayNameData(widgetApi);
        return {messages, displayNameData}
    }

    useEffect(() => {
        fetchData()
            .then(({messages, displayNameData}) => {
                if (messages.length !== 0) {
                    messageCount = messages.length;
                    generateSummary(messages, displayNameData);
                } else {
                    setLoading(false);
                    setStatus("No new messages");
                }
            })
    }, []);

     function generateSummary(messages: Message[], displayNameData: Record<string, string>) {
        const prewritten_prompt = "You are a message summarizer bot designed to summarize all the messages that have occurred in a group chat while I have been gone. Below are the chat messages. Tell me what has occurred, in an easy-to-understand way that preserves all the important information. Include specific details and links when relevant.\n\n"
        let messages_prompt = "";

        messages.forEach((message) => {
            let username = displayNameData[message.user] || message.user;
            messages_prompt += `\n${username}: ${message.content}`;
        })
        complete(prewritten_prompt + messages_prompt);
    }

    return (
        <>
            <div className="mt-5 p-3">
                {loading && <p>Computing...</p>}
                <p className="font-semibold">{status}</p>
                <pre className="max-w-full whitespace-pre-wrap font-sans">{completion}</pre>
            </div>
        </>
    )
}

// TODO: is this needed?
function usePermissions() {
    const widgetApi = useWidgetApi();

    const observable = useMemo(
        () =>
            widgetApi.observeStateEvents('m.room.power_levels').pipe(
                filter(isValidPowerLevelStateEvent),
                map((ev) => ({
                    canEdit:
                        hasStateEventPower(
                            ev.content,
                            widgetApi.widgetParameters.userId,
                            'm.room.member'
                        ) &&
                        hasRoomEventPower(
                            ev.content,
                            widgetApi.widgetParameters.userId,
                            ROOM_EVENT_REDACTION
                        ) &&
                        hasActionPower(
                            ev.content,
                            widgetApi.widgetParameters.userId,
                            'redact'
                        ),
                    canSendReaction: hasRoomEventPower(
                        ev.content,
                        widgetApi.widgetParameters.userId,
                        'm.reaction'
                    ),
                    canSendRedaction: hasRoomEventPower(
                        ev.content,
                        widgetApi.widgetParameters.userId,
                        ROOM_EVENT_REDACTION
                    ),
                }))
            ),
        [widgetApi]
    );

    return useObservable(observable, {
        canEdit: false,
        canSendReaction: false,
        canSendRedaction: false,
    });
}
