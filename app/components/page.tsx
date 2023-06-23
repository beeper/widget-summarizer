"use client"

import {
    hasActionPower,
    hasRoomEventPower,
    hasStateEventPower,
    isValidPowerLevelStateEvent,
    ROOM_EVENT_REDACTION,
    STATE_EVENT_POWER_LEVELS, WidgetApi,
} from '@matrix-widget-toolkit/api';
import {MuiCapabilitiesGuard} from '@matrix-widget-toolkit/mui';
import {useWidgetApi} from '@matrix-widget-toolkit/react';
import {EventDirection, WidgetEventCapability} from 'matrix-widget-api';
import {ReactElement, useMemo, useState, useEffect} from 'react';
import {useObservable} from 'react-use';
import {filter, map} from 'rxjs';
import {
    ROOM_EVENT_REACTION,
    ROOM_EVENT_ROOM_MESSAGE,
    STATE_EVENT_MESSAGE_COLLECTION,
    RoomMessageEvent,
    isValidMessageCollectionEvent,
    STATE_EVENT_ROOM_NAME,
    RoomNameEvent,
    isValidReactionEvent,
    ReactionEvent
} from '@/events';
import {
    Box
} from '@mui/material';
import {StateEvent} from '@matrix-widget-toolkit/api';
import {RoomEvent} from '@matrix-widget-toolkit/api';
import {
    MuiThemeProvider,
    MuiWidgetApiProvider,
} from '@matrix-widget-toolkit/mui';



import { useCompletion } from 'ai/react'
import {AI_PROMPT, Client, HUMAN_PROMPT} from "@anthropic-ai/sdk";

/**
 * A component that reads and writes related room events via the widget API.
 */
export default function TestPage() {
    return (
        <>
            <Box m={1}>
                <MuiCapabilitiesGuard
                    capabilities={[
                        // WidgetEventCapability.forStateEvent(
                        //     EventDirection.Receive,
                        //     STATE_EVENT_POWER_LEVELS
                        // ),
                        WidgetEventCapability.forStateEvent(
                            EventDirection.Receive,
                            STATE_EVENT_MESSAGE_COLLECTION
                        ),
                        // WidgetEventCapability.forStateEvent(
                        //     EventDirection.Send,
                        //     STATE_EVENT_MESSAGE_COLLECTION
                        // ),
                        WidgetEventCapability.forRoomEvent(
                            EventDirection.Receive,
                            ROOM_EVENT_ROOM_MESSAGE
                        ),
                        // WidgetEventCapability.forRoomEvent(
                        //     EventDirection.Send,
                        //     ROOM_EVENT_ROOM_MESSAGE
                        // ),
                        WidgetEventCapability.forRoomEvent(
                            EventDirection.Receive,
                            ROOM_EVENT_REACTION
                        ),
                        // WidgetEventCapability.forRoomEvent(
                        //     EventDirection.Send,
                        //     ROOM_EVENT_REACTION
                        // ),
                        WidgetEventCapability.forRoomEvent(
                            EventDirection.Receive,
                            ROOM_EVENT_REDACTION
                        ),
                        // WidgetEventCapability.forRoomEvent(
                        //     EventDirection.Send,
                        //     ROOM_EVENT_REDACTION
                        // ),
                    ]}
                >
                    <TestPageContent/>
                </MuiCapabilitiesGuard>
            </Box>
        </>
    );
};


interface Message {
    user: string;
    content: string;
}

async function getDisplayNameData(widgetApi: WidgetApi) {

    const users_response: RoomEvent<any>[] = await widgetApi.receiveStateEvents('m.room.member');

    let user_dict: Record<string, string> = {}

    users_response.map((user) => {
        let sender = user.sender;
        user_dict[sender] = user.content.displayname
    })

    return user_dict
    // console.log(user_dict)

}

