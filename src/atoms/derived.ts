import { Atom } from "@effect-atom/atom-react"
import { tasksAtom, selectedTaskIdAtom } from "./core"

export const sortedTasksAtom = Atom.make((get) => {
  const tasks = get(tasksAtom)
  return [...tasks.values()].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )
})

export const selectedTaskAtom = Atom.make((get) => {
  const id = get(selectedTaskIdAtom)
  if (id === null) return null
  const tasks = get(tasksAtom)
  return tasks.get(id) ?? null
})
