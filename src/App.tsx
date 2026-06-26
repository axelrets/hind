import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MobileFrame } from '@/components/MobileFrame'
import { BottomNav } from '@/components/BottomNav'
import { Hem } from '@/screens/Hem'
import { Objekt } from '@/screens/Objekt'
import { ObjektDetalj } from '@/screens/ObjektDetalj'
import { Spekulanter } from '@/screens/Spekulanter'
import { SpekulantProfil } from '@/screens/SpekulantProfil'
import { DokumentDetalj } from '@/screens/DokumentDetalj'
import { Rum } from '@/screens/Rum'
import { SynkaVitec } from '@/screens/SynkaVitec'
import { Assistent } from '@/screens/Assistent'

function AppShell() {
  const location = useLocation()
  const fullscreen =
    location.pathname.startsWith('/debrief') ||
    location.pathname.startsWith('/synka') ||
    location.pathname.startsWith('/assistent')

  return (
    <MobileFrame>
      <div className="flex h-full min-h-0 flex-col">
        <main className="no-scrollbar flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Hem />} />
            <Route path="/objekt" element={<Objekt />} />
            <Route path="/objekt/:id" element={<ObjektDetalj />} />
            <Route path="/spekulanter" element={<Spekulanter />} />
            <Route path="/spekulanter/:id" element={<SpekulantProfil />} />
            <Route path="/dokument/:id" element={<DokumentDetalj />} />
            <Route path="/debrief" element={<Rum />} />
            <Route path="/synka" element={<SynkaVitec />} />
            <Route path="/assistent" element={<Assistent />} />
            <Route path="*" element={<Hem />} />
          </Routes>
        </main>
        {!fullscreen && <BottomNav />}
      </div>
    </MobileFrame>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