function quoteString(input: string) {
    const lines = input.split('\n');
    const quotedLines = lines.map(line => '> ' + line);
    return quotedLines.join('\n');
}
function TestPageContent() {

    const { complete, completion, isLoading } = useCompletion({
        api: '/api/completion'
    })

    const [summary, setSummary] = useState("");
    const [messageCount, setMessageCount] = useState<number | null>(null);
    const widgetApi = useWidgetApi();

    async function fetchData() {
        // https://github.com/matrix-org/matrix-spec-proposals/blob/aeadae81e2d68f76523eb61ff0ebbbd5c3202deb/proposals/2762-widget-event-receiving.md
        // maybe add a #m.text if needed
        // also: there's "An optional room_ids property may also be added to the data object by the widget, indicating which room(s) to listen for events in. This is either an array of room IDs, undefined, or the special string "*" to denote "any room in which the widget has permission for reading that event" (covered later). When undefined, the client should send events sent in the user's currently viewed room only."
        // also interesting: "To complement the send/receive event capabilities, a single capability is introduced to access the timelines of other rooms: m.timeline:<Room ID>. The <Room ID> can either be an actual room ID, or a * to denote all joined or invited rooms the client is able to see, current and future. The widget can limit its exposure by simply requesting highly scoped send/receive capabilities to accompany the timeline capability."
        // interesting workaround: "There is no Widget API action exposed for listing the user's invited/joined rooms: the widget can request permission to read/receive the m.room.create state event of rooms and query that way. Clients should be aware of this trick and describe the situation appropriately to users."
        const response: RoomEvent<any>[] = await widgetApi.receiveRoomEvents('m.room.message');
        console.log(response)


        let messages_store: Record<string, Message> = {}

        response.forEach((message) => {
            messages_store[message.event_id] = {user: message.sender, content: message.content.body as string}
        })

        const messages: Message[] = response.reduce((acc: Message[], x): Message[] => {

                // don't double-add edited messages
                if (x.content.body && typeof x.content.body === 'string' && !x.content.body.startsWith('* ')) {

                    let content = x.content.body as string

                    // check if message relates to any others
                    let relates_to = x.content?.["m.relates_to"]?.["m.in_reply_to"]?.event_id;
                    if (relates_to && messages_store[relates_to]) {
                        // console.log(content)
                        content = `${quoteString(messages_store[relates_to]["content"])}\n${content}`
                        // console.log(content)
                    }

                    acc.push({user: x.sender, content: content})
                }
                return acc;
            }, []);

        messages.reverse();
        const displayNameData = await getDisplayNameData(widgetApi);
        return {messages, displayNameData}
    }

     function generateSummary(messages: Message[], displayNameData: Record<string, string>) {

        const prewritten_prompt = "You are a message summarizer bot designed to summarize all the messages that have occurred in a group chat while I have been gone. Below are the chat messages. Tell me what has occurred, in an easy-to-understand way that preserves all the important information. Include specific details and links when relevant.\n\n"

        let messages_prompt = "";

        messages.forEach((message) => {

            let username = displayNameData[message.user] || message.user;
            messages_prompt += `\n${username}: ${message.content}`;
        })

        // console.log(messages_prompt)

        complete(prewritten_prompt + messages_prompt)

    }

    function summarize() {

        setMessageCount(null)

        fetchData()
            .then(({messages, displayNameData}) => {

                setMessageCount(messages.length)
                generateSummary(messages, displayNameData)

            })
    }

    return (
        <>
            <button onClick={summarize} className="text-lg block border-2 border-black px-8 py-4 rounded-lg mx-auto mt-20 hover:bg-black hover:text-white">Summarize</button>
            <div className="mt-5 p-3">
                {messageCount && <p className="font-semibold">{messageCount} messages:</p>}
                <pre className="max-w-full whitespace-pre-wrap font-sans">{completion}</pre>
            </div>

        </>
    )



    // useEffect(() => {
    //
    //     async function fetchData() {
    //
    //         const messages_response: RoomEvent<any>[] = await widgetApi.receiveRoomEvents('m.room.message');
    //         console.log(messages_response)
    //
    //         let promises = messages_response.map(async (message_response) => {
    //             let id = message_response.event_id;
    //             let relations = await widgetApi.readEventRelations(id, {
    //                 limit: 50
    //             });
    //             console.log("----------------")
    //             console.log(relations)
    //         })
    //
    //         let results = await Promise.all(promises);
    //     }
    //
    //
    //     fetchData();
    // }, []);
    //
    // return (
    //     <p>hello world!</p>
    // )
}


