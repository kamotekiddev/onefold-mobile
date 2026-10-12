import { useEffect, useState } from "react"
import { AppState } from "react-native"

export function useNow() {
    const [now, setNow] = useState(Date.now)
    useEffect(() => {
        const update = () => setNow(Date.now())
        const interval = setInterval(update, 1000)
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") update()
        })
        return () => {
            clearInterval(interval)
            subscription.remove()
        }
    }, [])
    return now
}
