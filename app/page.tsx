"use client"

import { EventDirection, WidgetEventCapability } from '@beeper/matrix-widget-api';
import { MuiCapabilitiesGuard } from "@beeper/matrix-widget-toolkit-mui";
import Content from "@/app/content";

export default function Home() {


    return (
        <>
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
                    WidgetEventCapability.forRoomAccountData(
                        EventDirection.Receive,
                        'm.fully_read'
                    ),
                ]}
            >
                <Content />
            </MuiCapabilitiesGuard>
        </>
    );
};