// function TestPageContent() {
//     // WORKING!!!!!
//
//
//
//     const widgetApi = useWidgetApi();
//     // const [events, setEvents] = useState<RoomEvent<any>[]>([]);
//     const [summary, setSummary] = useState("");
//
//     const apiKey = process.env.ANTHROPIC_API_KEY;
//     if (!apiKey) {
//         throw new Error("The ANTHROPIC_API_KEY environment variable must be set");
//     }
//
//     const client = new Client(apiKey);
//
//     // useEffect(() => {
//     //     const fetchData = async () => {
//     //         const response: RoomEvent<any>[] = await widgetApi.receiveRoomEvents('m.room.message');
//     //
//     //         const messages = response.map(x => x.content.body)
//     //
//     //         // setEvents(response);
//     //
//     //         console.log("56789")
//     //         console.log(messages)
//     //     };
//     //
//     //     fetchData();
//     // }, []);
//
//     async function fetchData() {
//         const response: RoomEvent<any>[] = await widgetApi.receiveRoomEvents('m.room.message');
//
//         const messages = response.map(x => x.content.body)
//
//         return messages
//     }
//
//     function summarize() {
//         fetchData()
//             .then(messages => {
//
//                 client
//                     .completeStream(
//                         {
//                             prompt: `${HUMAN_PROMPT} How many toes do dogs have?${AI_PROMPT}`,
//                             stop_sequences: [HUMAN_PROMPT],
//                             max_tokens_to_sample: 200,
//                             model: "claude-v1",
//                         },
//                         {
//                             onOpen: (response) => {
//                                 console.log("Opened stream, HTTP status code", response.status);
//                             },
//                             onUpdate: (completion) => {
//                                 console.log(completion.completion);
//                                 setSummary(summary + completion.completion)
//                             },
//                         }
//                     )
//                     .then((completion) => {
//                         console.log("Finished sampling:\n", completion);
//                     })
//                     .catch((error) => {
//                         console.error(error);
//                     });
//
//             })
//     }
//
//     return (
//         <>
//             <button onClick={summarize}>Summarize</button>
//             <p>{summary}</p>
//         </>
//     )
// }


// function TestPageContent() {
//     // WORKING!!!!!
//
//     interface RoomNameEvent {
//         name: string;
//     };
//
//     const widgetApi = useWidgetApi();
//     const [events, setEvents] = useState<RoomEvent<any>[]>([]);
//
//     useEffect(() => {
//         const fetchData = async () => {
//
//             let from: string | undefined = undefined;
//             const eventsInRoom: RoomEvent<any>[] = [];
//
//
//             do {
//                 const result = await widgetApi.readEventRelations("$DVVzAxWPW1nyoIU0dsRVEd1C07vb4L4pZxeLUAB6ruo:beeper.local", {
//                     limit: 50,
//                     from,
//                     relationType: 'm.annotation',
//                     eventType: 'm.reaction',
//                 });
//
//                 eventsInRoom.push(...result.chunk);
//
//                 // typescript doesn't like circular types
//                 from = result.nextToken as string | undefined;
//             } while (from !== undefined);
//
//
//             setEvents(eventsInRoom);
//
//             console.log("56789")
//             console.log(eventsInRoom)
//         };
//
//         fetchData();
//     }, []);
//
//     return (
//         <>
//             <p>working</p>
//         </>
//     )
// }


// function TestPageContent() {
//
//     interface RoomNameEvent {
//         name: string;
//     };
//
//     const widgetApi = useWidgetApi();
//     const [events, setEvents] = useState<StateEvent<RoomNameEvent>[]>([]);
//
//     useEffect(() => {
//         const fetchData = async () => {
//             const response: StateEvent<RoomNameEvent>[] = await widgetApi.receiveStateEvents(STATE_EVENT_ROOM_NAME);
//             setEvents(response);
//
//             console.log("56789")
//             console.log(response)
//         };
//
//         fetchData();
//     }, []);
//
//     return (
//         <>
//             <p>working</p>
//         </>
//     )
// }


// function TestPageContent() {
//
//
//     const widgetApi = useWidgetApi();
//
//     const [sendMessage, {isLoading: isSending}] = useSendMessageMutation();
//     const [message, setMessage] = useState("");
//
//     const [data, setData] = useState<String[] | undefined>()
//
//
//     useEffect(() => {
//
//
//         const queryFn = async() => {
//
//             const widgetApi = useWidgetApi();
//
//             try {
//                 const event = await widgetApi.receiveSingleStateEvent(
//                     STATE_EVENT_MESSAGE_COLLECTION,
//                     ''
//                 );
//
//                 return {
//                     data:
//                         event && isValidMessageCollectionEvent(event)
//                             ? event.content.eventIds
//                             : [],
//                 };
//             } catch (e) {
//                 return {
//                     error: {
//                         name: 'LoadFailed',
//                         message: `Could not load events: ${
//                             isError(e) ? e.message : JSON.stringify(e)
//                         }`,
//                     },
//                 };
//             }
//         }
//
//         const fetchEvents = async () => {
//             try {
//                 const result = await queryFn();
//                 setData(result.data);
//             } catch (error) {
//                 console.error('Failed to fetch events', error);
//             }
//         };
//
//         fetchEvents();
//     }, []);
//
//     console.log(1234567)
//     console.log(data)
//
//     return (
//         <>
//             {/*<List aria-label="Messages" dense>*/}
//             {/*    {data?.map((eventId) => (*/}
//             {/*        <MessageEntry*/}
//             {/*            key={eventId}*/}
//             {/*            eventId={eventId}*/}
//             {/*        />*/}
//             {/*    ))}*/}
//             {/*</List>*/}
//         </>
//     )
// }

