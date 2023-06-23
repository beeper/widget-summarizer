'use client'

import { useCompletion } from 'ai/react'

export default function Completion() {
    const {
        completion,
        input,
        stop,
        isLoading,
        handleInputChange,
        handleSubmit
    } = useCompletion({
        api: '/api/completion'
    })

    return (
        <div className="mx-auto w-full max-w-md py-24 flex flex-col stretch">
            <form onSubmit={handleSubmit}>
                <label>
                    Say something...
                    <input
                        className="fixed w-full max-w-md bottom-0 border border-gray-300 rounded mb-8 shadow-xl p-2"
                        value={input}
                        onChange={handleInputChange}
                    />
                </label>
                <output>Completion result: {completion}</output>
                <button type="button" onClick={stop}>
                    Stop
                </button>
                <button disabled={isLoading} type="submit">
                    Send
                </button>
            </form>
        </div>
    )
}