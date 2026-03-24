"use client";

import { useRef, useState, useTransition } from "react";
import { updateScheduleAction, runCollectionNow } from "../app/dc-nodes/actions";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ScheduleCard({
  schedule,
}: {
  schedule: { type: string; time: string; day?: string };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const displaySchedule =
    schedule.type === "weekly" && schedule.day
      ? `Runs weekly on ${DAYS[Number(schedule.day)]} at ${schedule.time}`
      : `Runs daily at ${schedule.time}`;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data Collection Schedule</h2>
          {!isEditing && (
            <p className="mt-1 text-sm text-gray-400">{displaySchedule}</p>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
              onClick={() => setIsEditing(true)}
            >
              Edit Schedule
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
              onClick={() => {
                startTransition(async () => {
                  const result = await runCollectionNow();
                  setRunMessage(result.message);
                  setTimeout(() => setRunMessage(null), 3000);
                });
              }}
              disabled={isPending}
            >
              Run Collection Now
            </button>
          </div>
        )}
      </div>

      {runMessage && (
        <p className="mt-2 text-sm text-blue-400">{runMessage}</p>
      )}

      {isEditing && (
        <form
          ref={formRef}
          className="mt-4 flex flex-wrap items-end gap-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await updateScheduleAction(formData);
              if (result.success) {
                setIsEditing(false);
              }
            });
          }}
        >
          <div>
            <label
              htmlFor="schedule-type"
              className="block text-sm text-gray-400"
            >
              Frequency
            </label>
            <select
              id="schedule-type"
              name="type"
              defaultValue={schedule.type}
              className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="schedule-time"
              className="block text-sm text-gray-400"
            >
              Time
            </label>
            <input
              id="schedule-time"
              name="time"
              type="time"
              defaultValue={schedule.time}
              className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="schedule-day"
              className="block text-sm text-gray-400"
            >
              Day (weekly only)
            </label>
            <select
              id="schedule-day"
              name="day"
              defaultValue={schedule.day ?? ""}
              className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {DAYS.map((day, i) => (
                <option key={i} value={String(i)}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
