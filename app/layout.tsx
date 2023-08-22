"use client"

import './globals.css'
import { Inter } from 'next/font/google'
import { WidgetApi, WidgetApiImpl } from '@beeper/matrix-widget-toolkit-api';
import { MuiThemeProvider, MuiWidgetApiProvider } from "@beeper/matrix-widget-toolkit-mui";

const inter = Inter({subsets: ['latin']})

const widgetApiPromise =
    typeof window !== "undefined"
        ? WidgetApiImpl.create({
            capabilities: [],
        })
        : new Promise<WidgetApi>(() => {})

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {

    if (!widgetApiPromise) return (
        <html lang="en">
            <body className={inter.className}>
            </body>
        </html>
    );

    return (
        <html lang="en">
            <body className={inter.className}>
                <MuiThemeProvider>
                    <MuiWidgetApiProvider widgetApiPromise={widgetApiPromise}>
                        {children}
                    </MuiWidgetApiProvider>
                </MuiThemeProvider>
            </body>
        </html>
    )
}
