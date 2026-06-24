import { RefreshCw, Sparkles, Database, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabaseEnabled } from '@/lib/supabase'
import { hueFromString, initials } from '@/lib/utils'

const agent = { namn: 'Hind Karlsson', byra: 'Notar · Stockholm' }

export function Profil() {
  return (
    <div className="pb-6">
      <PageHeader title="Profil" />

      <div className="flex items-center gap-3 px-4 py-4">
        <Avatar hue={hueFromString(agent.namn)} className="size-14 text-base">
          {initials(agent.namn)}
        </Avatar>
        <div>
          <p className="text-lg font-semibold leading-tight">{agent.namn}</p>
          <p className="text-sm text-muted-foreground">Mäklare · {agent.byra}</p>
        </div>
      </div>

      <div className="space-y-3 px-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-success" />
              <p className="font-medium">Vitec Express</p>
            </div>
            <Badge variant="success">Synk aktiv</Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Spekulanter, tidslinje och nästa steg skrivs tillbaka automatiskt.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="font-medium">Röst &amp; AI</p>
            </div>
            <Badge variant={supabaseEnabled ? 'success' : 'muted'}>
              {supabaseEnabled ? 'Live' : 'Demoläge'}
            </Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {supabaseEnabled
              ? 'Whisper transkriberar och Claude strukturerar via Supabase Edge Functions.'
              : 'Kör på lokal exempeldata. Anslut Supabase + nycklar för riktig röst & AI.'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-muted-foreground" />
            <p className="font-medium">Datakällor</p>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {[
              { namn: 'Hemnet', status: 'Kommande' },
              { namn: 'Booli', status: 'Kommande' },
              { namn: 'Mäklarbild / förening', status: 'Kommande' },
              { namn: 'KYC / källa till medel', status: 'v2' },
            ].map((d) => (
              <li
                key={d.namn}
                className="flex items-center justify-between text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <ChevronRight className="size-3.5" />
                  {d.namn}
                </span>
                <Badge variant="muted">{d.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 px-4 text-center text-xs text-muted-foreground">
        Hind · co-pilot för mäklare · demo v0.1
      </p>
    </div>
  )
}
