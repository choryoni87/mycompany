const DEFAULT_SHEET_ID = "1P--wtuvsTjwTc4ry_fk7GSQmgqqXL9QSUF0ZHNBtw24";

export const SHEET_REVALIDATE_SECONDS = 300;

export type ScheduleRow = {
  dateDisplay: string;
  sortKey: number;
  dayOfWeek: string;
  time: string;
  title: string;
  department: string;
  status: string;
  notes: string;
};

export type FetchScheduleResult =
  | { ok: true; rows: ScheduleRow[] }
  | {
      ok: false;
      error: string;
      hint?: string;
      httpStatus?: number;
    };

function stripQuotes(cell: string): string {
  const t = cell.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

/** Minimal RFC 4180-style CSV parser (handles quoted fields, newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  const pushRow = () => {
    row.push(cur);
    if (row.some((c) => stripQuotes(c).length > 0)) {
      rows.push(row.map(stripQuotes));
    }
    row = [];
    cur = "";
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      /* ignore CR; \r\n handled when \n follows */
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

function buildColumnMap(headers: string[]): {
  date: number;
  day: number;
  time: number;
  title: number;
  department: number;
  status: number;
  notes: number;
} {
  const find = (pred: (h: string) => boolean) =>
    headers.findIndex((h) => pred(h.trim()));

  const date = find((h) => h.includes("날짜"));
  const day = find((h) => h.includes("요일"));
  const time = find((h) => h === "시간" || h.includes("시간"));
  const title = find((h) => h.includes("일정") || h.includes("내용"));
  const department = find((h) => h.includes("담당") || h.includes("부서"));
  const status = find(
    (h) => h.includes("진행") || h.includes("상태") || h.includes("완료"),
  );
  const notes = find((h) => h.includes("비고"));

  const fallback = {
    date: 0,
    day: 1,
    time: 2,
    title: 3,
    department: 4,
    status: 5,
    notes: 6,
  };

  const pick = (idx: number, key: keyof typeof fallback) =>
    idx >= 0 ? idx : fallback[key];

  return {
    date: pick(date, "date"),
    day: pick(day, "day"),
    time: pick(time, "time"),
    title: pick(title, "title"),
    department: pick(department, "department"),
    status: pick(status, "status"),
    notes: pick(notes, "notes"),
  };
}

export function parseSheetDateForSort(raw: string): { display: string; ts: number } {
  const display = raw.replace(/\\/g, "").trim();
  const m = display.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (!m) {
    return { display, ts: 0 };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  if (Number.isNaN(date.getTime())) {
    return { display, ts: 0 };
  }
  return { display, ts: date.getTime() };
}

function cell(cells: string[], idx: number): string {
  if (idx < 0 || idx >= cells.length) return "";
  return (cells[idx] ?? "").trim();
}

export function parseScheduleCsv(text: string): ScheduleRow[] {
  const table = parseCsv(text);
  if (table.length === 0) return [];

  const map = buildColumnMap(table[0] ?? []);
  const dataRows = table.slice(1);

  const out: ScheduleRow[] = [];

  for (const cells of dataRows) {
    const dateRaw = cell(cells, map.date);
    if (!dateRaw) continue;

    const { display, ts } = parseSheetDateForSort(dateRaw);
    out.push({
      dateDisplay: display,
      sortKey: ts,
      dayOfWeek: cell(cells, map.day),
      time: cell(cells, map.time),
      title: cell(cells, map.title),
      department: cell(cells, map.department),
      status: cell(cells, map.status),
      notes: cell(cells, map.notes),
    });
  }

  out.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.time.localeCompare(b.time, "ko");
  });

  return out;
}

export function getSheetCsvUrl(): string {
  const id = process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
  const gid = process.env.GOOGLE_SHEET_GID?.trim() || "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

export async function fetchScheduleRows(): Promise<FetchScheduleResult> {
  const url = getSheetCsvUrl();

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: SHEET_REVALIDATE_SECONDS },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NextScheduleViewer/1.0) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.",
    };
  }

  if (!res.ok) {
    let hint: string | undefined;
    if (res.status === 403) {
      hint =
        "Google이 CSV 내보내기를 거부했을 수 있습니다. 스프레드시트에서「파일 → 공유 → 일반 액세스」를 확인하거나「파일 → 웹에 게시」로 게시한 뒤 다시 시도하세요.";
    }
    return {
      ok: false,
      error: `스프레드시트를 불러오지 못했습니다 (HTTP ${res.status}).`,
      hint,
      httpStatus: res.status,
    };
  }

  const text = await res.text();
  const rows = parseScheduleCsv(text);
  return { ok: true, rows };
}
