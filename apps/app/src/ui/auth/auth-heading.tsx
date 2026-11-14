export function AuthHeading({
  title,
  description,
}: {
  title: string
  description?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      {description && (
        <p className="text-sm text-balance text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