//
// const MessageEntry = ({
//                           eventId
//                       }: {
//     eventId: string;
// }) => {
//     const {data, error, isLoading} = useGetMessageQuery({eventId});
//     console.log("DEFGHIJ")
//     console.log(data)
//     const messageId = useId();
//     const authorId = useId();
//
//     if (isLoading) {
//         return (
//             <ListItem sx={{flexDirection: 'row-reverse'}}>
//                 <ListItemText primary={<Skeleton/>} secondary={<Skeleton/>}/>
//                 <ListItemIcon>
//                     <Skeleton variant="circular" height={24} width={24} sx={{m: 1}}/>
//                     <Skeleton variant="circular" height={24} width={24} sx={{m: 1}}/>
//                 </ListItemIcon>
//             </ListItem>
//         );
//     }
//
//     return (
//         <ListItem
//             sx={{flexDirection: 'row-reverse'}}
//             aria-labelledby={`${messageId} ${authorId}`}
//         >
//             <ListItemText
//                 primary={
//                     data?.event?.content.body ?? `Unknown Message (ID: ${eventId})`
//                 }
//                 primaryTypographyProps={{id: messageId}}
//                 secondary={data?.event?.sender ?? 'Unknown Author'}
//                 secondaryTypographyProps={{id: authorId}}
//             />
//         </ListItem>
//     );
// };

// function TestPageContent() {
//
//     const widgetApi = useWidgetApi();
//
//     const [sendMessage, {isLoading: isSending}] = useSendMessageMutation();
//     const [events, setEvents] = useState("");
//
//     useEffect(() => {
//         const fetchEvents = async () => {
//             try {
//                 const result = await widgetApi.receiveRoomEvents<RoomMessageEvent>('com.example.test');
//                 setEvents(result[0].content.body);
//             } catch (error) {
//                 console.error('Failed to fetch events', error);
//             }
//         };
//
//         fetchEvents();
//     }, [widgetApi]);
//
//     function send() {
//         sendMessage({"message": "hello"})
//         // setData("working")
//     }
//
//     //
//     // const subscription = widgetApi
//     //     .observeRoomEvents(ROOM_EVENT_REACTION)
//     //     .pipe(filter(isValidReactionEvent))
//     //     .subscribe(async (event) => {
//     //         if (
//     //             eventId === event.content['m.relates_to'].event_id &&
//     //             event.content['m.relates_to'].rel_type === 'm.annotation'
//     //         ) {
//     //             updateCachedData((data) => {
//     //                 if (
//     //                     !data.reactions.find((r) => r.event_id === event.event_id)
//     //                 ) {
//     //                     data.reactions.push(event);
//     //                 }
//     //             });
//     //         }
//     //     });
//     //
//     // const redactSubscription = observeRedactionEvents(widgetApi).subscribe(
//     //     (redaction) => {
//     //         updateCachedData((data) => {
//     //             data.reactions = data.reactions.filter(
//     //                 (r) => r.event_id !== redaction.redacts
//     //             );
//     //         });
//     //     }
//     // );
//     //
//     // const messageSubscription = widgetApi
//     //     .observeRoomEvents(ROOM_EVENT_ROOM_MESSAGE)
//     //     .pipe(filter(isValidRoomMessageEvent))
//     //     .subscribe(async (event) => {
//     //         if (eventId === event.event_id) {
//     //             updateCachedData((data) => {
//     //                 data.event = event;
//     //             });
//     //         }
//     //     });
//     //
//     // // wait until subscription is cancelled
//     // await cacheEntryRemoved;
//     //
//     // subscription.unsubscribe();
//     // redactSubscription.unsubscribe();
//     // messageSubscription.unsubscribe();
//
//     return (
//         <>
//             <p>hello</p>
//             <button onClick={send}>click me</button>
//             <p>{events}</p>
//         </>
//     )
// }

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
                            STATE_EVENT_MESSAGE_COLLECTION
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
                        ROOM_EVENT_REACTION
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
