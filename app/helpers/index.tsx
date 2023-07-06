import {RoomEvent, WidgetApi} from "@beeper/matrix-widget-toolkit-api";

export interface Message {
    user: string;
    content: string;
}

export interface RoomMessageEvent {
    msgtype: string;
    body: string;
}

export async function getDisplayNameData(widgetApi: WidgetApi) {
    const users_response: RoomEvent<any>[] = await widgetApi.receiveStateEvents('m.room.member');
    let user_dict: Record<string, string> = {}
    users_response.map((user) => {
        let sender = user.sender;
        user_dict[sender] = user.content.displayname
    })
    return user_dict
}

function quoteString(input: string | undefined) {
    if (input === undefined) {
        return "";
    }

    const lines = input.split('\n');
    const quotedLines = lines.map(line => '> ' + line);
    return quotedLines.join('\n');
}

export function processMessages(roomEvents: RoomEvent<any>[]) {
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