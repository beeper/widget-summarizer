"use client"

import dynamic from "next/dynamic";
// TODO: this should be imported client-side. Breaks builds sometimes
import {WidgetApiImpl} from '@beeper/matrix-widget-toolkit-api';

const MuiThemeProvider = dynamic(() => import('@beeper/matrix-widget-toolkit-mui').then((mod) => mod.MuiThemeProvider), {
    ssr: false,
})
const MuiWidgetApiProvider = dynamic(() => import('@beeper/matrix-widget-toolkit-mui').then((mod) => mod.MuiWidgetApiProvider), {
    ssr: false,
})
import {WidgetApi} from '@beeper/matrix-widget-toolkit-api';
import {ReactElement} from "react";
import WidgetPage from "@/app/components/page"


// Initiate the widget API on startup. The Client will initiate
// the connection with `capabilities` and we need to make sure
// that the message doesn't get lost while we are initiating React.
const widgetApiPromise = WidgetApiImpl.create({
    // Tell which capabilities should be requested at startup. One
    // can also request capabilities after the application started.
    capabilities: [
        // WidgetEventCapability.forStateEvent(
        //     EventDirection.Receive,
        //     STATE_EVENT_ROOM_NAME
        // ),
    ],
});


function App({
                 widgetApiPromise,
             }: {
    widgetApiPromise: Promise<WidgetApi>;
}): ReactElement {
    return (
        <MuiThemeProvider>
            {/* Fallback suspense if no higher one is registered (used for i18n) */}
            <MuiWidgetApiProvider
                widgetApiPromise={widgetApiPromise}
                widgetRegistration={{
                    name: 'Summarizer'
                }}
            >
                <WidgetPage />
            </MuiWidgetApiProvider>
        </MuiThemeProvider>
    );
}


export default function Home() {
    return (
        <App widgetApiPromise={widgetApiPromise}/>
    )
}
