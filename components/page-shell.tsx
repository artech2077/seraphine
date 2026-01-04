import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

type PageShellProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  tabs?: React.ReactNode
  filters?: React.ReactNode
  children?: React.ReactNode
}

export function PageShell({
  title,
  description,
  actions,
  tabs,
  filters,
  children,
}: PageShellProps) {
  const content = children ?? (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Contenu à venir</CardTitle>
        <CardDescription>
          Cette section accueillera bientôt vos données et vos actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Ajoutez ici des tableaux, des formulaires ou des cartes selon vos
        besoins.
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        tabs={tabs}
      />
      {filters ? <div className="flex flex-col gap-3">{filters}</div> : null}
      {content}
    </div>
  )
}
