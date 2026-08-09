import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { ScheduleEntry, DayType, GroupDayType } from '../types';
import { GROUP_DAY_TYPE_SHORT } from '../lib/groupDayTypes';

interface ScheduleGridProps {
  entries: ScheduleEntry[];
  dayType: DayType;
  onDayTypeChange: (type: DayType) => void;
  interval: number;
  onIntervalChange: (interval: number) => void;
}

const ROOMS = [1, 2];
const START_HOUR = 6;
const END_HOUR = 22;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function generateTimeSlots(interval: number): string[] {
  const slots: string[] = [];
  for (let min = START_HOUR * 60; min <= END_HOUR * 60; min += interval) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
}

function getBlockPlacement(startTime: string, endTime: string, interval: number) {
  const dayStart = START_HOUR * 60;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;

  const startCol = (startMinutes - dayStart) / interval + 1;
  const span = duration / interval;

  return { startCol, span };
}

const dayTabs: { key: DayType; label: string }[] = [
  { key: 'even', label: 'JUFT KUNLAR' },
  { key: 'odd', label: 'TOQ KUNLAR' },
  { key: 'other', label: 'BOSHQA' },
];

const dayTypeLabel: Record<GroupDayType, string> = GROUP_DAY_TYPE_SHORT;

function getSubjectLabel(groupName?: string, groupCode?: string): string {
  if (!groupName) return groupCode ?? '—';

  const dashIndex = groupName.indexOf(' — ');
  if (dashIndex >= 0) return groupName.slice(dashIndex + 3).trim();

  if (groupName.startsWith('Guruh ')) {
    const rest = groupName.slice(6).trim();
    const innerDash = rest.indexOf(' — ');
    if (innerDash >= 0) return rest.slice(innerDash + 3).trim();
    return rest;
  }

  return groupName;
}

export function ScheduleGrid({
  entries,
  dayType,
  onDayTypeChange,
  interval,
  onIntervalChange,
}: ScheduleGridProps) {
  const timeSlots = useMemo(() => generateTimeSlots(interval), [interval]);
  const columnCount = timeSlots.length - 1;
  const gridColumns = `repeat(${columnCount}, 1fr)`;

  return (
    <section className="schedule-section">
      <div className="schedule-header">
        <div className="schedule-tabs">
          {dayTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`schedule-tab ${dayType === tab.key ? 'active' : ''}`}
              onClick={() => onDayTypeChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="schedule-controls">
          <span className="control-label">Vaqt intervali</span>
          <div className="interval-select">
            <select
              value={interval}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
            >
              <option value={30}>30 daqiqa</option>
              <option value={60}>60 daqiqa</option>
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      <div className="schedule-grid-wrapper">
        <div className="schedule-grid">
          <div className="schedule-time-row">
            <div className="room-label-spacer" />
            <div
              className="time-slots"
              style={{ gridTemplateColumns: gridColumns, ['--slot-count' as string]: columnCount }}
            >
              {timeSlots.slice(0, -1).map((time) => (
                <div key={time} className="time-header">
                  {time}
                </div>
              ))}
              <div className="time-header time-header-end">{timeSlots[timeSlots.length - 1]}</div>
            </div>
          </div>

          {ROOMS.map((room) => (
            <div key={room} className="schedule-row">
              <div className="room-label">{room}-xona</div>
              <div
                className="room-track"
                style={{ gridTemplateColumns: gridColumns, ['--slot-count' as string]: columnCount }}
              >
                {entries
                  .filter((e) => e.roomNumber === room)
                  .map((entry) => {
                    const { startCol, span } = getBlockPlacement(
                      entry.startTime,
                      entry.endTime,
                      interval
                    );

                    const subject = getSubjectLabel(entry.groupName, entry.groupCode);

                    return (
                      <Link
                        key={entry.id}
                        to={`/guruh/${entry.groupId}`}
                        className="schedule-block"
                        style={{
                          gridColumn: `${startCol} / span ${span}`,
                          ['--block-color' as string]: entry.color,
                        }}
                        title={`${subject} · ${entry.groupCode} · ${entry.teacherName}`}
                      >
                        <span className="block-time">
                          {entry.startTime} – {entry.endTime}
                        </span>
                        <span className="block-subject">{subject}</span>
                        <span className="block-meta">
                          <span className="block-code">{entry.groupCode}</span>
                          <span className="block-dot" aria-hidden="true" />
                          <span className="block-teacher">{entry.teacherName}</span>
                        </span>
                        {dayType === 'other' && (
                          <span className="block-day">{dayTypeLabel[entry.dayType]}</span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
