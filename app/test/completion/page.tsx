'use client'

import { useCompletion } from 'ai/react'
import { useDebouncedCallback } from 'use-debounce'

export default function Completion() {
    const { complete, completion, isLoading } = useCompletion({
        api: '/api/completion'
    })

    const handleInputChange = () => {
        complete("hello there what time is it")
    }

    return (
        <div className="mx-auto flex w-full max-w-md flex-col space-y-5 py-24">
            <p>Current state: {isLoading ? 'Generating...' : 'Idle'}</p>
            <button onClick={handleInputChange}>what time is it</button>
            <p>{completion}</p>
        </div>
    )
}