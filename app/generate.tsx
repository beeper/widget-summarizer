// "use server"
//
// import "dotenv/config";
// import { AI_PROMPT, Client, HUMAN_PROMPT } from '@anthropic-ai/sdk';
// import {display} from "@mui/system";
//
// interface Message {
//     user: string;
//     content: string;
// }
// export async function generateSummary(messages: Message[], displayNameData: Record<string, string>) {
//
//     // console.log(messages)
//     // console.log(displayNameData)
//
//
//     const apiKey = process.env.ANTHROPIC_API_KEY;
//     if (!apiKey) {
//         throw new Error("The ANTHROPIC_API_KEY environment variable must be set");
//     }
//
//     const client = new Client(apiKey);
//
//     const prewritten_prompt = "You are a message summarizer bot designed to summarize all the messages that have occurred in a group chat while I have been gone. Below are the chat messages. Tell me what has occurred, in an easy-to-understand way that preserves all the important information. Include specific details and links when relevant.\n\n"
//
//
//     let messages_prompt = "";
//
//     messages.forEach((message) => {
//
//         let username = displayNameData[message.user] || message.user;
//         messages_prompt += `\n${username}: ${message.content}`;
//     })
//
//     console.log(messages_prompt)
//
//     const completion = await client.complete({
//             prompt: `${HUMAN_PROMPT} ${prewritten_prompt}${messages_prompt}${AI_PROMPT}`,
//             stop_sequences: [HUMAN_PROMPT],
//             max_tokens_to_sample: 1000,
//             model: "claude-v1",
//         })
//
//
//     return completion
// }