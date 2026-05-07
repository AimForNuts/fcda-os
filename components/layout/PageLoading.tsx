type PageLoadingProps = {
  compact?: boolean
}

export function PageLoading({ compact = false }: PageLoadingProps) {
  return (
    <div
      className={`mx-auto w-full max-w-screen-xl px-4 ${compact ? 'py-8' : 'py-10 md:py-14'}`}
      role="status"
      aria-live="polite"
      aria-label="A carregar pagina"
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[fcda-loading-bar_1.2s_ease-in-out_infinite] rounded-full bg-fcda-gold" />
      </div>
      <div className="mt-8 animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-10 w-full max-w-xl rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-md bg-muted" />
          <div className="h-28 rounded-md bg-muted" />
          <div className="h-28 rounded-md bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-16 rounded-md bg-muted" />
          <div className="h-16 rounded-md bg-muted" />
          <div className="h-16 rounded-md bg-muted" />
        </div>
      </div>
      <span className="sr-only">A carregar conteudo...</span>
    </div>
  )
}
