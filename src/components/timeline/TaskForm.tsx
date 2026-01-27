"use client"

import { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { selectedTaskIdAtom } from "@/src/atoms/core"
import { selectedTaskAtom } from "@/src/atoms/derived"
import { createTaskAtom, updateTaskAtom, deleteTaskAtom } from "@/src/atoms/actions"

export function TaskForm() {
  const selectedTask = useAtomValue(selectedTaskAtom)
  const setSelectedId = useAtomSet(selectedTaskIdAtom)
  const createTask = useAtomSet(createTaskAtom)
  const updateTask = useAtomSet(updateTaskAtom)
  const deleteTask = useAtomSet(deleteTaskAtom)

  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [row, setRow] = useState(0)

  const handleCreate = () => {
    if (!title || !startDate || !endDate) return
    createTask({
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      row,
      progress: 0,
    })
    setTitle("")
    setStartDate("")
    setEndDate("")
  }

  const handleDelete = () => {
    if (!selectedTask) return
    deleteTask(selectedTask.id)
    setSelectedId(null)
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-white" data-testid="task-form">
      <h3 className="text-sm font-semibold mb-2">
        {selectedTask ? "Edit Task" : "New Task"}
      </h3>
      <div className="flex gap-2 items-end flex-wrap">
        <label className="flex flex-col text-xs">
          Title
          <input
            data-testid="input-title"
            className="border rounded px-2 py-1 text-sm"
            value={selectedTask?.title ?? title}
            onChange={(e) => {
              if (selectedTask) {
                updateTask({ id: selectedTask.id, patch: { title: e.target.value } })
              } else {
                setTitle(e.target.value)
              }
            }}
          />
        </label>
        <label className="flex flex-col text-xs">
          Start
          <input
            data-testid="input-start"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs">
          End
          <input
            data-testid="input-end"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs">
          Row
          <input
            data-testid="input-row"
            type="number"
            className="border rounded px-2 py-1 text-sm w-16"
            value={row}
            onChange={(e) => setRow(Number(e.target.value))}
          />
        </label>
        {selectedTask ? (
          <button
            data-testid="btn-delete"
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={handleDelete}
          >
            Delete
          </button>
        ) : (
          <button
            data-testid="btn-create"
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            onClick={handleCreate}
          >
            Add
          </button>
        )}
      </div>
    </div>
  )
}
