import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Catalogo from '@/pages/Catalogo'
import PaginaBanco from '@/pages/Banco'
import Libro from '@/pages/Libro'
import Accedi from '@/pages/Accedi'
import Registrati from '@/pages/Registrati'
import Profilo from '@/pages/Profilo'
import Amministrazione from '@/pages/Amministrazione'
import NonTrovata from '@/pages/NonTrovata'

// Senza, cambiando pagina si resta alla stessa altezza di scroll: si arriva
// sul catalogo gia' a meta' pagina.
function RiportaSu() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export default function App() {
  return (
    <>
      <RiportaSu />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="libro/:id" element={<Libro />} />
          <Route path="prestiti" element={<PaginaBanco />} />
          <Route path="accedi" element={<Accedi />} />
          <Route path="registrati" element={<Registrati />} />
          <Route path="profilo" element={<Profilo />} />
          <Route path="amministrazione" element={<Amministrazione />} />
          <Route path="*" element={<NonTrovata />} />
        </Route>
      </Routes>
    </>
  )
}
