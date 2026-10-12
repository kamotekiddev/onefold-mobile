import {
    createContext,
    useContext,
    useState,
    type PropsWithChildren,
} from "react"

import type { RoutineInput } from "@/types/domain"

type Draft = { routineId?: string; value: RoutineInput; baseline: string }
const DraftContext = createContext<{
    draft: Draft | null
    setDraft: React.Dispatch<React.SetStateAction<Draft | null>>
} | null>(null)
export function RoutineDraftProvider({ children }: PropsWithChildren) {
    const [draft, setDraft] = useState<Draft | null>(null)
    return (
        <DraftContext.Provider value={{ draft, setDraft }}>
            {children}
        </DraftContext.Provider>
    )
}
export function useRoutineDraft() {
    const context = useContext(DraftContext)
    if (!context)
        throw new Error("Routine editor must be inside its draft provider.")
    return context
}
