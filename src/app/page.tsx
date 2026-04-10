import { fetchScheduleRows, SHEET_REVALIDATE_SECONDS } from "@/lib/sheet";
import type { ScheduleRow } from "@/lib/sheet";

const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE?.trim() || "회사 일정";

const defaultSheetId = "1P--wtuvsTjwTc4ry_fk7GSQmgqqXL9QSUF0ZHNBtw24";
const sheetId = process.env.GOOGLE_SHEET_ID?.trim() || defaultSheetId;
const sheetViewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

function ScheduleCard({ row, index }: { row: ScheduleRow; index: number }) {
  return (
    <article
      className="card-surface p-6 md:p-8"
      aria-labelledby={`event-${index}-title`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <span className="badge-frost text-white">{row.dateDisplay}</span>
        {row.dayOfWeek ? (
          <span className="rounded border border-card-border px-3 py-1 text-sm text-muted">
            {row.dayOfWeek}
          </span>
        ) : null}
        {row.time ? (
          <span className="font-mono text-sm tracking-tight text-shade-50">
            {row.time}
          </span>
        ) : null}
      </div>
      <h2
        id={`event-${index}-title`}
        className="font-display mt-5 text-[1.75rem] font-light leading-snug text-white md:text-[28px]"
      >
        {row.title || "제목 없음"}
      </h2>
      <dl className="mt-5 space-y-2 text-base leading-relaxed">
        {row.department ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-20 shrink-0 text-shade-50">담당</dt>
            <dd className="text-muted">{row.department}</dd>
          </div>
        ) : null}
        {row.status ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-20 shrink-0 text-shade-50">상태</dt>
            <dd className="text-muted">{row.status}</dd>
          </div>
        ) : null}
        {row.notes ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="w-20 shrink-0 text-shade-50">비고</dt>
            <dd className="text-shade-50">{row.notes}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export default async function Home() {
  const result = await fetchScheduleRows();

  return (
    <div className="page-gradient flex min-h-full flex-1 flex-col text-foreground">
      <header className="sticky top-0 z-20 border-b border-card-border/90 bg-forest/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8 lg:px-16">
          <span className="font-display text-base font-medium tracking-[0.04em] text-white">
            {siteTitle}
          </span>
          <a
            href={sheetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full border-2 border-white px-4 py-2.5 text-base text-white transition-colors duration-200 hover:bg-white hover:text-black"
          >
            스프레드시트 열기
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-12 md:px-8 md:pb-28 md:pt-16 lg:px-16 lg:pb-32 lg:pt-20">
        <section className="mb-16 md:mb-20 lg:mb-28" aria-labelledby="hero-heading">
          <p className="font-display text-[0.9375rem] uppercase tracking-[0.12em] text-muted">
            Schedule
          </p>
          <h1
            id="hero-heading"
            className="font-display mt-4 max-w-4xl text-[clamp(2.75rem,8vw,6rem)] font-light leading-[1] text-white"
          >
            {siteTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-normal leading-relaxed text-muted md:text-xl">
            공개 스프레드시트와 연동된 일정입니다. 데이터는 약{" "}
            {Math.round(SHEET_REVALIDATE_SECONDS / 60)}분마다 서버에서 다시
            가져옵니다.
          </p>
        </section>

        {!result.ok ? (
          <div
            className="card-surface border-neon-green/40 p-8 md:p-10"
            role="alert"
          >
            <h2 className="font-display text-2xl text-white">
              일정을 불러오지 못했습니다
            </h2>
            <p className="mt-4 text-lg text-muted">{result.error}</p>
            {result.hint ? (
              <p className="mt-4 text-base text-shade-50">{result.hint}</p>
            ) : null}
            <a
              href={sheetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-base text-black transition-opacity hover:opacity-90"
            >
              스프레드시트에서 직접 보기
            </a>
          </div>
        ) : result.rows.length === 0 ? (
          <p className="text-lg text-muted">
            표시할 일정이 없습니다. 스프레드시트에 데이터 행이 있는지 확인해
            주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-6 md:gap-8">
            {result.rows.map((row, index) => (
              <li key={`${row.dateDisplay}-${row.time}-${row.title}-${index}`}>
                <ScheduleCard row={row} index={index} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="border-t border-card-border bg-dark-forest py-8">
        <div className="mx-auto max-w-[1280px] px-4 text-center text-sm text-shade-50 md:px-8 lg:px-16">
          © {new Date().getFullYear()} {siteTitle}
        </div>
      </footer>
    </div>
  );
}
